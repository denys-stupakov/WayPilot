from sympy import Basic, sin, cos, tan, log, ln, exp, sqrt, Poly, E, S, symbols
from sympy import lambdify, degree
import numpy as np

def classify_term(term, x):
    if not isinstance(term, Basic):
        return "constant"
    try:
        if term.has(exp) or term.has(E):
            return "exponential"
        if term.has(sin, cos, tan):
            return "trigonometric"
        if term.has(log, ln):
            return "logarithmic"
        if term.has(sqrt):
            return "radical"
        poly = Poly(term, x)
        deg = poly.degree()
        if deg == 1:
            return "linear"
        elif deg == 2:
            return "quadratic"
        elif deg > 2:
            return "polynomial"
        else:
            return "constant"
    except Exception:
        return "unknown"


def _term_degree(term, x):
    try:
        return int(Poly(term, x).degree())
    except Exception:
        return -1


def split_equation(expr, x):
    #f(x) - g,h
    if not isinstance(expr, Basic):
        return expr, S.Zero

    terms = expr.as_ordered_terms()
    poly_terms = []
    trans_terms = []

    for t in terms:
        t_type = classify_term(t, x)
        if t_type in ("linear", "quadratic", "polynomial", "constant"):
            poly_terms.append(t)
        else:
            trans_terms.append(t)


    if poly_terms and trans_terms:
        g = sum(poly_terms)
        h = sum(-t for t in trans_terms)

    elif trans_terms and not poly_terms:
        pos_terms = [t for t in terms if t.as_coeff_mul()[0] >= 0]
        neg_terms = [t for t in terms if t.as_coeff_mul()[0] < 0]

        if pos_terms and neg_terms:
            g = sum(pos_terms)
            h = sum(-t for t in neg_terms)
        else:
            g = terms[0]
            h = sum(-t for t in terms[1:]) if len(terms) > 1 else S.Zero

    else:
        #polym
        degrees = [_term_degree(t, x) for t in poly_terms]
        max_deg = max(degrees) if degrees else 0

        if max_deg > 0:
            high_terms = [t for t, d in zip(poly_terms, degrees) if d == max_deg]
            low_terms = [t for t, d in zip(poly_terms, degrees) if d != max_deg]

            g = sum(high_terms)
            h = sum(-t for t in low_terms) if low_terms else S.Zero
        else:
            g = sum(poly_terms) if poly_terms else expr
            h = S.Zero

    try:
        fg = lambdify(x, g, "numpy")
        fh = lambdify(x, h, "numpy")
        ff = lambdify(x, expr, "numpy")

        xs_pos = np.linspace(0.01, 20.0, 5000)
        with np.errstate(all="ignore"):
            ys_pos = np.array(ff(xs_pos), dtype=float)
        ys_pos = np.where(np.isfinite(ys_pos), ys_pos, np.nan)
        valid = np.isfinite(ys_pos)

        zero_idx = np.where(
            (np.sign(ys_pos[:-1]) != np.sign(ys_pos[1:])) &
            valid[:-1] & valid[1:]
        )[0]

        if len(zero_idx) > 0:
            rightmost_idx = zero_idx[-1]
            x_right = float(xs_pos[rightmost_idx])

            with np.errstate(all="ignore"):
                g_right = float(fg(x_right))
                h_right = float(fh(x_right))

            #invert
            if np.isfinite(g_right) and np.isfinite(h_right):
                if g_right < -1e-6 and h_right > 1e-6:
                    g, h = -g, -h

    except Exception:
        pass
    return g, h