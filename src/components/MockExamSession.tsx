import React, { useState, useEffect, useRef } from 'react'
import {
  Clock,
  Flag,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  LayoutGrid,
  X,
  Send
} from 'lucide-react'
import type { Question, Subject, ExamQuestionDetail } from '../types'
import { recordAnswer, saveExamHistory } from '../db'
import { fetchSubjects } from '../services/dataLoader'

interface MockExamSessionProps {
  title: string
  questions: Question[]
  timeLimitMinutes: number
  onFinish: () => void
}

export const MockExamSession: React.FC<MockExamSessionProps> = ({
  title,
  questions,
  timeLimitMinutes,
  onFinish
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({})
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({})
  const [secondsRemaining, setSecondsRemaining] = useState(timeLimitMinutes * 60)
  const [isGridOpen, setIsGridOpen] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [startTime] = useState<number>(Date.now())
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0)
  const timerRef = useRef<number | null>(null)

  const choiceLabels = ['ก', 'ข', 'ค', 'ง']

  useEffect(() => {
    fetchSubjects().then(setSubjects)
  }, [])

  // Timer countdown
  useEffect(() => {
    if (isSubmitted) return

    timerRef.current = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          handleSubmit(true) // Auto-submit when time is up
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isSubmitted])

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleSelectChoice = (choiceIdx: number) => {
    if (isSubmitted) return
    setUserAnswers((prev) => ({ ...prev, [currentIndex]: choiceIdx }))
  }

  const toggleFlag = () => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentIndex]: !prev[currentIndex]
    }))
  }

  const handleSubmit = async (isTimeUp = false) => {
    if (!isTimeUp) {
      const unansweredCount = questions.length - Object.keys(userAnswers).length
      const flaggedCount = Object.values(flaggedQuestions).filter(Boolean).length

      let message = 'คุณต้องการส่งข้อสอบและตรวจคะแนนตอนนี้หรือไม่?'
      if (unansweredCount > 0 || flaggedCount > 0) {
        message = `คุณยังไม่ได้ตอบอีก ${unansweredCount} ข้อ และมีข้อที่ปักหมุดไว้ ${flaggedCount} ข้อ คุณแน่ใจหรือไม่ว่าต้องการส่งข้อสอบ?`
      }

      if (!window.confirm(message)) {
        return
      }
    }

    if (timerRef.current) clearInterval(timerRef.current)

    const elapsed = Math.round((Date.now() - startTime) / 1000)
    setTimeSpentSeconds(elapsed)

    // Calculate results and save to IndexedDB
    let score = 0
    const details: ExamQuestionDetail[] = []
    const subjectBreakdown: Record<string, { total: number; correct: number; name: string }> = {}
    const topicBreakdown: Record<string, { total: number; correct: number }> = {}

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const userAns = userAnswers[i] ?? null
      const isCorrect = userAns === q.answer
      if (isCorrect) score++

      // Record to mistake notebook if wrong
      await recordAnswer(q, isCorrect)

      details.push({
        questionId: q.id,
        subjectId: q.subject,
        topic: q.topic,
        userAnswer: userAns,
        correctAnswer: q.answer,
        isCorrect,
        isFlagged: !!flaggedQuestions[i]
      })

      // Breakdown by subject
      const subjObj = subjects.find((s) => s.id === q.subject)
      const subjName = subjObj?.name || q.subject
      if (!subjectBreakdown[q.subject]) {
        subjectBreakdown[q.subject] = { total: 0, correct: 0, name: subjName }
      }
      subjectBreakdown[q.subject].total++
      if (isCorrect) subjectBreakdown[q.subject].correct++

      // Breakdown by topic
      if (!topicBreakdown[q.topic]) {
        topicBreakdown[q.topic] = { total: 0, correct: 0 }
      }
      topicBreakdown[q.topic].total++
      if (isCorrect) topicBreakdown[q.topic].correct++
    }

    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0

    await saveExamHistory({
      mode: 'mock',
      subjectId: 'all',
      score,
      totalQuestions: questions.length,
      percentage,
      timeSpentSeconds: elapsed,
      date: new Date().toISOString(),
      details,
      subjectBreakdown,
      topicBreakdown
    })

    setIsSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const currentQ = questions[currentIndex]
  const currentAnswer = userAnswers[currentIndex]
  const isFlagged = !!flaggedQuestions[currentIndex]
  const answeredCount = Object.keys(userAnswers).length

  // -------------------------------------------------------------
  // RESULTS SCREEN
  // -------------------------------------------------------------
  if (isSubmitted) {
    let score = 0
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.answer) score++
    })
    const percentage = Math.round((score / questions.length) * 100)
    const isPassed = percentage >= 60

    return (
      <div className="max-w-md mx-auto px-4 py-6 pb-28 flex flex-col gap-5 animate-fade-in">
        {/* Score Card */}
        <div className="bg-white rounded-3xl p-6 text-center border border-slate-200/80 shadow-sm flex flex-col items-center">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 ${
              isPassed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
            }`}
          >
            {isPassed ? <Award className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
          </div>

          <h2 className="text-xl font-bold text-slate-800">
            {isPassed ? 'สอบผ่านเกณฑ์! 🎉' : 'ยังไม่ผ่านเกณฑ์ (ต้องได้ 60% ขึ้นไป)'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">ผลการจำลองสอบ: {title}</p>

          <div className="my-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-blue-600">{score}</span>
            <span className="text-lg font-bold text-slate-400">/ {questions.length}</span>
            <span
              className={`ml-2 text-sm font-bold px-3 py-1 rounded-full ${
                isPassed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {percentage}%
            </span>
          </div>

          <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl">
              <span className="text-slate-400 block text-[11px] mb-0.5">เวลาที่ใช้สอบ</span>
              <span className="font-semibold text-slate-700">
                {Math.floor(timeSpentSeconds / 60)} นาที {timeSpentSeconds % 60} วินาที
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl">
              <span className="text-slate-400 block text-[11px] mb-0.5">ข้อที่ตอบถูก</span>
              <span className="font-semibold text-emerald-600">
                {score} จาก {questions.length} ข้อ
              </span>
            </div>
          </div>
        </div>

        {/* Subject Breakdown Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col gap-3">
          <h3 className="text-sm font-bold text-slate-800">คะแนนแยกตามหมวดวิชา</h3>

          {/* Group questions by subject */}
          {Array.from(new Set(questions.map((q) => q.subject))).map((subjId) => {
            const subjQuestions = questions.filter((q) => q.subject === subjId)
            const subjCorrect = subjQuestions.filter((q) => {
              const origIdx = questions.indexOf(q)
              return userAnswers[origIdx] === q.answer
            }).length
            const subjPct = Math.round((subjCorrect / subjQuestions.length) * 100)
            const subjName = subjects.find((s) => s.id === subjId)?.name || subjId

            return (
              <div key={subjId} className="flex flex-col gap-1 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{subjName}</span>
                  <span className="font-bold text-slate-800">
                    {subjCorrect}/{subjQuestions.length} ({subjPct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      subjPct >= 60 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${subjPct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Question Review List */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col gap-3">
          <h3 className="text-sm font-bold text-slate-800">ตรวจคำตอบและคำอธิบายเฉลย</h3>

          <div className="flex flex-col gap-3">
            {questions.map((q, idx) => {
              const userAns = userAnswers[idx]
              const isCorrect = userAns === q.answer

              return (
                <div
                  key={q.id}
                  className={`p-3.5 rounded-2xl border text-xs flex flex-col gap-2 ${
                    isCorrect
                      ? 'border-emerald-200 bg-emerald-50/30'
                      : 'border-rose-200 bg-rose-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-800">ข้อ {idx + 1}.</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                        {q.topic}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 font-bold">
                      {isCorrect ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> ถูกต้อง
                        </span>
                      ) : (
                        <span className="text-rose-600 flex items-center gap-1">
                          <XCircle className="w-4 h-4" /> ตอบผิด
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="font-medium text-slate-800 leading-snug">{q.question}</p>

                  <div className="flex items-center gap-3 text-[11px] pt-1">
                    <span className="text-slate-600">
                      คุณตอบ: <b>{userAns !== undefined ? choiceLabels[userAns] : 'ไม่ได้ตอบ'}</b>
                    </span>
                    {!isCorrect && (
                      <span className="text-emerald-700 font-bold">
                        เฉลยที่ถูก: {choiceLabels[q.answer]}
                      </span>
                    )}
                  </div>

                  <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/60 text-[11px] text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-700 block mb-0.5">คำอธิบาย:</span>
                    {q.explanation}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onFinish}
            className="w-full py-4 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all text-center"
          >
            กลับหน้ารายการจำลองสอบ
          </button>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // ACTIVE EXAM PLAYER
  // -------------------------------------------------------------
  const isTimeCritical = secondsRemaining <= 300 // <= 5 minutes
  const isTimeUrgent = secondsRemaining <= 60 // <= 1 minute

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 flex flex-col gap-4 animate-fade-in relative min-h-screen">
      {/* Top Floating Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between">
        {/* Question Counter Button (opens grid) */}
        <button
          type="button"
          onClick={() => setIsGridOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold active:scale-95 transition-all"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>ข้อ {currentIndex + 1} / {questions.length}</span>
        </button>

        {/* Timer */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold tracking-wider transition-all ${
            isTimeUrgent
              ? 'bg-rose-500 text-white animate-pulse'
              : isTimeCritical
              ? 'bg-amber-100 text-amber-800'
              : 'bg-blue-50 text-blue-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{formatTimer(secondsRemaining)}</span>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 active:scale-95 transition-all"
        >
          <Send className="w-3 h-3" />
          <span>ส่งข้อสอบ</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
              {currentQ.topic}
            </span>
            {currentQ.source && (
              <span className="text-[10px] text-slate-400">ที่มา: {currentQ.source}</span>
            )}
          </div>

          {/* Flag Toggle Button */}
          <button
            type="button"
            onClick={toggleFlag}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
              isFlagged
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-600 text-amber-600' : ''}`} />
            <span>{isFlagged ? 'ปักหมุดแล้ว' : 'ปักหมุดทบทวน'}</span>
          </button>
        </div>

        <p className="text-base font-semibold text-slate-800 leading-relaxed whitespace-pre-line pt-1">
          ข้อ {currentIndex + 1}. {currentQ.question}
        </p>
      </div>

      {/* Choice Buttons */}
      <div className="flex flex-col gap-2.5">
        {currentQ.choices.map((choice, idx) => {
          const isSelected = currentAnswer === idx

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectChoice(idx)}
              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 active:scale-[0.99] ${
                isSelected
                  ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm ring-2 ring-blue-500 font-medium'
                  : 'border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 shadow-xs'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {choiceLabels[idx]}
              </div>
              <span className="text-sm leading-snug pt-0.5">{choice}</span>
            </button>
          )
        })}
      </div>

      {/* Bottom Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className={`flex items-center gap-1 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
            currentIndex === 0
              ? 'opacity-40 border-slate-200 text-slate-400 cursor-not-allowed'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 shadow-xs'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ข้อก่อนหน้า</span>
        </button>

        <span className="text-xs font-medium text-slate-400">
          ตอบแล้ว {answeredCount}/{questions.length}
        </span>

        {currentIndex < questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
          >
            <span>ข้อถัดไป</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>ส่งข้อสอบ</span>
          </button>
        )}
      </div>

      {/* Question Grid Drawer Modal (for Quick Jump) */}
      {isGridOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">ภาพรวมข้อสอบทั้งหมด</h3>
                <p className="text-xs text-slate-500">แตะที่ข้อใดก็ได้เพื่อข้ามไปยังข้อนั้นทันที</p>
              </div>
              <button
                type="button"
                onClick={() => setIsGridOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-blue-600" />
                ตอบแล้ว ({answeredCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-400" />
                ปักหมุด ({Object.values(flaggedQuestions).filter(Boolean).length})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-200" />
                ยังไม่ทำ ({questions.length - answeredCount})
              </span>
            </div>

            {/* Numbers Grid */}
            <div className="grid grid-cols-5 gap-2 pt-1">
              {questions.map((_, idx) => {
                const isAns = userAnswers[idx] !== undefined
                const isFlag = !!flaggedQuestions[idx]
                const isCurr = currentIndex === idx

                let btnStyle = 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                if (isFlag) {
                  btnStyle = 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                } else if (isAns) {
                  btnStyle = 'bg-blue-600 text-white font-bold'
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx)
                      setIsGridOpen(false)
                    }}
                    className={`py-2.5 rounded-xl text-xs transition-all relative flex flex-col items-center justify-center active:scale-95 ${btnStyle} ${
                      isCurr ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlag && (
                      <Flag className="w-2.5 h-2.5 absolute top-1 right-1 fill-amber-600 text-amber-600" />
                    )}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsGridOpen(false)}
              className="w-full mt-2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
