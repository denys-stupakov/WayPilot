import numpy as np
from sympy import lambdify

def find_intersections(g, h, x, xs):
    try:
        fg = lambdify(x, g, modules=["numpy"])
        fh = lambdify(x, h, modules=["numpy"])

        yg = fg(xs)
        yh = fh(xs)
        delta = yg - yh

        sign_change = np.where(np.sign(delta[:-1]) * np.sign(delta[1:]) < 0)[0]

        intersections = []
        for i in sign_change:
            x1, x2 = xs[i], xs[i + 1]
            y1, y2 = delta[i], delta[i + 1]

            if (y2 - y1) != 0:
                x_root = x1 - y1 * (x2 - x1) / (y2 - y1)
            else:
                x_root = (x1 + x2) / 2

            y_val = fg(x_root)
            intersections.append((float(x_root), float(y_val)))

        return intersections
    except Exception:
        return []