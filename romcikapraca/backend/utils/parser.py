from sympy.parsing.sympy_parser import (
    parse_expr, standard_transformations, implicit_multiplication_application
)
import re
import numpy as np
from sympy import log, sin, cos, tan, sqrt, exp, Abs, ln, E

TRANSFORMS = standard_transformations + (implicit_multiplication_application,)

ALLOWED = {
    "log": log, "ln": ln, "sin": sin,
    "cos": cos, "tan": tan, "sqrt": sqrt, "exp": exp,
    "e": E, "E": E, "Abs": Abs, "abs": Abs
}

def _replace_abs_latex(s: str) -> str:
    #2latex
    s = re.sub(r"\\left\|([^|]+)\\right\|", r"Abs(\1)", s)
    s = re.sub(r"\\lvert\s*([^|]+)\s*\\rvert", r"Abs(\1)", s)
    s = re.sub(r"\\\|([^|]+)\\\|", r"Abs(\1)", s)
    s = re.sub(r"\|([^|]+)\|", r"Abs(\1)", s)
    return s

def parse_any(expr_text: str):
    s = expr_text.strip()

    s = re.sub(r"\${1,2}", "", s)
    s = s.replace("\\displaystyle", "")
    s = s.replace(" ", "")

    s = re.sub(r"\^+\{\}", "", s)  #- ^{}


    s = re.sub(r"\^\{([^}]+)\}", r"**(\1)", s)

    s = s.replace("^", "**")

    s = re.sub(r"^\*\*+", "", s)
    s = re.sub(r"([+\-*/=(])\*\*+(?=[+\-*/=()])", r"\1", s)

    s = re.sub(r"\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}", r"(\1)/(\2)", s)
    s = re.sub(r"\\frac([0-9]+)\s*([0-9]+)", r"(\1)/(\2)", s)


    s = re.sub(r"\\sin\s*\(?\s*([a-zA-Z0-9_]+)\)?", r"sin(\1)", s)
    s = re.sub(r"\\cos\s*\(?\s*([a-zA-Z0-9_]+)\)?", r"cos(\1)", s)
    s = re.sub(r"\\tan\s*\(?\s*([a-zA-Z0-9_]+)\)?", r"tan(\1)", s)
    s = re.sub(r"\\log\s*\(?\s*([a-zA-Z0-9_]+)\)?", r"log(\1)", s)
    s = re.sub(r"\\ln\s*\(?\s*([a-zA-Z0-9_]+)\)?", r"ln(\1)", s)
    s = re.sub(r"\\sqrt\s*\{([^}]+)\}", r"sqrt(\1)", s)
    s = re.sub(r"\\sqrt\s*\(?\s*([a-zA-Z0-9_]+)\)?", r"sqrt(\1)", s)


    s = re.sub(r"e\s*\*\*\s*\(([^)]+)\)", r"exp(\1)", s)
    s = re.sub(r"e\s*\*\*\s*([a-zA-Z0-9_]+)", r"exp(\1)", s)
    s = re.sub(r"\\e\s*\*\*\s*\(([^)]+)\)", r"exp(\1)", s)


    s = _replace_abs_latex(s)

    s = re.sub(r"\bln\s*\(", r"ln(", s)
    s = re.sub(r"\bln\s+", r"ln(", s)  #ln x - lnx

    s = s.replace("\\", "")

    # Финальная очистка
    s = re.sub(r"\*\*\+", r"+", s)  # **+ - +
    s = re.sub(r"\*\*/", r"/", s)  # **/ - /
    s = re.sub(r"\*\*\*+", r"**", s)  # *** - **

    #NONE
    if not s or s == "**":
        s = "0"

    try:
        return parse_expr(s, transformations=TRANSFORMS, local_dict=ALLOWED)
    except Exception as e:
        raise Exception(f"Nemožno parsovať výraz '{expr_text}': {str(e)}")