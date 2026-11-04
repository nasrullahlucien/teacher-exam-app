import type { Question } from '../types'

/**
 * Patterns of choice text that depend on fixed choice positions
 * (e.g. "ถูกทั้งข้อ ก และ ข", "ไม่มีข้อใดถูก", "ถูกทุกข้อ").
 * If any choice contains these, we keep the original order to preserve logic.
 */
const RELATIVE_PATTERNS = [
  /ข้อ\s*[กขคง]/,
  /ทั้ง\s*[กขคง]/,
  /ถูกทั้งข้อ/,
  /เหมือนข้อ\s*[กขคง]/,
  /ถูกทุกข้อ/,
  /ผิดทุกข้อ/,
  /ไม่มีข้อถูก/,
  /ไม่มีข้อใดถูก/
]

export function canShuffleChoices(choices?: string[]): boolean {
  if (!choices || choices.length <= 1) return false
  return !choices.some((c) => RELATIVE_PATTERNS.some((pattern) => pattern.test(c)))
}

const THAI_CHOICE_LABELS = ['ก', 'ข', 'ค', 'ง']

/**
 * Shuffles choices of a single question and recalculates the answer index,
 * dynamically updating the explanation's referenced choice letters if present.
 */
export function shuffleQuestionChoices(question: Question): Question {
  if (!canShuffleChoices(question.choices)) {
    return { ...question }
  }

  const n = question.choices.length
  const indices = Array.from({ length: n }, (_, i) => i)

  // Fisher-Yates shuffle
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = indices[i]
    indices[i] = indices[j]
    indices[j] = temp
  }

  const newChoices = indices.map((i) => question.choices[i])
  const oldAnswer = question.answer
  const newAnswer = indices.indexOf(oldAnswer)

  let explanation = question.explanation
  if (explanation && oldAnswer !== newAnswer) {
    const oldLetter = THAI_CHOICE_LABELS[oldAnswer]
    const newLetter = THAI_CHOICE_LABELS[newAnswer]
    if (oldLetter && newLetter) {
      explanation = explanation
        .replace(new RegExp(`เฉลยข้อ\\s*${oldLetter}`, 'g'), `เฉลยข้อ ${newLetter}`)
        .replace(new RegExp(`ตอบข้อ\\s*${oldLetter}`, 'g'), `ตอบข้อ ${newLetter}`)
        .replace(new RegExp(`ข้อ\\s*${oldLetter}\\.`, 'g'), `ข้อ ${newLetter}.`)
        .replace(new RegExp(`ข้อ\\s*${oldLetter}\\s*ถูก`, 'g'), `ข้อ ${newLetter} ถูก`)
    }
  }

  return {
    ...question,
    choices: newChoices,
    answer: newAnswer,
    explanation
  }
}
