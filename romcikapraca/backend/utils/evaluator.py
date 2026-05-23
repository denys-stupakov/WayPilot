import warnings
import numpy as np
from sympy import lambdify


def safe_eval(expr, x, xs):
    try:
        f = lambdify(x, expr, modules=["numpy"])

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")  #none RuntimeWarning **logx<0**
            ys = f(xs)

        if np.isscalar(ys):
            ys = np.full_like(xs, float(ys), dtype=float)

        ys = np.array(ys, dtype=complex)

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            ys = np.real_if_close(ys, tol=1e-6)

        if np.iscomplexobj(ys):
            #body mimo DO
            imag_mask = np.abs(ys.imag) > 1e-6
            ys = ys.real.astype(float)
            ys[imag_mask] = np.nan
        else:
            ys = ys.real.astype(float)

        #inf -> NaN
        ys[~np.isfinite(ys)] = np.nan

        return xs, ys

    except Exception:
        return xs, np.full_like(xs, np.nan, dtype=float)