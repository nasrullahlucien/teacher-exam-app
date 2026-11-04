#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Format math and LaTeX expressions in question JSON files into clean Unicode typography.
"""

import os
import json
import re

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
QUESTIONS_DIR = os.path.join(BASE_DIR, "public", "data", "questions")

SUPER_MAP = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ', 'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ'
}

SUB_MAP = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', 'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ',
    'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ',
    'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ',
    't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ', 'y': 'ᵧ'
}

def match_braces(s, start_idx):
    depth = 0
    for i in range(start_idx, len(s)):
        if s[i] == '{':
            depth += 1
        elif s[i] == '}':
            depth -= 1
            if depth == 0:
                return i
    return -1

def format_math_string(raw):
    if not raw or not isinstance(raw, str):
        return raw

    text = raw
    text = text.replace('&rarr;', '→')
    text = text.replace('&times;', '×')
    text = text.replace('&plusmn;', '±')
    text = text.replace('&deg;', '°')
    text = text.replace('&alpha;', 'α')
    text = text.replace('&beta;', 'β')

    def replace_math_block(match):
        s = match.group(1).strip()

        # Unescape percent
        s = s.replace(r'\%', '%')

        # Degrees
        s = re.sub(r'\^\{\\circ\}\s*C', ' °C', s)
        s = re.sub(r'\^\{\\circ\}', '°', s)
        s = re.sub(r'\\circ\s*C', ' °C', s)
        s = re.sub(r'\\circ', '°', s)

        # Fractions \frac{num}{den}
        idx = s.find(r'\frac')
        while idx != -1:
            o1 = s.find('{', idx)
            if o1 == -1:
                break
            c1 = match_braces(s, o1)
            if c1 == -1:
                break
            o2 = s.find('{', c1)
            if o2 != c1 + 1:
                break
            c2 = match_braces(s, o2)
            if c2 == -1:
                break

            num = s[o1 + 1:c1].strip()
            den = s[o2 + 1:c2].strip()

            rep = f"({num} / {den})"
            if num == "1" and den == "2":
                rep = "½"
            elif num == "1" and den == "4":
                rep = "¼"
            elif num == "3" and den == "4":
                rep = "¾"
            elif num == "1" and den == "3":
                rep = "⅓"
            elif num == "2" and den == "3":
                rep = "⅔"

            s = s[:idx] + rep + s[c2 + 1:]
            idx = s.find(r'\frac')

        # Square root \sqrt{expr}
        s_idx = s.find(r'\sqrt')
        while s_idx != -1:
            open_b = s.find('{', s_idx)
            if open_b != -1:
                close_b = match_braces(s, open_b)
                if close_b != -1:
                    inner = s[open_b + 1:close_b].strip()
                    s = s[:s_idx] + f"√({inner})" + s[close_b + 1:]
            s_idx = s.find(r'\sqrt')

        # Symbols
        s = re.sub(r'\\text\{([^}]+)\}', r'\1', s)
        s = re.sub(r'\\vec\{([^}]+)\}', r'\1⃗', s)
        s = s.replace(r'\times', ' × ')
        s = s.replace(r'\cdot', ' · ')
        s = s.replace(r'\div', ' ÷ ')
        s = s.replace(r'\pm', ' ± ')
        s = s.replace(r'\approx', ' ≈ ')
        s = s.replace(r'\propto', ' ∝ ')
        s = s.replace(r'\Rightarrow', ' ⇒ ')
        s = s.replace(r'\rightarrow', ' → ')
        s = re.sub(r'\\xrightarrow\{[^}]*\}', ' → ', s)
        s = s.replace(r'\theta', 'θ')
        s = s.replace(r'\pi', 'π')
        s = s.replace(r'\mu', 'µ')
        s = s.replace(r'\rho', 'ρ')
        s = s.replace(r'\omega', 'ω')
        s = s.replace(r'\Delta', 'Δ')
        s = s.replace(r'\Sigma', 'Σ')
        s = s.replace(r'\Omega', 'Ω')
        s = s.replace(r'\lambda', 'λ')
        s = s.replace(r'\infty', '∞')
        s = s.replace(r'\tan', 'tan')
        s = s.replace(r'\sin', 'sin')
        s = s.replace(r'\cos', 'cos')
        s = s.replace(r'\max', 'max')
        s = s.replace('~', ' ')

        # Superscripts
        def repl_sup(m):
            exp = m.group(1).strip()
            if all(c in SUPER_MAP for c in exp):
                return ''.join(SUPER_MAP[c] for c in exp)
            return f"^({exp})"
        s = re.sub(r'\^\{([^}]+)\}', repl_sup, s)
        s = re.sub(r'\^([0-9nxy+-])', lambda m: SUPER_MAP.get(m.group(1), f"^{m.group(1)}"), s)

        # Subscripts
        def repl_sub(m):
            sub = m.group(1).strip()
            if all(c in SUB_MAP for c in sub):
                return ''.join(SUB_MAP[c] for c in sub)
            return f"_{sub}"
        s = re.sub(r'_\{([^}]+)\}', repl_sub, s)
        s = re.sub(r'_([0-9kstaexnpifcrouvjhlym+-])', lambda m: SUB_MAP.get(m.group(1), f"_{m.group(1)}"), s)

        s = re.sub(r'\s+', ' ', s).strip()
        return s

    text = re.sub(r'\$([^$]+)\$', replace_math_block, text)

    # Stray commands outside $...$
    text = text.replace(r'\times', ' × ')
    text = text.replace(r'\rightarrow', ' → ')
    text = text.replace(r'\Rightarrow', ' ⇒ ')
    text = re.sub(r'\^\{\\circ\}\s*C', ' °C', text)
    text = re.sub(r'\^\{\\circ\}', '°', text)
    text = re.sub(r'\\circ\s*C', ' °C', text)
    text = text.replace(r'\circ', '°')
    text = text.replace(r'\%', '%')
    text = re.sub(r' {2,}', ' ', text)

    return text

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        questions = json.load(f)

    modified = False
    for q in questions:
        old_q = q.get('question', '')
        new_q = format_math_string(old_q)
        if new_q != old_q:
            q['question'] = new_q
            modified = True

        choices = q.get('choices', [])
        new_choices = []
        for c in choices:
            nc = format_math_string(c)
            if nc != c:
                modified = True
            new_choices.append(nc)
        q['choices'] = new_choices

        old_exp = q.get('explanation', '')
        new_exp = format_math_string(old_exp)
        if new_exp != old_exp:
            q['explanation'] = new_exp
            modified = True

    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(questions, f, ensure_ascii=False, indent=2)
        print(f"✅ Formatted: {os.path.basename(filepath)}")

def main():
    print("Formatting math in question files...")
    for root, dirs, files in os.walk(QUESTIONS_DIR):
        for f in files:
            if f.endswith('.json') and f != 'manifest.json' and not f.startswith('.'):
                process_file(os.path.join(root, f))
    print("Done!")

if __name__ == '__main__':
    main()
