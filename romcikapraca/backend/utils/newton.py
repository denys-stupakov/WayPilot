import numpy as np
from sympy import diff, lambdify


def _compute_estimates(df, d2f, xn, xn_next, fx, n_points=100):
    try:
        probe = np.linspace(min(xn, xn_next) - 0.5, max(xn, xn_next) + 0.5, n_points)
        with np.errstate(all="ignore"):
            df_probe = np.abs(np.array(df(probe),  dtype=float))
            d2f_probe = np.abs(np.array(d2f(probe), dtype=float))

        df_vals = df_probe[np.isfinite(df_probe)]
        d2f_vals = d2f_probe[np.isfinite(d2f_probe)]
        m1 = float(np.min(df_vals))  if len(df_vals)  > 0 else None
        m2 = float(np.max(d2f_vals)) if len(d2f_vals) > 0 else None

        odhad = (1 / m1) * abs(fx) if (m1 and m1 > 1e-12) else None
        return m1, m2, odhad
    except Exception:
        return None, None, None

def newton_method_epsilon(f_expr, x, x0=1.0, epsilon=1e-6, max_iter=100, interval=None):
    try:
        f  = lambdify(x, f_expr,"numpy")
        df = lambdify(x, diff(f_expr,x),"numpy")
        d2f = lambdify(x, diff(diff(f_expr,x),x),"numpy")
    except Exception as e:
        return {"error": f"Nedá sa derivovať funkcia: {str(e)}"}

    steps = []
    xn = float(x0)

    for i in range(max_iter):
        try:
            fx = float(f(xn))
            dfx = float(df(xn))
            try:
                epsilon_product = float(f(xn - epsilon)) * float(f(xn + epsilon))
            except Exception:
                epsilon_product = None
        except Exception as e:
            return {"error": f"Chyba pri výpočte v bode x={xn:.4f}: {str(e)}"}

        if abs(dfx)< 1e-10:
            return {"error": f"Derivácia je príliš malá v bode x={xn:.4f}. Zvoľte iný počiatočný bod."}

        xn_next = xn - fx / dfx
        m1, m2, odhad = _compute_estimates(df, d2f, xn, xn_next, fx)

        steps.append({
            "iter": i, "xn": float(xn), "fx": float(fx), "dfx": float(dfx),
            "xn_next": float(xn_next),
            "epsilon_product": float(epsilon_product) if epsilon_product is not None else None,
            "m1": float(m1) if m1 is not None else None,
            "m2": float(m2) if m2 is not None else None,
            "odhad_chyby": float(odhad) if odhad is not None else None
        })

        try:
            if (float(f(xn - epsilon)) * float(f(xn + epsilon))) < 0:
                xn = xn_next
                break
        except Exception:
            if abs(xn_next - xn) < epsilon:
                xn = xn_next
                break

        xn = xn_next

    if interval is not None and not (interval[0] <= xn <= interval[1]):
        return {"error": f"Koreň {xn:.4f} sa nenachádza v intervale <{interval[0]}; {interval[1]}>."}

    try:
        if abs(float(f(xn))) > 1e-3:
            return {"error": f"Metóda nezkonvergovala k správnemu koreňu. f(x) = {abs(float(f(xn))):.6f}."}
    except Exception:
        pass

    _finalize_error_estimate(steps, df, d2f, xn)

    return {
        "root": float(xn), "iterations": len(steps), "steps": steps,
        "converged": True, "mode": "epsilon", "epsilon_used": epsilon
    }


def newton_method_iterations(f_expr, x, x0=1.0, n_iterations=10, interval=None):
    try:
        f   = lambdify(x, f_expr, "numpy")
        df  = lambdify(x, diff(f_expr, x), "numpy")
        d2f = lambdify(x, diff(diff(f_expr, x), x), "numpy")
    except Exception as e:
        return {"error": f"Nedá sa derivovať funkcia: {str(e)}"}

    steps = []
    xn = float(x0)

    for i in range(n_iterations):
        try:
            fx  = float(f(xn))
            dfx = float(df(xn))
            try:
                epsilon_product = float(f(xn - 0.001)) * float(f(xn + 0.001))
            except Exception:
                epsilon_product = None
        except Exception as e:
            return {"error": f"Chyba pri výpočte v bode x={xn:.4f}: {str(e)}"}

        if abs(dfx) < 1e-10:
            return {"error": f"Derivácia je príliš malá v bode x={xn:.4f}. Zvoľte iný počiatočný bod."}

        xn_next = xn - fx / dfx
        m1, m2, odhad = _compute_estimates(df, d2f, xn, xn_next, fx)

        steps.append({
            "iter": i, "xn": float(xn), "fx": float(fx), "dfx": float(dfx),
            "xn_next": float(xn_next),
            "epsilon_product": float(epsilon_product) if epsilon_product is not None else None,
            "m1": float(m1) if m1 is not None else None,
            "m2": float(m2) if m2 is not None else None,
            "odhad_chyby": float(odhad) if odhad is not None else None
        })
        xn = xn_next

    if interval is not None and not (interval[0] <= xn <= interval[1]):
        return {"error": f"Koreň {xn:.4f} sa nenachádza v intervale <{interval[0]}; {interval[1]}>."}

    try:
        final_fx = abs(float(f(xn)))
    except Exception:
        final_fx = None

    _finalize_error_estimate(steps, df, d2f, xn)

    return {
        "root": float(xn), "iterations": n_iterations, "steps": steps,
        "converged": True, "mode": "iterations",
        "n_iterations_used": n_iterations, "final_fx": final_fx
    }


def _finalize_error_estimate(steps, df, d2f, xn):
    if not steps:
        return

    # Find last step with a meaningful f(xn) — after convergence fx≈0 is useless
    src = steps[-1]
    for s in reversed(steps):
        if abs(s.get("fx", 0)) > 1e-10:
            src = s
            break

    x_lo = min(src["xn"], xn)
    x_hi = max(src["xn"], xn)
    try:
        probe = np.linspace(x_lo - 0.5, x_hi + 0.5, 200)
        with np.errstate(all="ignore"):
            df_arr  = np.abs(np.array(df(probe),  dtype=float))
            d2f_arr = np.abs(np.array(d2f(probe), dtype=float))
        df_vals  = df_arr[np.isfinite(df_arr)]
        d2f_vals = d2f_arr[np.isfinite(d2f_arr)]
        m1f = float(np.min(df_vals))  if len(df_vals)  > 0 else None
        m2f = float(np.max(d2f_vals)) if len(d2f_vals) > 0 else None
        if m1f and m1f > 1e-12 and m2f is not None:
            fx_used = abs(src["fx"])
            steps[-1]["odhad_chyby"]      = float((1 / m1f) * fx_used)
            steps[-1]["m1"]               = float(m1f)
            steps[-1]["m2"]               = float(m2f)
            steps[-1]["fx_for_estimate"]  = float(fx_used)
            steps[-1]["iter_for_estimate"] = int(src["iter"] + 1)
    except Exception:
        pass
