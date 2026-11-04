/**
 * Math and LaTeX text formatter for Science & Mathematics Exam Questions
 * Converts raw LaTeX math expressions ($...$), commands, fractions, degrees,
 * and scientific notation into clean, beautiful, readable Unicode typography.
 */

function matchBraces(str: string, startIndex: number): number {
  let depth = 0
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '{') depth++
    else if (str[i] === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

const SUPER_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  n: 'ⁿ',
  x: 'ˣ',
  y: 'ʸ',
  a: 'ᵃ',
  b: 'ᵇ',
  c: 'ᶜ'
}

const SUB_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  a: 'ₐ',
  e: 'ₑ',
  h: 'ₕ',
  i: 'ᵢ',
  j: 'ⱼ',
  k: 'ₖ',
  l: 'ₗ',
  m: 'ₘ',
  n: 'ₙ',
  o: 'ₒ',
  p: 'ₚ',
  r: 'ᵣ',
  s: 'ₛ',
  t: 'ₜ',
  u: 'ᵤ',
  v: 'ᵥ',
  x: 'ₓ',
  y: 'ᵧ'
}

export function formatMathText(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return ''

  // 1. Global HTML entities & standard symbols
  let text = raw
    .replace(/&rarr;/g, '→')
    .replace(/&times;/g, '×')
    .replace(/&plusmn;/g, '±')
    .replace(/&deg;/g, '°')
    .replace(/&alpha;/g, 'α')
    .replace(/&beta;/g, 'β')

  // 2. Process math enclosed in $...$
  text = text.replace(/\$([^$]+)\$/g, (_, math) => {
    let s = math.trim()

    // Unescape percent
    s = s.replace(/\\%/g, '%')

    // Degree Celsius / Degree angle
    s = s.replace(/\^\{\\circ\}\s*C/g, ' °C')
    s = s.replace(/\^\{\\circ\}/g, '°')
    s = s.replace(/\\circ\s*C/g, ' °C')
    s = s.replace(/\\circ/g, '°')

    // Fractions \frac{num}{den}
    let idx = s.indexOf('\\frac')
    while (idx !== -1) {
      const o1 = s.indexOf('{', idx)
      if (o1 === -1) break
      const c1 = matchBraces(s, o1)
      if (c1 === -1) break
      const o2 = s.indexOf('{', c1)
      if (o2 !== c1 + 1) break
      const c2 = matchBraces(s, o2)
      if (c2 === -1) break

      const num = s.slice(o1 + 1, c1).trim()
      const den = s.slice(o2 + 1, c2).trim()

      let rep = `(${num} / ${den})`
      if (num === '1' && den === '2') rep = '½'
      else if (num === '1' && den === '4') rep = '¼'
      else if (num === '3' && den === '4') rep = '¾'
      else if (num === '1' && den === '3') rep = '⅓'
      else if (num === '2' && den === '3') rep = '⅔'

      s = s.slice(0, idx) + rep + s.slice(c2 + 1)
      idx = s.indexOf('\\frac')
    }

    // Square root \sqrt{expr}
    let sIdx = s.indexOf('\\sqrt')
    while (sIdx !== -1) {
      const open = s.indexOf('{', sIdx)
      if (open !== -1) {
        const close = matchBraces(s, open)
        if (close !== -1) {
          const inner = s.slice(open + 1, close).trim()
          s = s.slice(0, sIdx) + `√(${inner})` + s.slice(close + 1)
        }
      }
      sIdx = s.indexOf('\\sqrt')
    }

    // LaTeX commands & math operators
    s = s.replace(/\\text\{([^}]+)\}/g, '$1')
    s = s.replace(/\\vec\{([^}]+)\}/g, '$1⃗')
    s = s.replace(/\\times/g, ' × ')
    s = s.replace(/\\cdot/g, ' · ')
    s = s.replace(/\\div/g, ' ÷ ')
    s = s.replace(/\\pm/g, ' ± ')
    s = s.replace(/\\approx/g, ' ≈ ')
    s = s.replace(/\\propto/g, ' ∝ ')
    s = s.replace(/\\Rightarrow/g, ' ⇒ ')
    s = s.replace(/\\rightarrow/g, ' → ')
    s = s.replace(/\\xrightarrow\{([^}]*)\}/g, ' → ')
    s = s.replace(/\\theta/g, 'θ')
    s = s.replace(/\\pi/g, 'π')
    s = s.replace(/\\mu/g, 'µ')
    s = s.replace(/\\rho/g, 'ρ')
    s = s.replace(/\\omega/g, 'ω')
    s = s.replace(/\\Delta/g, 'Δ')
    s = s.replace(/\\Sigma/g, 'Σ')
    s = s.replace(/\\Omega/g, 'Ω')
    s = s.replace(/\\lambda/g, 'λ')
    s = s.replace(/\\infty/g, '∞')
    s = s.replace(/\\tan/g, 'tan')
    s = s.replace(/\\sin/g, 'sin')
    s = s.replace(/\\cos/g, 'cos')
    s = s.replace(/\\max/g, 'max')
    s = s.replace(/~/g, ' ')

    // Superscripts: ^{...} or ^x
    s = s.replace(/\^{([^}]+)}/g, (_: string, exp: string) => {
      const chars = exp.trim().split('')
      if (chars.every((c: string) => SUPER_MAP[c])) {
        return chars.map((c: string) => SUPER_MAP[c]).join('')
      }
      return `^(${exp})`
    })
    s = s.replace(/\^([0-9nxy+-])/g, (_: string, c: string) => SUPER_MAP[c] || `^${c}`)

    // Subscripts: _{...} or _x
    s = s.replace(/_\{([^}]+)\}/g, (_: string, sub: string) => {
      const chars = sub.trim().split('')
      if (chars.every((c: string) => SUB_MAP[c])) {
        return chars.map((c: string) => SUB_MAP[c]).join('')
      }
      return `_${sub}`
    })
    s = s.replace(/_([0-9kstaexnpifcrouvjhlym+-])/g, (_: string, c: string) => SUB_MAP[c] || `_${c}`)

    // Whitespace cleanup
    s = s.replace(/\s+/g, ' ').trim()
    return s
  })

  // 3. Catch any stray backslash commands or notations outside $...$
  text = text
    .replace(/\\times/g, ' × ')
    .replace(/\\rightarrow/g, ' → ')
    .replace(/\\Rightarrow/g, ' ⇒ ')
    .replace(/\^\{\\circ\}\s*C/g, ' °C')
    .replace(/\^\{\\circ\}/g, '°')
    .replace(/\\circ\s*C/g, ' °C')
    .replace(/\\circ/g, '°')
    .replace(/\\%/g, '%')

  // Clean double spaces
  text = text.replace(/ {2,}/g, ' ')

  return text
}
