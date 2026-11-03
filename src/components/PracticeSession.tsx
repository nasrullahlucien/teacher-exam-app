import React, { useState } from 'react'
import { ArrowLeft, CheckCircle2, XCircle, ArrowRight, RotateCcw, AlertTriangle, Sparkles, Check } from 'lucide-react'
import type { Question } from '../types'
import { recordAnswer, saveExamHistory } from '../db'

interface PracticeSessionProps {
  title: string
  questions: Question[]
  onFinish: () => void
  isMistakeMode?: boolean
}

export const PracticeSession: React.FC<PracticeSessionProps> = ({
  title,
  questions,
  onFinish,
  isMistakeMode = false
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [answerFeedback, setAnswerFeedback] = useState<Record<number, { removedFromMistakes: boolean; currentConsecutive: number }>>({})
  const [startTime] = useState<number>(Date.now())
  const [isCompleted, setIsCompleted] = useState(false)
  const [timeSpent, setTimeSpent] = useState(0)

  const currentQ = questions[currentIndex]
  const currentSelected = selectedAnswers[currentIndex]
  const isAnswered = currentSelected !== undefined

  // Choice letters for Thai exam (ก, ข, ค, ง)
  const choiceLabels = ['ก', 'ข', 'ค', 'ง']

  const handleSelectChoice = async (index: number) => {
    if (isAnswered) return // already answered

    const isCorrect = index === currentQ.answer
    const updatedAnswers = { ...selectedAnswers, [currentIndex]: index }
    setSelectedAnswers(updatedAnswers)

    const feedback = await recordAnswer(currentQ, isCorrect)
    setAnswerFeedback(prev => ({ ...prev, [currentIndex]: feedback }))
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      finishQuiz()
    }
  }

  const finishQuiz = async () => {
    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000)
    setTimeSpent(elapsedSeconds)

    // Calculate score
    let score = 0
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answer) {
        score += 1
      }
    })

    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0

    // Save exam history
    await saveExamHistory({
      mode: isMistakeMode ? 'mock' : 'practice',
      subjectId: questions[0]?.subject || 'general',
      score,
      totalQuestions: questions.length,
      percentage,
      timeSpentSeconds: elapsedSeconds,
      date: new Date().toISOString()
    })

    setIsCompleted(true)
  }

  // Calculate score summary
  const score = Object.entries(selectedAnswers).reduce((acc, [idxStr, ans]) => {
    const q = questions[Number(idxStr)]
    return ans === q?.answer ? acc + 1 : acc
  }, 0)

  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0

  if (isCompleted) {
    const wrongQuestions = questions.filter((q, idx) => selectedAnswers[idx] !== q.answer)

    return (
      <div className="max-w-md mx-auto px-4 py-6 pb-24 flex flex-col gap-5 animate-fade-in">
        {/* Result Header Card */}
        <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/80 shadow-sm flex flex-col items-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 ${
            percentage >= 60 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
          }`}>
            <Sparkles className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-slate-800">
            {percentage >= 60 ? 'ทำได้ยอดเยี่ยม!' : 'พยายามได้ดีมาก!'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">สรุปผลการฝึกทำข้อสอบ: {title}</p>

          <div className="my-4 flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-blue-600">{score}</span>
            <span className="text-lg font-bold text-slate-400">/ {questions.length}</span>
            <span className="ml-2 text-sm font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
              {percentage}%
            </span>
          </div>

          <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl">
              <span className="text-slate-400 block mb-0.5">เวลาที่ใช้</span>
              <span className="font-semibold text-slate-700">
                {Math.floor(timeSpent / 60)} นาที {timeSpent % 60} วินาที
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl">
              <span className="text-slate-400 block mb-0.5">ข้อที่ผิด</span>
              <span className="font-semibold text-rose-600">{wrongQuestions.length} ข้อ</span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
            <span>ตรวจคำตอบทุกข้อ</span>
            <span className="text-xs font-normal text-slate-400">แตะเพื่อดูรายละเอียด</span>
          </h3>

          <div className="flex flex-col gap-2.5">
            {questions.map((q, idx) => {
              const isCorrect = selectedAnswers[idx] === q.answer
              return (
                <div
                  key={q.id}
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    isCorrect
                      ? 'border-emerald-200 bg-emerald-50/40 text-slate-700'
                      : 'border-rose-200 bg-rose-50/40 text-slate-700'
                  }`}
                >
                  <div className="mt-0.5">
                    {isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 line-clamp-2">
                      ข้อ {idx + 1}. {q.question}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[11px]">
                      <span className="text-slate-500">ตอบ: {choiceLabels[selectedAnswers[idx] ?? 0]}</span>
                      {!isCorrect && (
                        <span className="text-emerald-700 font-semibold">
                          (เฉลย: {choiceLabels[q.answer]})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => {
              setCurrentIndex(0)
              setSelectedAnswers({})
              setAnswerFeedback({})
              setIsCompleted(false)
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ทำชุดนี้อีกรอบ</span>
          </button>

          <button
            onClick={onFinish}
            className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all active:scale-[0.98]"
          >
            กลับหน้ารายการ
          </button>
        </div>
      </div>
    )
  }

  // Question Player Screen
  const feedback = answerFeedback[currentIndex]
  const isCurrentCorrect = isAnswered && currentSelected === currentQ.answer

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 flex flex-col gap-4 animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onFinish}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ออก</span>
        </button>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
          ข้อที่ {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
            {currentQ.topic}
          </span>
          {currentQ.source && (
            <span className="text-[10px] text-slate-400">
              ที่มา: {currentQ.source}
            </span>
          )}
        </div>

        <p className="text-base font-semibold text-slate-800 leading-relaxed whitespace-pre-line">
          {currentQ.question}
        </p>
      </div>

      {/* Choices */}
      <div className="flex flex-col gap-2.5">
        {currentQ.choices.map((choice, idx) => {
          const isThisChoice = currentSelected === idx
          const isCorrectChoice = idx === currentQ.answer

          let choiceStyle = 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50/80'

          if (isAnswered) {
            if (isCorrectChoice) {
              choiceStyle = 'border-emerald-500 bg-emerald-50/80 text-emerald-900 font-medium'
            } else if (isThisChoice && !isCurrentCorrect) {
              choiceStyle = 'border-rose-400 bg-rose-50/80 text-rose-900'
            } else {
              choiceStyle = 'border-slate-200 bg-slate-50/50 text-slate-400 opacity-70'
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelectChoice(idx)}
              disabled={isAnswered}
              className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 active:scale-[0.99] ${choiceStyle}`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  isAnswered && isCorrectChoice
                    ? 'bg-emerald-600 text-white'
                    : isAnswered && isThisChoice && !isCurrentCorrect
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isAnswered && isCorrectChoice ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  choiceLabels[idx]
                )}
              </div>
              <span className="text-sm leading-snug pt-0.5">{choice}</span>
            </button>
          )
        })}
      </div>

      {/* Explanation and Mistake status notification (Appears immediately upon answering) */}
      {isAnswered && (
        <div className="flex flex-col gap-3 animate-fade-in">
          {/* Mistake Notebook Status Alert */}
          {!isCurrentCorrect && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>บันทึกข้อนี้เข้า <b>สมุดข้อผิด</b> อัตโนมัติแล้ว (ทบทวนได้ที่แท็บสมุดข้อผิด)</span>
            </div>
          )}

          {isCurrentCorrect && feedback?.removedFromMistakes && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>🎉 ยอดเยี่ยม! คุณตอบถูก 2 ครั้งติด ข้อนี้จึงถูก<b>ปลดออกจากสมุดข้อผิดแล้ว</b></span>
            </div>
          )}

          {isCurrentCorrect && !feedback?.removedFromMistakes && feedback?.currentConsecutive === 1 && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>ตอบถูกแล้ว 1 ครั้ง (ตอบถูกอีก 1 ครั้งติด ข้อนี้จะออกจากสมุดข้อผิด)</span>
            </div>
          )}

          {/* Explanation Card */}
          <div className="bg-slate-100/80 rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-700">
            <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <span>คำอธิบายเฉลย:</span>
              <span className="text-emerald-600">ข้อ {choiceLabels[currentQ.answer]} ถูกต้อง</span>
            </div>
            <p className="leading-relaxed text-slate-600">{currentQ.explanation}</p>
          </div>

          {/* Next Button */}
          <button
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            <span>{currentIndex < questions.length - 1 ? 'ข้อถัดไป' : 'ดูสรุปคะแนน'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
