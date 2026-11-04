import React from 'react'
import { formatMathText } from '../utils/formatMath'

interface MathTextProps {
  text: string | undefined | null
  className?: string
}

export const MathText: React.FC<MathTextProps> = ({ text, className }) => {
  if (!text) return null
  return <span className={className}>{formatMathText(text)}</span>
}
