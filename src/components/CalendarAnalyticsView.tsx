import React, { useState, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  Flame,
  TrendingUp,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Edit2,
  CheckSquare
} from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getUserSettings, saveUserSettings, getStreakCount, getWeakestTopics } from '../db'
import type { DailyActivityRecord, UserSettings, Subject } from '../types'
import { fetchSubjects } from '../services/dataLoader'
import { ReadingChecklistView } from './ReadingChecklistView'

interface CalendarAnalyticsViewProps {
  initialSubTab?: 'calendar' | 'analytics' | 'checklist'
  onPracticeTopic: (subjectId: string, topic: string) => void
}

export const CalendarAnalyticsView: React.FC<CalendarAnalyticsViewProps> = ({
  initialSubTab = 'calendar',
  onPracticeTopic
}) => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'analytics' | 'checklist'>(initialSubTab)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [streak, setStreak] = useState(0)
  const [weakestTopics, setWeakestTopics] = useState<
    { topic: string; subjectId: string; wrongCount: number }[]
  >([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isEditingExamDate, setIsEditingExamDate] = useState(false)
  const [examDateInput, setExamDateInput] = useState('')

  // Live queries
  const dailyActivities = useLiveQuery(() => db.dailyActivity.toArray(), [])
  const examHistory = useLiveQuery(() => db.examHistory.reverse().toArray(), [])

  useEffect(() => {
    getUserSettings().then((s) => {
      setSettings(s)
      if (s.targetExamDate) setExamDateInput(s.targetExamDate)
    })
    getStreakCount().then(setStreak)
    getWeakestTopics(5).then(setWeakestTopics)
    fetchSubjects().then(setSubjects)
  }, [dailyActivities, examHistory])

  // Calculate today's activity
  const todayStr = new Date().toISOString().split('T')[0]
  const todayActivity = dailyActivities?.find((a) => a.date === todayStr)
  const todayQuestions = todayActivity?.questionsAnswered || 0
  const dailyGoal = settings?.dailyQuestionGoal || 30
  const todayProgressPct = Math.min(100, Math.round((todayQuestions / dailyGoal) * 100))

  // Calculate days remaining to exam
  let daysToExam: number | null = null
  if (settings?.targetExamDate) {
    const examDate = new Date(settings.targetExamDate)
    const now = new Date()
    const diffTime = examDate.getTime() - now.getTime()
    daysToExam = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const handleSaveExamDate = async () => {
    if (!examDateInput) return
    await saveUserSettings({ targetExamDate: examDateInput })
    setSettings((prev) => (prev ? { ...prev, targetExamDate: examDateInput } : null))
    setIsEditingExamDate(false)
  }

  const handleSetGoal = async (newGoal: number) => {
    await saveUserSettings({ dailyQuestionGoal: newGoal })
    setSettings((prev) => (prev ? { ...prev, dailyQuestionGoal: newGoal } : null))
  }

  // Calendar helpers
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthNamesThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ]

  const dayActivityMap = new Map<string, DailyActivityRecord>()
  dailyActivities?.forEach((a) => dayActivityMap.set(a.date, a))

  return (
    <div className="max-w-md mx-auto px-4 py-5 pb-28 flex flex-col gap-5 animate-fade-in">
      {/* Top Segmented Tab Switcher */}
      <div className="flex items-center bg-slate-200/80 p-1 rounded-2xl text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
            activeTab === 'calendar'
              ? 'bg-white text-slate-800 shadow-sm font-extrabold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>ปฏิทิน & เป้าหมาย</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
            activeTab === 'analytics'
              ? 'bg-white text-slate-800 shadow-sm font-extrabold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>ประวัติ & จุดอ่อน</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('checklist')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1 ${
            activeTab === 'checklist'
              ? 'bg-white text-slate-800 shadow-sm font-extrabold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>เช็กลิสต์บทอ่าน</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: CALENDAR & GOALS                                        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'calendar' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {/* Exam Countdown Card */}
          <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 rounded-3xl p-5 text-white shadow-md shadow-blue-500/20 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs">
                  นับถอยหลังวันสอบจริง
                </span>
                <div className="mt-2">
                  {daysToExam !== null ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-black">{daysToExam > 0 ? daysToExam : 0}</span>
                      <span className="text-sm font-bold text-blue-100">วัน</span>
                      <span className="text-xs text-blue-200 ml-2">
                        {daysToExam > 0 ? 'เตรียมตัวให้พร้อม!' : 'ถึงวันสอบแล้ว!'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-base font-bold block text-white/90">
                      ยังไม่ได้ตั้งวันสอบจริง
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingExamDate(!isEditingExamDate)}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white active:scale-95 transition-all"
                title="ตั้งค่าวันสอบ"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            {/* Date Editor Inline */}
            {isEditingExamDate && (
              <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2">
                <input
                  type="date"
                  value={examDateInput}
                  onChange={(e) => setExamDateInput(e.target.value)}
                  className="bg-white/90 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-xl flex-1 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveExamDate}
                  className="px-3 py-1.5 rounded-xl bg-white text-blue-700 text-xs font-bold hover:bg-blue-50 active:scale-95 transition-all"
                >
                  บันทึก
                </button>
              </div>
            )}

            {settings?.targetExamDate && !isEditingExamDate && (
              <p className="text-[11px] text-blue-100 mt-2">
                กำหนดการสอบ: {new Date(settings.targetExamDate).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
          </div>

          {/* Daily Goal & Streak Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Flame className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">ความต่อเนื่อง (Streak)</h3>
                  <span className="text-xs text-amber-600 font-extrabold">{streak} วันติดกัน 🔥</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">วันนี้</span>
                <span className="text-xs font-bold text-slate-700">
                  {todayQuestions} / {dailyGoal} ข้อ
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  todayProgressPct >= 100
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}
                style={{ width: `${todayProgressPct}%` }}
              />
            </div>

            {/* Change Goal Pills */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
              <span>เป้าหมายรายวัน:</span>
              <div className="flex items-center gap-1.5">
                {[15, 30, 50].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleSetGoal(g)}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                      dailyGoal === g
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {g} ข้อ
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Calendar Grid */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col gap-3">
            {/* Month Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {monthNamesThai[month]} {year + 543}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-95"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
              <span>อา.</span>
              <span>จ.</span>
              <span>อ.</span>
              <span>พ.</span>
              <span>พฤ.</span>
              <span>ศ.</span>
              <span>ส.</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {/* Empty offset days */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="h-10" />
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1
                const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                const act = dayActivityMap.get(dayDateStr)
                const isToday = dayDateStr === todayStr

                let cellStyle = 'bg-slate-50 text-slate-700'
                if (act && act.goalMet) {
                  cellStyle = 'bg-emerald-500 text-white font-bold shadow-xs'
                } else if (act && act.questionsAnswered > 0) {
                  cellStyle = 'bg-amber-100 text-amber-900 font-bold'
                }

                return (
                  <div
                    key={dayNum}
                    className={`h-10 rounded-xl flex flex-col items-center justify-center relative transition-all ${cellStyle} ${
                      isToday ? 'ring-2 ring-blue-600 font-black' : ''
                    }`}
                  >
                    <span className="text-[11px] leading-tight">{dayNum}</span>
                    {act && act.questionsAnswered > 0 && (
                      <span className={`text-[8px] leading-none ${act.goalMet ? 'text-white/90' : 'text-slate-500'}`}>
                        {act.questionsAnswered}ข
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> ทำครบเป้าหมาย
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-200" /> มีการฝึกทำ
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full border border-blue-600" /> วันนี้
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: ANALYTICS & WEAKEST TOPICS                             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'analytics' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {/* Top 5 Weakest Topics Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">5 หัวข้อที่ยังอ่อนที่สุด</h3>
                  <p className="text-[10px] text-slate-400">คำนวณจากข้อที่ตอบผิดบ่อยที่สุด</p>
                </div>
              </div>
            </div>

            {weakestTopics.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 flex flex-col items-center">
                <Sparkles className="w-6 h-6 text-emerald-500 mb-1" />
                <span>ยังไม่มีข้อมูลจุดอ่อน หรือคุณตอบถูกหมดทุกข้อ!</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 pt-1">
                {weakestTopics.map((w, idx) => {
                  const subjName = subjects.find((s) => s.id === w.subjectId)?.name || w.subjectId

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate">{w.topic}</h4>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {subjName} • ผิด {w.wrongCount} ครั้ง
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onPracticeTopic(w.subjectId, w.topic)}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold active:scale-95 transition-all"
                      >
                        <span>ฝึกซ่อม</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Exam History & Score Trend Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>ประวัติและแนวโน้มคะแนน</span>
              </h3>
              <span className="text-[10px] text-slate-400">
                ทำไปทั้งหมด {examHistory?.length || 0} ครั้ง
              </span>
            </div>

            {/* Score Bars of Recent Exams (Up to 8) */}
            {examHistory && examHistory.length > 0 ? (
              <div className="pt-2">
                <div className="h-32 flex items-end gap-2 border-b border-slate-100 pb-2">
                  {examHistory.slice(0, 8).reverse().map((h, idx) => {
                    const isPass = h.percentage >= 60

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] font-bold text-slate-600">{h.percentage}%</span>
                        <div className="w-full bg-slate-100 rounded-t-lg h-24 flex items-end overflow-hidden">
                          <div
                            className={`w-full rounded-t-lg transition-all duration-500 ${
                              isPass ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ height: `${Math.max(10, h.percentage)}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono">#{idx + 1}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 text-[10px] text-slate-400">
                  <span>← อดีต</span>
                  <span>ล่าสุด →</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                ยังไม่มีประวัติการสอบ ลองเริ่มฝึกทำข้อสอบเพื่อสร้างสถิติ
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: READING CHECKLIST                                      */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'checklist' && (
        <div className="animate-fade-in -mx-4 -my-5">
          <ReadingChecklistView />
        </div>
      )}
    </div>
  )
}
