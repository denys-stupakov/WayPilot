import warnings
import numpy as np
from sympy import diff, lambdify, latex as sympy_latex


def _scan_sign_changes(f, x_min=-15, x_max=15, n_points=2000):
    xs = np.linspace(x_min, x_max, n_points)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        try:
            ys = np.array(f(xs), dtype=float)
        except Exception:
            ys = np.array([_safe_eval(f, xi) for xi in xs], dtype=float)
    changes = []
    for i in range(len(xs) - 1):
        y0, y1 = ys[i], ys[i + 1]
        if np.isfinite(y0) and np.isfinite(y1) and y0 * y1 < 0:
            changes.append((float(xs[i]), float(xs[i + 1])))
    return changes


def _safe_eval(f, xi):
    try:
        return float(f(xi))
    except Exception:
        return float("nan")


def find_valid_intervals_smart(f_expr, x, intersections, num_intervals=1):
    f = lambdify(x, f_expr, "numpy")
    valid_intervals = []

    def _no_overlap(a, b):
        return not any(not (b < ex[0] or a > ex[1]) for ex in valid_intervals)

    if intersections:
        sorted_intersections = sorted(intersections, key=lambda p: p[0])
        for point in sorted_intersections[:num_intervals * 4]:
            if len(valid_intervals) >= num_intervals:
                break
            x_root = point[0]
            for window_size in [0.3, 0.5, 0.8, 1.0, 1.5, 2.0, 2.5, 3.0, 5.0]:
                a, b = x_root - window_size, x_root + window_size
                try:
                    f_a, f_b = float(f(a)), float(f(b))
                    if np.isfinite(f_a) and np.isfinite(f_b) and f_a * f_b < 0 and _no_overlap(a, b):
                        valid_intervals.append([round(a, 2), round(b, 2)])
                        break
                except Exception:
                    continue

    if len(valid_intervals) >= num_intervals:
        return valid_intervals

    sign_changes = _scan_sign_changes(f)
    for (a, b) in sign_changes:
        if len(valid_intervals) >= num_intervals:
            break
        if _no_overlap(a, b):
            valid_intervals.append([round(a, 2), round(b, 2)])

    return valid_intervals if valid_intervals else [[-2.0, 0.0]]


def validate_intervals(f_expr, x, intervals):
    try:
        f = lambdify(x, f_expr, "numpy")
        expr_str = str(f_expr).lower()

        has_log  = "log" in expr_str
        has_sqrt = "sqrt" in expr_str
        has_div  = ("1/x" in expr_str or "x**(-1)" in expr_str
                    or ("/" in expr_str and "x" in expr_str))

        results = []
        for interval in intervals:
            a, b = float(interval[0]), float(interval[1])

            # Проверка допустимости границ
            domain_error = None

            if has_log:
                if a <= 0:
                    domain_error = (
                        f"Logaritmus nie je definovaný pre x ≤ 0. "
                        f"Hodnota a = {a} nie je platná. Použite a > 0."
                    )
                elif b <= 0:
                    domain_error = (
                        f"Logaritmus nie je definovaný pre x ≤ 0. "
                        f"Hodnota b = {b} nie je platná. Použite b > 0."
                    )

            if not domain_error and has_sqrt:
                if a < 0:
                    domain_error = (
                        f"Odmocnina nie je definovaná pre x < 0. "
                        f"Hodnota a = {a} nie je platná. Použite a ≥ 0."
                    )
                elif b < 0:
                    domain_error = (
                        f"Odmocnina nie je definovaná pre x < 0. "
                        f"Hodnota b = {b} nie je platná. Použite b ≥ 0."
                    )

            if not domain_error and has_div:
                if abs(a) < 1e-10:
                    domain_error = (
                        f"Funkcia nie je definovaná v x = 0 (delenie nulou). "
                        f"Hodnota a = {a} nie je platná."
                    )
                elif abs(b) < 1e-10:
                    domain_error = (
                        f"Funkcia nie je definovaná v x = 0 (delenie nulou). "
                        f"Hodnota b = {b} nie je platná."
                    )

            if domain_error:
                results.append({
                    "interval": interval,
                    "f_a": None, "f_b": None,
                    "valid": False,
                    "domain_error": domain_error,
                })
                continue

            # Обычная проверка
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    f_a = float(f(a))
                    f_b = float(f(b))

                if not np.isfinite(f_a):
                    results.append({
                        "interval": interval, "f_a": None, "f_b": None,
                        "valid": False,
                        "domain_error": (
                            f"f(a) = f({a}) nie je definované "
                            f"(funkcia vrátila nekonečno alebo NaN). "
                            f"Skúste iný interval."
                        ),
                    })
                    continue

                if not np.isfinite(f_b):
                    results.append({
                        "interval": interval, "f_a": None, "f_b": None,
                        "valid": False,
                        "domain_error": (
                            f"f(b) = f({b}) nie je definované "
                            f"(funkcia vrátila nekonečno alebo NaN). "
                            f"Skúste iný interval."
                        ),
                    })
                    continue

                results.append({
                    "interval": interval,
                    "f_a": f_a, "f_b": f_b,
                    "valid": (f_a * f_b) < 0,
                    "domain_error": None,
                })

            except Exception as ex:
                results.append({
                    "interval": interval, "f_a": None, "f_b": None,
                    "valid": False,
                    "domain_error": f"Chyba pri výpočte: {str(ex)}",
                })

        return {"validIntervals": results, "function": str(f_expr)}

    except Exception as e:
        return {"error": f"Chyba pri overovaní intervalov: {str(e)}"}


def check_convergence_conditions(f_expr, x, intervals):
    try:
        f = lambdify(x, f_expr, "numpy")
        df_expr = diff(f_expr, x)
        df = lambdify(x, df_expr, "numpy")
        d2f_expr = diff(df_expr, x)
        d2f = lambdify(x, d2f_expr, "numpy")
        results = []

        for interval in intervals:
            a, b = interval
            x0 = (a + b) / 2
            test_points = np.linspace(a, b, 200)

            try:
                with np.errstate(all="ignore"):
                    df_arr  = np.array(df(test_points),  dtype=float)
                    d2f_arr = np.array(d2f(test_points), dtype=float)

                valid_mask = np.isfinite(df_arr) & np.isfinite(d2f_arr)
                df_values  = df_arr[valid_mask].tolist()
                d2f_values = d2f_arr[valid_mask].tolist()

            except Exception:
                df_values, d2f_values = [], []

            if not df_values or not d2f_values:
                results.append({
                    "interval": interval, "x0_test": x0,
                    "f_x0": 0, "df_x0": 0, "d2f_x0": 0,
                    "df_keeps_sign": False, "d2f_keeps_sign": False,
                    "product_positive": False, "converges": False,
                    "converges_with_warning": False,
                    "df_min": 0, "df_max": 0, "d2f_min": 0, "d2f_max": 0
                })
                continue

            df_keeps_sign  = (all(v >  1e-10 for v in df_values)
                              or all(v < -1e-10 for v in df_values))
            d2f_keeps_sign = (all(v > 0 for v in d2f_values)
                              or all(v < 0 for v in d2f_values))

            try:
                f_x0   = float(f(x0))
                df_x0  = float(df(x0))
                d2f_x0 = float(d2f(x0))
            except Exception:
                f_x0 = df_x0 = d2f_x0 = 0

            product_positive = (f_x0 * d2f_x0) > 1e-10
            converges = df_keeps_sign and d2f_keeps_sign

            results.append({
                "interval": interval, "x0_test": x0,
                "f_x0": f_x0, "df_x0": df_x0, "d2f_x0": d2f_x0,
                "df_keeps_sign": df_keeps_sign, "d2f_keeps_sign": d2f_keeps_sign,
                "product_positive": product_positive, "converges": converges,
                "converges_with_warning": converges and not product_positive,
                "df_min": min(df_values), "df_max": max(df_values),
                "d2f_min": min(d2f_values), "d2f_max": max(d2f_values)
            })

        return {
            "intervals": results,
            "function": str(f_expr),
            "first_derivative": str(df_expr),
            "second_derivative": str(d2f_expr),
            "function_latex": sympy_latex(f_expr),
            "first_derivative_latex": sympy_latex(df_expr),
            "second_derivative_latex": sympy_latex(d2f_expr),
        }
    except Exception as e:
        return {"error": f"Chyba pri overovaní konvergencie: {str(e)}"}