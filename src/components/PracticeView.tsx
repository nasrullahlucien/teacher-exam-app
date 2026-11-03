import React, { useState, useEffect } from 'react'
import { Play, Sparkles, Shuffle, Filter, BookOpen } from 'lucide-react'
import type { Subject, Question } from '../types'
import { fetchSubjects, fetchQuestionsBySubject, fetchAllQuestions } from '../services/dataLoader'
import { PracticeSession } from './PracticeSession'

interface PracticeViewProps {
  initialSubjectId?: string | null
  onClearInitialSubject?: () => void
}

export const PracticeView: React.FC<PracticeViewProps> = ({
  initialSubjectId,
  onClearInitialSubject
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all')
  const [topics, setTopics] = useState<string[]>([])
  const [selectedTopic, setSelectedTopic] = useState<string>('all')
  const [questionCount, setQuestionCount] = useState<number>(10)
  const [isShuffle, setIsShuffle] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [activeSession, setActiveSession] = useState<{
    title: string
    questions: Question[]
  } | null>(null)

  useEffect(() => {
    fetchSubjects().then((res) => {
      setSubjects(res)
      if (initialSubjectId) {
        setSelectedSubjectId(initialSubjectId)
        if (onClearInitialSubject) onClearInitialSubject()
      }
      setIsLoading(false)
    })
  }, [initialSubjectId, onClearInitialSubject])

  // Update topics when selected subject changes
  useEffect(() => {
    if (selectedSubjectId === 'all') {
      setTopics([])
      setSelectedTopic('all')
      return
    }

    fetchQuestionsBySubject(selectedSubjectId).then((questions) => {
      const uniqueTopics = Array.from(new Set(questions.map((q) => q.topic)))
      setTopics(uniqueTopics)
      setSelectedTopic('all')
    })
  }, [selectedSubjectId])

  const handleStartPractice = async () => {
    setIsLoading(true)
    try {
      let pool: Question[] = []
      let title = 'ฝึกทำข้อสอบรวมทุกวิชา'

      if (selectedSubjectId === 'all') {
        pool = await fetchAllQuestions()
      } else {
        const subj = subjects.find((s) => s.id === selectedSubjectId)
        title = subj?.name || 'ฝึกแยกหมวด'
        pool = await fetchQuestionsBySubject(selectedSubjectId)

        if (selectedTopic !== 'all') {
          pool = pool.filter((q) => q.topic === selectedTopic)
          title = `${title} (${selectedTopic})`
        }
      }

      if (pool.length === 0) {
        alert('ไม่พบข้อสอบในหมวดที่เลือก')
        setIsLoading(false)
        return
      }

      // Shuffle if enabled
      let prepared = [...pool]
      if (isShuffle) {
        prepared.sort(() => Math.random() - 0.5)
      }

      // Slice to selected count
      if (questionCount > 0 && questionCount < prepared.length) {
        prepared = prepared.slice(0, questionCount)
      }

      setActiveSession({
        title,
        questions: prepared
      })
    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาดในการโหลดข้อสอบ')
    } finally {
      setIsLoading(false)
    }
  }

  if (activeSession) {
    return (
      <PracticeSession
        title={activeSession.title}
        questions={activeSession.questions}
        onFinish={() => setActiveSession(null)}
      />
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-5 pb-24 flex flex-col gap-5 animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-800">ฝึกทำข้อสอบแยกหมวด</h2>
        <p className="text-xs text-slate-500">เลือกวิชาและจำนวนข้อที่ต้องการฝึกฝน ตอบแล้วเฉลยทันที</p>
      </div>

      {/* Configuration Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col gap-4">
        {/* Subject Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>หมวดวิชา</span>
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">รวมทุกหมวดวิชา (ภาค ก + ภาค ข)</option>
            <optgroup label="ภาค ก">
              {subjects
                .filter((s) => s.part === 'ก')
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    ภาค ก: {s.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="ภาค ข">
              {subjects
                .filter((s) => s.part === 'ข')
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    ภาค ข: {s.name}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>

        {/* Topic Selector (if specific subject selected) */}
        {selectedSubjectId !== 'all' && topics.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>หัวข้อย่อย</span>
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทุกหัวข้อย่อย</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Question Count Buttons */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-700">จำนวนข้อที่ต้องการฝึก</label>
          <div className="grid grid-cols-4 gap-2">
            {[10, 20, 50, 0].map((count) => {
              const isSelected = questionCount === count
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => setQuestionCount(count)}
                  className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-all text-center ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {count === 0 ? 'ทั้งหมด' : `${count} ข้อ`}
                </button>
              )
            })}
          </div>
        </div>

        {/* Shuffle Option */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shuffle className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-700">สุ่มลำดับข้อสอบ</span>
          </div>
          <button
            type="button"
            onClick={() => setIsShuffle(!isShuffle)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              isShuffle ? 'bg-blue-600 justify-end' : 'bg-slate-200 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
          </button>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartPractice}
          disabled={isLoading}
          className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isLoading ? 'กำลังโหลดข้อสอบ...' : 'เริ่มฝึกทำข้อสอบ'}</span>
        </button>
      </div>

      {/* Tips */}
      <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100 text-xs text-blue-900 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <b>ข้อแนะนำ:</b> เมื่อตอบผิด ระบบจะบันทึกข้อนั้นลงใน <b>สมุดข้อผิด</b> โดยอัตโนมัติ
          และเมื่อกลับมาทำซ้ำจนตอบถูก 2 ครั้งติด ข้อนั้นจึงจะถูกปลดออกจากสมุดข้อผิด
        </p>
      </div>
    </div>
  )
}
