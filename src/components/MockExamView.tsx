import React, { useState, useEffect } from 'react'
import {
  Clock,
  Play,
  Zap,
  Target,
  Sliders,
  Award,
  ChevronRight,
  BookOpen
} from 'lucide-react'
import type { Subject, Question } from '../types'
import { fetchSubjects, fetchQuestionsBySubject, fetchAllQuestions } from '../services/dataLoader'
import { MockExamSession } from './MockExamSession'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export const MockExamView: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all')
  const [questionCount, setQuestionCount] = useState<number>(20)
  const [timeMinutes, setTimeMinutes] = useState<number>(25)
  const [activePreset, setActivePreset] = useState<'quick' | 'standard' | 'custom'>('quick')
  const [isLoading, setIsLoading] = useState(false)
  const [activeSession, setActiveSession] = useState<{
    title: string
    questions: Question[]
    timeMinutes: number
  } | null>(null)

  // Live query recent mock exams
  const recentMocks = useLiveQuery(async () => {
    return await db.examHistory
      .where('mode')
      .equals('mock')
      .reverse()
      .limit(3)
      .toArray()
  }, [])

  useEffect(() => {
    fetchSubjects().then(setSubjects)
  }, [])

  const handleSelectPreset = (preset: 'quick' | 'standard' | 'custom') => {
    setActivePreset(preset)
    if (preset === 'quick') {
      setSelectedSubjectId('all')
      setQuestionCount(20)
      setTimeMinutes(25)
    } else if (preset === 'standard') {
      setSelectedSubjectId('all')
      setQuestionCount(50)
      setTimeMinutes(60)
    }
  }

  const handleStartExam = async () => {
    setIsLoading(true)
    try {
      let pool: Question[] = []
      let title = 'จำลองสอบรวมทุกวิชา'

      if (selectedSubjectId === 'all') {
        pool = await fetchAllQuestions()
      } else {
        const subj = subjects.find((s) => s.id === selectedSubjectId)
        title = `จำลองสอบ: ${subj?.name || 'รายวิชา'}`
        pool = await fetchQuestionsBySubject(selectedSubjectId)
      }

      if (pool.length === 0) {
        alert('ไม่พบข้อสอบในหมวดที่เลือก')
        setIsLoading(false)
        return
      }

      // Shuffle thoroughly
      const prepared = [...pool].sort(() => Math.random() - 0.5)

      // Slice to question count
      const finalQuestions =
        questionCount > 0 && questionCount < prepared.length
          ? prepared.slice(0, questionCount)
          : prepared

      setActiveSession({
        title,
        questions: finalQuestions,
        timeMinutes
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
      <MockExamSession
        title={activeSession.title}
        questions={activeSession.questions}
        timeLimitMinutes={activeSession.timeMinutes}
        onFinish={() => setActiveSession(null)}
      />
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-5 pb-28 flex flex-col gap-5 animate-fade-in">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
          <h2 className="text-xl font-bold text-slate-800">ห้องจำลองสอบจริง</h2>
        </div>
        <p className="text-xs text-slate-500">
          จับเวลานับถอยหลัง ปักหมุดทบทวน และสรุปคะแนนแยกวิชาหลังส่ง
        </p>
      </div>

      {/* Preset Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Quick Mock */}
        <button
          type="button"
          onClick={() => handleSelectPreset('quick')}
          className={`p-4 rounded-3xl border text-left transition-all flex flex-col justify-between min-h-[120px] active:scale-[0.98] ${
            activePreset === 'quick'
              ? 'border-blue-600 bg-blue-50/90 text-blue-900 shadow-sm ring-2 ring-blue-500'
              : 'border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700'
          }`}
        >
          <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h3 className="text-sm font-bold">จำลองสอบด่วน</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">20 ข้อ • 25 นาที</p>
          </div>
        </button>

        {/* Standard Mock */}
        <button
          type="button"
          onClick={() => handleSelectPreset('standard')}
          className={`p-4 rounded-3xl border text-left transition-all flex flex-col justify-between min-h-[120px] active:scale-[0.98] ${
            activePreset === 'standard'
              ? 'border-indigo-600 bg-indigo-50/90 text-indigo-900 shadow-sm ring-2 ring-indigo-500'
              : 'border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700'
          }`}
        >
          <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold">จำลองมาตรฐาน</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">50 ข้อ • 60 นาที</p>
          </div>
        </button>
      </div>

      {/* Custom Option Button */}
      <button
        type="button"
        onClick={() => handleSelectPreset('custom')}
        className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between active:scale-[0.99] ${
          activePreset === 'custom'
            ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-sm ring-2 ring-purple-500 font-bold'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold block">กำหนดจำนวนข้อและเวลาเอง (Custom)</span>
            <span className="text-[10px] text-slate-400 block">เลือกวิชา จำนวนข้อ และเวลาได้ตามใจชอบ</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>

      {/* Custom Options Panel (if custom selected) */}
      {activePreset === 'custom' && (
        <div className="bg-white rounded-3xl p-5 border border-purple-200/80 shadow-sm flex flex-col gap-4 animate-fade-in">
          {/* Subject Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-purple-600" />
              <span>หมวดวิชาที่ต้องการสอบ</span>
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
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

          {/* Question Count */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700">จำนวนข้อสอบ</label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 30, 50].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setQuestionCount(cnt)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    questionCount === cnt
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  {cnt} ข้อ
                </button>
              ))}
            </div>
          </div>

          {/* Time Limit */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span>เวลาสอบ</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[15, 25, 45, 60].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setTimeMinutes(min)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    timeMinutes === min
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  {min} นาที
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Start Exam Button */}
      <button
        onClick={handleStartExam}
        disabled={isLoading}
        className="w-full py-4 px-4 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-base shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all"
      >
        <Play className="w-5 h-5 fill-current" />
        <span>{isLoading ? 'กำลังโหลดข้อสอบ...' : `เริ่มจำลองสอบ (${questionCount} ข้อ / ${timeMinutes} นาที)`}</span>
      </button>

      {/* Recent Mock Exam History Card */}
      {recentMocks && recentMocks.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>ประวัติการจำลองสอบล่าสุด</span>
            </h3>
            <span className="text-[10px] text-slate-400">3 ครั้งล่าสุด</span>
          </div>

          <div className="flex flex-col gap-2">
            {recentMocks.map((h) => {
              const dateStr = new Date(h.date).toLocaleDateString('th-TH', {
                month: 'short',
                day: 'numeric'
              })
              const isPass = h.percentage >= 60

              return (
                <div
                  key={h.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">
                      {h.score} / {h.totalQuestions} ข้อ ({h.percentage}%)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {dateStr} • ใช้เวลา {Math.floor(h.timeSpentSeconds / 60)} นาที
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isPass ? 'ผ่านเกณฑ์' : 'ไม่ผ่าน'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
