import numpy as np
from sympy import diff, lambdify

HARD_MIN = -100.0
HARD_MAX = 100.0

def hard_clamp(val, lo=HARD_MIN, hi=HARD_MAX):
    return float(np.clip(val, lo, hi))

def get_smart_display_range(f_expr, g_expr, x):
    expr_str = str(f_expr).lower()
    needs_positive_x = "log" in expr_str or (
        "sqrt" in expr_str and not "x**2" in expr_str
    )

    xmin = hard_clamp(0.01 if needs_positive_x else HARD_MIN)
    xmax = HARD_MAX

    xs_probe = np.linspace(xmin, xmax,5000)

    try:
        fg = lambdify(x, f_expr, modules=["numpy"])
    except Exception:
        return xmin, xmax, -10.0, 10.0

    with np.errstate(all="ignore"):
        try:
            ys_probe = np.array(fg(xs_probe), dtype=float)
        except Exception:
            return xmin, xmax, -10.0, 10.0

    ys_probe = np.where(np.isfinite(ys_probe), ys_probe, np.nan)

    crits_y = []
    try:
        df = lambdify(x, diff(f_expr,x), modules=["numpy"])
        with np.errstate(all="ignore"):
            df_probe = np.array(df(xs_probe), dtype=float)
        df_probe = np.where(np.isfinite(df_probe), df_probe, np.nan)

        crit_idx = np.where(
            (np.sign(df_probe[:-1]) != np.sign(df_probe[1:])) &
            np.isfinite(df_probe[:-1]) & np.isfinite(df_probe[1:])
        )[0]
        crits_x = [float(xs_probe[i]) for i in crit_idx]
        crits_y = [float(fg(cx)) for cx in crits_x if np.isfinite(float(fg(cx)))]
    except Exception:
        pass

    key_y = list(crits_y) + [0.0]
    y_lo = min(key_y)
    y_hi = max(key_y)
    y_spread = max(y_hi - y_lo, 1.0)
    ymin = hard_clamp(float(y_lo) - y_spread * 0.3)
    ymax = hard_clamp(float(y_hi) + y_spread * 0.3)

    #fallback
    if not crits_y:
        finite_y = ys_probe[np.isfinite(ys_probe)]
        finite_y = finite_y[(finite_y >= HARD_MIN) & (finite_y <= HARD_MAX)]
        if len(finite_y) > 0:
            p2 = float(np.percentile(finite_y, 2))
            p98 = float(np.percentile(finite_y, 98))
            spread = max(abs(p98 - p2), 1.0)
            ymin = hard_clamp(p2 - spread * 0.15)
            ymax = hard_clamp(p98 + spread * 0.15)
        else:
            ymin, ymax = -10.0, 10.0

#garantuje min rozsah
    if ymax - ymin < 1.0:
        center = (ymax + ymin) / 2
        ymin = hard_clamp(center - 5.0)
        ymax = hard_clamp(center + 5.0)

    return xmin, xmax, ymin, ymax