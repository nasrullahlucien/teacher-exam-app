import React, { useState, useEffect } from 'react'
import { RotateCcw, CheckCircle2, Sparkles } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Question, Subject } from '../types'
import { fetchSubjects, fetchAllQuestions } from '../services/dataLoader'
import { PracticeSession } from './PracticeSession'

export const MistakesView: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all')
  const [activeSession, setActiveSession] = useState<{
    title: string
    questions: Question[]
  } | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(false)

  // Live query from Dexie
  const mistakes = useLiveQuery(() => db.mistakes.toArray(), [])

  useEffect(() => {
    fetchSubjects().then(setSubjects)
  }, [])

  const filteredMistakes = (mistakes || []).filter(
    (m) => selectedSubjectId === 'all' || m.subjectId === selectedSubjectId
  )

  const handleStartMistakesPractice = async () => {
    if (!filteredMistakes || filteredMistakes.length === 0) return

    setIsLoadingSession(true)
    try {
      const allQ = await fetchAllQuestions()
      const mistakeIdSet = new Set(filteredMistakes.map((m) => m.questionId))
      const targetQuestions = allQ.filter((q) => mistakeIdSet.has(q.id))

      if (targetQuestions.length === 0) {
        alert('ไม่พบข้อมูลข้อสอบสำหรับข้อที่ผิด')
        setIsLoadingSession(false)
        return
      }

      // Shuffle mistakes
      targetQuestions.sort(() => Math.random() - 0.5)

      const subj = subjects.find((s) => s.id === selectedSubjectId)
      const title = selectedSubjectId === 'all' ? 'ทำซ้ำข้อผิดทั้งหมด' : `ทำซ้ำข้อผิด: ${subj?.name}`

      setActiveSession({
        title,
        questions: targetQuestions
      })
    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาดในการโหลดข้อสอบ')
    } finally {
      setIsLoadingSession(false)
    }
  }

  if (activeSession) {
    return (
      <PracticeSession
        title={activeSession.title}
        questions={activeSession.questions}
        onFinish={() => setActiveSession(null)}
        isMistakeMode={true}
      />
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-5 pb-24 flex flex-col gap-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">สมุดข้อผิด</h2>
          <p className="text-xs text-slate-500">
            ทบทวนข้อที่เคยตอบผิด ตอบถูก 2 ครั้งติดเพื่อปลดออกจากสมุด
          </p>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold">
          {mistakes?.length || 0} ข้อ
        </div>
      </div>

      {/* Start Practice Mistakes Button */}
      {filteredMistakes.length > 0 && (
        <button
          onClick={handleStartMistakesPractice}
          disabled={isLoadingSession}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-md shadow-rose-500/20 active:scale-[0.98] transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>
            {isLoadingSession
              ? 'กำลังจัดเตรียม...'
              : `เริ่มทำซ้ำเฉพาะข้อผิด (${filteredMistakes.length} ข้อ)`}
          </span>
        </button>
      )}

      {/* Subject Filter Chips */}
      {subjects.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setSelectedSubjectId('all')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all ${
              selectedSubjectId === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            ทั้งหมด ({mistakes?.length || 0})
          </button>
          {subjects.map((s) => {
            const count = (mistakes || []).filter((m) => m.subjectId === s.id).length
            if (count === 0 && selectedSubjectId !== s.id) return null
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSubjectId(s.id)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all ${
                  selectedSubjectId === s.id
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s.name} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredMistakes.length === 0 && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200/80 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {mistakes?.length === 0 ? 'ยังไม่มีข้อที่ตอบผิด' : 'ไม่มีข้อผิดในหมวดนี้'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
            {mistakes?.length === 0
              ? 'ยอดเยี่ยมมาก! หรือคุณอาจจะยังไม่ได้เริ่มฝึกทำข้อสอบ ลองไปที่แท็บ "ฝึกข้อสอบ" เพื่อเริ่มทดสอบตัวเองได้เลย'
              : 'คุณได้ทบทวนและปลดล็อกข้อผิดในหมวดวิชานี้ครบหมดแล้ว'}
          </p>
        </div>
      )}

      {/* Mistake Items List */}
      <div className="flex flex-col gap-3">
        {filteredMistakes.map((item) => {
          const subj = subjects.find((s) => s.id === item.subjectId)

          return (
            <div
              key={item.questionId}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col gap-2.5 transition-all"
            >
              {/* Header of Item */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100">
                    {subj?.name || item.subjectId}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {item.topic}
                  </span>
                </div>

                {/* Consecutive Correct Badge */}
                <div
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    item.consecutiveCorrect === 1
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>ถูก {item.consecutiveCorrect}/2 ครั้ง</span>
                </div>
              </div>

              {/* Question ID and brief info */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono text-[11px]">รหัส: {item.questionId}</span>
                <span className="text-[11px] text-slate-400">เคยผิด {item.totalWrong} ครั้ง</span>
              </div>

              <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">
                  {item.consecutiveCorrect === 1
                    ? 'ตอบถูกอีก 1 ครั้งติดเพื่อปลดออก'
                    : 'ต้องตอบถูก 2 ครั้งติดเพื่อปลดออก'}
                </span>
                <button
                  onClick={() => {
                    // Quick practice this single question
                    fetchAllQuestions().then((all) => {
                      const q = all.find((x) => x.id === item.questionId)
                      if (q) {
                        setActiveSession({
                          title: `ทบทวน: ${q.topic}`,
                          questions: [q]
                        })
                      }
                    })
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 active:scale-95 transition-all"
                >
                  ทำข้อนี้เดี่ยวๆ
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
