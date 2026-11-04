import React, { useState, useEffect } from 'react'
import { BookOpen, AlertCircle, CheckSquare, ChevronRight, Play, Sparkles, Lock } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Subject, LastPracticeInfo } from '../types'
import { fetchSubjects, fetchQuestionsBySubject } from '../services/dataLoader'
import type { NavTab } from './BottomNav'

interface DashboardProps {
  onNavigate: (tab: NavTab, subjectId?: string, topic?: string) => void
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectQuestionCounts, setSubjectQuestionCounts] = useState<Record<string, number>>({})
  const [lastPractice, setLastPractice] = useState<LastPracticeInfo | null>(null)

  // Live queries from Dexie
  const mistakes = useLiveQuery(() => db.mistakes.toArray(), [])
  const examHistory = useLiveQuery(() => db.examHistory.toArray(), [])
  const readingList = useLiveQuery(() => db.readingChecklist.toArray(), [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('teacher_exam_last_practice')
      if (saved) setLastPractice(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    fetchSubjects().then(async (subjList) => {
      setSubjects(subjList)
      const counts: Record<string, number> = {}
      for (const s of subjList) {
        try {
          const qList = await fetchQuestionsBySubject(s.id)
          counts[s.id] = qList.length
        } catch {
          counts[s.id] = 10
        }
      }
      setSubjectQuestionCounts(counts)
    })
  }, [])

  // Calculate subject stats from history
  const getSubjectStats = (subjectId: string) => {
    const relevantExams = (examHistory || []).filter(
      (h) => h.subjectId === subjectId || h.subjectId === 'all'
    )
    const totalAttempted = relevantExams.reduce((sum, h) => sum + h.totalQuestions, 0)
    const totalScore = relevantExams.reduce((sum, h) => sum + h.score, 0)
    const avgScore = totalAttempted > 0 ? Math.round((totalScore / totalAttempted) * 100) : 0

    const totalQuestions = subjectQuestionCounts[subjectId] || 10
    const subjectMistakes = (mistakes || []).filter((m) => m.subjectId === subjectId).length

    // Approximate coverage %
    const coveragePercent = Math.min(100, Math.round((totalAttempted / totalQuestions) * 100))

    return {
      totalQuestions,
      totalAttempted,
      avgScore,
      coveragePercent,
      subjectMistakes
    }
  }

  // Global calculations
  const totalQuestionsInSystem = Object.values(subjectQuestionCounts).reduce((a, b) => a + b, 0) || 80
  const totalAttemptedAll = (examHistory || []).reduce((sum, h) => sum + h.totalQuestions, 0)
  const totalScoreAll = (examHistory || []).reduce((sum, h) => sum + h.score, 0)
  const overallAverageScore =
    totalAttemptedAll > 0 ? Math.round((totalScoreAll / totalAttemptedAll) * 100) : 0
  const totalMistakesCount = mistakes?.length || 0
  const totalReadCount = (readingList || []).filter((r) => r.isRead).length

  return (
    <div className="max-w-md mx-auto px-4 py-5 pb-24 flex flex-col gap-5 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-5 text-white shadow-md shadow-blue-500/15">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-sm">
            ภาพรวมความพร้อม
          </span>
          <span className="text-xs text-blue-100 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ครูผู้ช่วย 2569-2570</span>
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-extrabold">{overallAverageScore}%</span>
          <span className="text-xs text-blue-100 font-medium">คะแนนเฉลี่ยรวมทุกวิชา</span>
        </div>

        <p className="text-xs text-blue-100/90 leading-relaxed">
          ทำข้อสอบสะสมไปแล้ว {totalAttemptedAll} ครั้ง จากคลังข้อสอบทั้งหมด {totalQuestionsInSystem} ข้อ
        </p>

        {/* Quick Action in Banner */}
        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
          <button
            onClick={() => onNavigate('practice')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-blue-700 font-bold text-xs shadow-sm hover:bg-blue-50 active:scale-95 transition-all"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>เริ่มทำข้อสอบ</span>
          </button>

          <button
            onClick={() => onNavigate('mistakes')}
            className="text-xs font-medium text-white/90 hover:text-white flex items-center gap-1"
          >
            <span>สมุดข้อผิด ({totalMistakesCount})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mini Stats 3 Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <button
          onClick={() => onNavigate('practice')}
          className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-center gap-1 active:scale-95 transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-base font-bold text-slate-800">{totalAttemptedAll}</span>
          <span className="text-[10px] text-slate-400 font-medium">ข้อที่ฝึกแล้ว</span>
        </button>

        <button
          onClick={() => onNavigate('mistakes')}
          className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-center gap-1 active:scale-95 transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
          <span className="text-base font-bold text-rose-600">{totalMistakesCount}</span>
          <span className="text-[10px] text-slate-400 font-medium">ข้อผิดที่ค้าง</span>
        </button>

        <button
          onClick={() => onNavigate('checklist')}
          className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-center gap-1 active:scale-95 transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckSquare className="w-4 h-4" />
          </div>
          <span className="text-base font-bold text-emerald-600">{totalReadCount}</span>
          <span className="text-[10px] text-slate-400 font-medium">บทที่อ่านจบ</span>
        </button>
      </div>

      {/* Quick Action: ทำต่อจากเดิม */}
      {lastPractice && (
        <div className="bg-white border border-blue-200/90 rounded-3xl p-3.5 shadow-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
              ⚡
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                  ทำต่อจากเดิม
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {lastPractice.discipline !== 'all' ? lastPractice.discipline : lastPractice.subjectName}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-800 truncate">
                {lastPractice.topic !== 'all' ? lastPractice.topic : 'รวมทุกหัวข้อ'}
              </h4>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onNavigate(
                'practice',
                lastPractice.subjectId,
                lastPractice.discipline !== 'all'
                  ? lastPractice.discipline
                  : lastPractice.topic !== 'all'
                  ? lastPractice.topic
                  : undefined
              )
            }
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>ฝึกต่อ</span>
          </button>
        </div>
      )}

      {/* Quick Action: Mock Exam Banner */}
      <button
        type="button"
        onClick={() => onNavigate('mock')}
        className="w-full p-4 rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 flex items-center justify-between active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
            ⏱️
          </div>
          <div className="text-left">
            <span className="text-sm font-bold block leading-tight">
              ห้องจำลองสอบเสมือนจริง
            </span>
            <span className="text-[11px] text-indigo-100 block mt-0.5">
              จับเวลาจริง ปักหมุดข้อทบทวน และวัดระดับความพร้อม
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-indigo-200" />
      </button>

      {/* Subjects Section */}
      <div className="flex flex-col gap-4">
        {/* Part ก */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-4 bg-blue-600 rounded-full" />
              <h2 className="text-sm font-bold text-slate-800">
                ภาค ก: ความรู้ความสามารถทั่วไป
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">3 หมวดวิชา</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {subjects
              .filter((s) => s.part === 'ก')
              .map((subj) => {
                const stats = getSubjectStats(subj.id)
                return (
                  <SubjectCard
                    key={subj.id}
                    subject={subj}
                    stats={stats}
                    onPractice={() => onNavigate('practice', subj.id)}
                    onPracticeTopic={(topic) => onNavigate('practice', subj.id, topic)}
                  />
                )
              })}
          </div>
        </div>

        {/* Part ข */}
        <div className="flex flex-col gap-2.5 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-4 bg-emerald-600 rounded-full" />
              <h2 className="text-sm font-bold text-slate-800">
                ภาค ข: มาตรฐานความรู้และประสบการณ์วิชาชีพ
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">5 หมวดวิชา</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {subjects
              .filter((s) => s.part === 'ข')
              .map((subj) => {
                const stats = getSubjectStats(subj.id)
                return (
                  <SubjectCard
                    key={subj.id}
                    subject={subj}
                    stats={stats}
                    onPractice={() => onNavigate('practice', subj.id)}
                    onPracticeTopic={(topic) => onNavigate('practice', subj.id, topic)}
                  />
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}

interface SubjectCardProps {
  subject: Subject
  stats: {
    totalQuestions: number
    totalAttempted: number
    avgScore: number
    coveragePercent: number
    subjectMistakes: number
  }
  onPractice: () => void
  onPracticeTopic?: (topic: string) => void
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, stats, onPractice, onPracticeTopic }) => {
  const isMajor = subject.id === 'kb-major'
  const majorCategories = [
    { id: '⚡ ฟิสิกส์', label: '⚡ ฟิสิกส์' },
    { id: '🧪 เคมี', label: '🧪 เคมี' },
    { id: '🧬 ชีววิทยา', label: '🧬 ชีววิทยา' },
    { id: '🪐 โลก ดาราศาสตร์ และอวกาศ', label: '🪐 โลก/ดาราศาสตร์' }
  ]

  return (
    <div
      className={`rounded-2xl p-4 border shadow-sm flex flex-col gap-3 transition-all ${
        isMajor
          ? 'bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/30 border-purple-200/90 shadow-md ring-1 ring-purple-300/40'
          : 'bg-white/80 border-slate-200/70 text-slate-500'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className={`text-xs font-bold ${isMajor ? 'text-slate-800' : 'text-slate-700'}`}>
              {subject.name}
            </h3>
            {isMajor ? (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5 text-purple-600" /> พร้อมใช้งาน
              </span>
            ) : (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5 text-slate-400" /> เร็วๆ นี้
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {isMajor
              ? `คลังข้อสอบ: ${stats.totalQuestions} ข้อ | ทำแล้ว ${stats.totalAttempted} ครั้ง`
              : `ตัวอย่างข้อสอบ ${stats.totalQuestions} ข้อ • อยู่ระหว่างจัดทำ`}
          </span>
        </div>

        {isMajor ? (
          <button
            onClick={onPractice}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs active:scale-95 transition-all"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>ฝึกวิชานี้</span>
          </button>
        ) : (
          <button
            onClick={() => {
              alert(
                `🔒 หมวดวิชา "${subject.name}" ยังไม่พร้อมใช้งานสำหรับการฝึกทำจริงครับ (ปัจจุบันมีเพียงข้อสอบตัวอย่าง 10 ข้อ)\n\n✨ แนะนำให้เลือกฝึก "วิชาเอก (วิทยาศาสตร์)" ซึ่งมีข้อสอบพร้อมใช้งานแล้วกว่า 1,350 ข้อก่อนนะครับ!`
              )
            }}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold active:scale-95 transition-all"
          >
            <Lock className="w-3 h-3 text-slate-400" />
            <span>เร็วๆ นี้</span>
          </button>
        )}
      </div>

      {/* 4 Science Major Subcategories */}
      {isMajor && (
        <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-slate-500">เลือกฝึกเฉพาะ 4 หมวดวิชาเอก:</span>
          <div className="grid grid-cols-2 gap-1.5">
            {majorCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onPracticeTopic && onPracticeTopic(cat.id)}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200/80 text-[11px] font-semibold text-slate-700 hover:text-blue-700 active:scale-95 transition-all"
              >
                <span>{cat.label}</span>
                <span className="text-[10px] text-blue-500 font-normal">ฝึก →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress & Score Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500 font-medium">
            คะแนนเฉลี่ย: <b className="text-slate-700">{stats.avgScore}%</b>
          </span>
          {stats.subjectMistakes > 0 && (
            <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.2 rounded">
              ข้อผิด {stats.subjectMistakes} ข้อ
            </span>
          )}
        </div>

        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              stats.avgScore >= 60 ? 'bg-emerald-500' : stats.avgScore > 0 ? 'bg-amber-500' : 'bg-slate-200'
            }`}
            style={{ width: `${Math.max(stats.avgScore, 0)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
