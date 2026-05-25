import numpy as np
from flask import Blueprint, request, jsonify
from sympy import symbols

from utils.parser import parse_any
from utils.evaluator import safe_eval
from utils.splitter import split_equation
from utils.solver import find_intersections
from utils.plot_range import get_smart_display_range, HARD_MIN, HARD_MAX
from utils.intervals import (
    find_valid_intervals_smart,
    validate_intervals,
    check_convergence_conditions,
)
from utils.newton import newton_method_epsilon, newton_method_iterations

plot_blueprint = Blueprint("plot", __name__)

def _parse_expr(expr_text: str):
    expr_text = expr_text.strip()
    if "=" not in expr_text:
        expr_text += "=0"
    left_txt, right_txt = expr_text.split("=", 1)
    return parse_any(left_txt) - parse_any(right_txt)


def _clamp_y_array(arr):
    return [
        v if (v is not None and np.isfinite(v) and HARD_MIN <= v <= HARD_MAX) else None
        for v in arr
    ]

#routes
@plot_blueprint.route("/suggest_intervals", methods=["POST"])
def suggest_intervals_route():
    try:
        data = request.json
        expr_text = data.get("expr", "")
        intersections = data.get("intersections", [])
        num_intervals = data.get("num_intervals", 1)

        if not expr_text:
            return jsonify({"error": "Funkcia nebola zadaná"}), 400

        x = symbols("x")
        f_expr = _parse_expr(expr_text)
        suggested = find_valid_intervals_smart(f_expr, x, intersections, num_intervals)
        return jsonify({"suggested_intervals": suggested, "function": str(f_expr)})
    except Exception as e:
        return jsonify({"error": f"Chyba servera: {str(e)}"}), 500


@plot_blueprint.route("/validate_intervals", methods=["POST"])
def validate_intervals_route():
    try:
        data = request.json
        expr_text = data.get("expr", "")
        intervals = data.get("intervals", [])

        if not expr_text:
            return jsonify({"error": "Funkcia nebola zadaná"}), 400
        if not intervals:
            return jsonify({"error": "Žiadne intervaly neboli zadané"}), 400

        x = symbols("x")
        f_expr = _parse_expr(expr_text)
        result = validate_intervals(f_expr, x, intervals)

        if "error" in result:
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Chyba servera: {str(e)}"}), 500


@plot_blueprint.route("/check_convergence", methods=["POST"])
def check_convergence_route():
    try:
        data = request.json
        expr_text = data.get("expr", "")
        intervals = data.get("intervals", [])

        x = symbols("x")
        f_expr = _parse_expr(expr_text)
        result = check_convergence_conditions(f_expr, x, intervals)

        if "error" in result:
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@plot_blueprint.route("/plot", methods=["POST"])
def plot():
    try:
        data = request.json
        expr_text = data.get("expr", "")
        step = data.get("step", "split")
        x = symbols("x")

        expr_text = expr_text.strip()
        if "=" not in expr_text:
            expr_text += "=0"
        left_txt, right_txt = expr_text.split("=", 1)

        try:
            left = parse_any(left_txt)
        except Exception as e:
            return jsonify({"error": f"Chyba pri parsovaní ľavej strany: {str(e)}"}), 400
        try:
            right = parse_any(right_txt)
        except Exception as e:
            return jsonify({"error": f"Chyba pri parsovaní pravej strany: {str(e)}"}), 400

        f_expr = left - right

        try:
            g, h = split_equation(f_expr, x)
        except Exception as e:
            return jsonify({"error": f"Chyba pri rozdeľovaní funkcie: {str(e)}"}), 400

        xmin, xmax, ymin_hint, ymax_hint = get_smart_display_range(f_expr, g, x)

        xs = np.linspace(xmin, xmax, 15000)
        xs = xs[np.isfinite(xs)]

        try:
            x1, y1 = safe_eval(g, x, xs)
        except Exception as e:
            return jsonify({"error": f"Chyba pri vyhodnotení g(x): {str(e)}"}), 400
        try:
            x2, y2 = safe_eval(h, x, xs)
        except Exception as e:
            return jsonify({"error": f"Chyba pri vyhodnotení h(x): {str(e)}"}), 400

        try:
            intersections = find_intersections(g, h, x, xs)
        except Exception:
            intersections = []

        from sympy import latex as sympy_latex
        response = {
            "x1": x1.tolist(), "y1": _clamp_y_array(y1.tolist()),
            "x2": x2.tolist(), "y2": _clamp_y_array(y2.tolist()),
            "intersections": intersections,
            "expr": str(f_expr), "g_expr": str(g), "h_expr": str(h),
            "g_latex": sympy_latex(g), "h_latex": sympy_latex(h),
            "display_range": {
                "xmin": xmin, "xmax": xmax,
                "ymin": ymin_hint, "ymax": ymax_hint
            }
        }

        if step == "newton":
            x0_val = data.get("x0", 1.0)
            intervals = data.get("intervals", [])
            mode = data.get("mode", "epsilon")
            interval = intervals[0] if intervals else None

            if "log" in str(f_expr).lower():
                if x0_val <= 0:
                    return jsonify({"error": "Pre funkciu s ln(x) musí byť počiatočný bod x₀ > 0."}), 400
                if interval and interval[0] <= 0:
                    return jsonify({"error": "Pre funkciu s ln(x) musí byť interval celý v oblasti x > 0."}), 400

            if mode == "epsilon":
                newton_result = newton_method_epsilon(
                    f_expr, x, x0=x0_val,
                    epsilon=data.get("epsilon", 1e-6), interval=interval)
            elif mode == "iterations":
                newton_result = newton_method_iterations(
                    f_expr, x, x0=x0_val,
                    n_iterations=data.get("max_iterations", 10), interval=interval)
            else:
                return jsonify({"error": f"Neznámy režim: {mode}."}), 400

            if "error" in newton_result:
                return jsonify(newton_result), 400

            response["newton"] = newton_result

            #g,h na povodnu funkc 3 krok
            if data.get("single_mode", False):
                xs_single = np.linspace(xmin, xmax, 15000)  # ← убери custom_xmin логику, просто 15000
                xs_single = xs_single[np.isfinite(xs_single)]
                x1s, y1s = safe_eval(f_expr, x, xs_single)
                response.update({
                    "x1": x1s.tolist(), "y1": _clamp_y_array(y1s.tolist()),
                    "x2": x1s.tolist(), "y2": [0.0] * len(x1s),
                    "label": "f(x)", "single_mode": True,
                    "g_expr": str(f_expr), "h_expr": "0",
                    "g_latex": sympy_latex(f_expr), "h_latex": "0",
                })

        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@plot_blueprint.route("/plot_single", methods=["POST"])
def plot_single():
    try:
        data = request.json
        expr_text = data.get("expr", "")
        label = data.get("label", "f(x)")
        # Получаем диапазон от фронтенда если передан
        custom_xmin = data.get("xmin", None)
        custom_xmax = data.get("xmax", None)
        x = symbols("x")

        f_expr = _parse_expr(expr_text)

        xmin, xmax, ymin_hint, ymax_hint = get_smart_display_range(f_expr, f_expr, x)

        # Если фронтенд передал узкий диапазон — используем его с отступом
        if custom_xmin is not None and custom_xmax is not None:
            span = custom_xmax - custom_xmin
            pad = max(span * 0.5, 0.5)
            xmin = custom_xmin - pad
            xmax = custom_xmax + pad

        xs = np.linspace(xmin, xmax, 15000)
        xs = xs[np.isfinite(xs)]

        try:
            x1, y1 = safe_eval(f_expr, x, xs)
        except Exception as e:
            return jsonify({"error": f"Chyba pri vyhodnotení: {str(e)}"}), 400

        return jsonify({
            "x1": x1.tolist(), "y1": _clamp_y_array(y1.tolist()),
            "x2": x1.tolist(), "y2": [0.0] * len(x1),
            "intersections": [],
            "expr": str(f_expr),
            "g_expr": str(f_expr),
            "h_expr": "0",
            "label": label,
            "single_mode": True,
            "display_range": {
                "xmin": xmin, "xmax": xmax,
                "ymin": ymin_hint, "ymax": ymax_hint
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500