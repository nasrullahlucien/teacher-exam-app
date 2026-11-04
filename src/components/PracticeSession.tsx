import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  Check,
  Shuffle
} from 'lucide-react'
import type { Question } from '../types'
import { recordAnswer, saveExamHistory } from '../db'
import { MathText } from './MathText'
import { shuffleQuestionChoices } from '../utils/shuffleChoices'

interface PracticeSessionProps {
  title: string
  questions: Question[]
  onFinish: () => void
  isMistakeMode?: boolean
  shuffleChoices?: boolean
}

export const PracticeSession: React.FC<PracticeSessionProps> = ({
  title,
  questions,
  onFinish,
  isMistakeMode: _isMistakeMode = false,
  shuffleChoices = true
}) => {
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>(() =>
    shuffleChoices ? questions.map(shuffleQuestionChoices) : questions
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [answerFeedback, setAnswerFeedback] = useState<
    Record<number, { removedFromMistakes: boolean; currentConsecutive: number }>
  >({})
  const [startTime] = useState<number>(Date.now())
  const [isCompleted, setIsCompleted] = useState(false)
  const [timeSpent, setTimeSpent] = useState(0)

  useEffect(() => {
    setSessionQuestions(shuffleChoices ? questions.map(shuffleQuestionChoices) : questions)
    setCurrentIndex(0)
    setSelectedAnswers({})
    setAnswerFeedback({})
    setIsCompleted(false)
  }, [questions, shuffleChoices])

  const currentQ = sessionQuestions[currentIndex]
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
    setAnswerFeedback((prev) => ({ ...prev, [currentIndex]: feedback }))
  }

  const handleNext = () => {
    if (currentIndex < sessionQuestions.length - 1) {
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
    sessionQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answer) {
        score += 1
      }
    })

    const percentage =
      sessionQuestions.length > 0 ? Math.round((score / sessionQuestions.length) * 100) : 0

    // Build question detail records for history
    const details = sessionQuestions.map((q, idx) => ({
      questionId: q.id,
      subjectId: q.subject,
      topic: q.topic,
      userAnswer: selectedAnswers[idx] ?? null,
      correctAnswer: q.answer,
      isCorrect: selectedAnswers[idx] === q.answer
    }))

    // Save exam history
    try {
      await saveExamHistory({
        mode: 'practice',
        subjectId: sessionQuestions[0]?.subject || 'general',
        score,
        totalQuestions: sessionQuestions.length,
        percentage,
        timeSpentSeconds: elapsedSeconds,
        date: new Date().toISOString(),
        details
      })
    } catch (err) {
      console.error('Failed to save exam history', err)
    }

    setIsCompleted(true)
  }

  // Summary Screen when completed
  if (isCompleted) {
    let score = 0
    Object.keys(selectedAnswers).forEach((idxStr) => {
      const q = sessionQuestions[Number(idxStr)]
      if (q && selectedAnswers[Number(idxStr)] === q.answer) {
        score += 1
      }
    })
    const percentage =
      sessionQuestions.length > 0 ? Math.round((score / sessionQuestions.length) * 100) : 0
    const isPassed = percentage >= 60

    const wrongQuestions = sessionQuestions.filter(
      (q, idx) => selectedAnswers[idx] !== q.answer
    )

    return (
      <div className="max-w-md mx-auto px-4 py-5 pb-24 flex flex-col gap-4 animate-fade-in">
        {/* Result Header Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-2 bg-blue-50 text-blue-600">
            {isPassed ? '🎉' : '💪'}
          </div>

          <h2 className="text-lg font-bold text-slate-800">
            {isPassed ? 'ผ่านเกณฑ์การฝึกฝน!' : 'ฝึกฝนเสร็จสิ้น!'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{title}</p>

          <div className="my-3 flex items-baseline justify-center">
            <span className="text-4xl font-extrabold text-slate-900">{score}</span>
            <span className="text-lg font-bold text-slate-400">/ {sessionQuestions.length}</span>
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
            {sessionQuestions.map((q, idx) => {
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
                      ข้อ {idx + 1}. <MathText text={q.question} />
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[11px]">
                      <span className="text-slate-500">
                        ตอบ: {choiceLabels[selectedAnswers[idx] ?? 0]}
                      </span>
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
              if (shuffleChoices) {
                setSessionQuestions(questions.map(shuffleQuestionChoices))
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ทำชุดนี้อีกรอบ (สลับช้อยใหม่)</span>
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
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ออก</span>
        </button>

        <div className="flex items-center gap-2">
          {shuffleChoices && (
            <span className="text-[10px] font-medium text-purple-700 bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Shuffle className="w-2.5 h-2.5" /> สลับช้อย
            </span>
          )}
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
            ข้อที่ {currentIndex + 1} / {sessionQuestions.length}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + 1) / sessionQuestions.length) * 100}%` }}
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
          <MathText text={currentQ.question} />
        </p>
      </div>

      {/* Choices */}
      <div className="flex flex-col gap-2.5">
        {currentQ.choices.map((choice, idx) => {
          const isThisChoice = currentSelected === idx
          const isCorrectChoice = idx === currentQ.answer

          let choiceStyle =
            'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50/80'

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
              <span className="text-sm leading-snug pt-0.5">
                <MathText text={choice} />
              </span>
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
              <span>
                บันทึกข้อนี้เข้า <b>สมุดข้อผิด</b> อัตโนมัติแล้ว (ทบทวนได้ที่แท็บสมุดข้อผิด)
              </span>
            </div>
          )}

          {isCurrentCorrect && feedback?.removedFromMistakes && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                🎉 ยอดเยี่ยม! คุณตอบถูก 2 ครั้งติด ข้อนี้จึงถูก<b>ปลดออกจากสมุดข้อผิดแล้ว</b>
              </span>
            </div>
          )}

          {isCurrentCorrect &&
            !feedback?.removedFromMistakes &&
            feedback?.currentConsecutive === 1 && (
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
            <p className="leading-relaxed text-slate-600">
              <MathText text={currentQ.explanation} />
            </p>
          </div>

          {/* Next Button */}
          <button
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            <span>
              {currentIndex < sessionQuestions.length - 1 ? 'ข้อถัดไป' : 'ดูสรุปคะแนน'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
