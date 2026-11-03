import React, { useState, useEffect } from 'react'
import {
  Play,
  Shuffle,
  Atom,
  FlaskConical,
  Dna,
  Orbit,
  ArrowLeft,
  ChevronRight
} from 'lucide-react'
import type { Subject, Question } from '../types'
import { fetchSubjects, fetchQuestionsBySubject, fetchAllQuestions } from '../services/dataLoader'
import { PracticeSession } from './PracticeSession'

interface PracticeViewProps {
  initialSubjectId?: string | null
  initialTopic?: string | null
  onClearInitialSubject?: () => void
}

type Step = 'select_subject' | 'select_major' | 'configure'

export const PracticeView: React.FC<PracticeViewProps> = ({
  initialSubjectId,
  initialTopic,
  onClearInitialSubject
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [currentStep, setCurrentStep] = useState<Step>('select_subject')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all')
  const [selectedTopic, setSelectedTopic] = useState<string>('all')
  const [questionCount, setQuestionCount] = useState<number>(10)
  const [isShuffle, setIsShuffle] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [subjectFilterTab, setSubjectFilterTab] = useState<'all' | 'ก' | 'ข'>('all')
  const [activeSession, setActiveSession] = useState<{
    title: string
    questions: Question[]
  } | null>(null)

  useEffect(() => {
    fetchSubjects().then((res) => {
      setSubjects(res)
      if (initialSubjectId) {
        setSelectedSubjectId(initialSubjectId)
        if (initialSubjectId === 'kb-major') {
          if (initialTopic) {
            setSelectedTopic(initialTopic)
            setCurrentStep('configure')
          } else {
            setCurrentStep('select_major')
          }
        } else {
          if (initialTopic) {
            setSelectedTopic(initialTopic)
          } else {
            setSelectedTopic('all')
          }
          setCurrentStep('configure')
        }
        if (onClearInitialSubject) onClearInitialSubject()
      }
      setIsLoading(false)
    })
  }, [initialSubjectId, initialTopic, onClearInitialSubject])

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
        onFinish={() => {
          setActiveSession(null)
          setCurrentStep('select_subject')
        }}
      />
    )
  }

  // Icons and visual badges for subjects
  const subjectMeta: Record<string, { icon: string; desc: string }> = {
    'ka-analysis': { icon: '🧮', desc: 'คณิตศาสตร์ ตรรกะ บทความ' },
    'ka-english': { icon: '🇬🇧', desc: 'Grammar Vocab Reading' },
    'ka-civil': { icon: '🏛️', desc: 'ระเบียบข้าราชการ จริยธรรม' },
    'kb-teaching': { icon: '🧑‍🏫', desc: 'หลักสูตร จิตวิทยา การประเมิน' },
    'kb-law': { icon: '⚖️', desc: 'พ.ร.บ.การศึกษา คุรุสภา' },
    'kb-reform': { icon: '🚀', desc: 'ยุทธศาสตร์ชาติ จุดเน้น ศธ.' },
    'kb-general': { icon: '🌐', desc: 'เหตุการณ์ปัจจุบัน เศรษฐกิจ' },
    'kb-major': { icon: '🔬', desc: 'ฟิสิกส์ เคมี ชีวะ โลกดาราศาสตร์' },
  }

  // 4 Major Science Disciplines
  const majorDisciplines = [
    {
      id: '⚡ ฟิสิกส์',
      label: 'ฟิสิกส์',
      icon: Atom,
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900',
      iconBg: 'bg-blue-100 text-blue-600',
      sub: 'การเคลื่อนที่ แรง งาน พลังงาน ไฟฟ้า',
      badge: '⚡ Physics'
    },
    {
      id: '🧪 เคมี',
      label: 'เคมี',
      icon: FlaskConical,
      color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900',
      iconBg: 'bg-emerald-100 text-emerald-600',
      sub: 'สสาร ตารางธาตุ พันธะเคมี กรด-เบส',
      badge: '🧪 Chemistry'
    },
    {
      id: '🧬 ชีววิทยา',
      label: 'ชีววิทยา',
      icon: Dna,
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-900',
      iconBg: 'bg-purple-100 text-purple-600',
      sub: 'เซลล์ ออร์แกเนลล์ พันธุศาสตร์ เมนเดล',
      badge: '🧬 Biology'
    },
    {
      id: '🪐 โลก ดาราศาสตร์ และอวกาศ',
      label: 'โลก ดาราศาสตร์',
      icon: Orbit,
      color: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900',
      iconBg: 'bg-amber-100 text-amber-600',
      sub: 'ชั้นบรรยากาศ น้ำเกิดน้ำตาย อวกาศ',
      badge: '🪐 Earth & Space'
    }
  ]

  const filteredSubjects = subjects.filter(
    (s) => subjectFilterTab === 'all' || s.part === subjectFilterTab
  )

  const selectedSubjectObj = subjects.find((s) => s.id === selectedSubjectId)

  // -------------------------------------------------------------
  // STEP 1: SELECT MAIN SUBJECT
  // -------------------------------------------------------------
  if (currentStep === 'select_subject') {
    return (
      <div className="max-w-md mx-auto px-4 py-5 pb-28 flex flex-col gap-4 animate-fade-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">เลือกวิชาที่ต้องการฝึก</h2>
          </div>
          <p className="text-xs text-slate-500">แตะวิชาที่ต้องการเพื่อเข้าสู่หน้าทำข้อสอบทันที</p>
        </div>

        {/* Part Filter Tabs */}
        <div className="flex items-center bg-slate-200/70 p-1 rounded-2xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSubjectFilterTab('all')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              subjectFilterTab === 'all'
                ? 'bg-white text-slate-800 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ทั้งหมด (8 วิชา)
          </button>
          <button
            type="button"
            onClick={() => setSubjectFilterTab('ก')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              subjectFilterTab === 'ก'
                ? 'bg-white text-blue-700 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ภาค ก (3 วิชา)
          </button>
          <button
            type="button"
            onClick={() => setSubjectFilterTab('ข')}
            className={`flex-1 py-1.5 rounded-xl transition-all ${
              subjectFilterTab === 'ข'
                ? 'bg-white text-emerald-700 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ภาค ข (5 วิชา)
          </button>
        </div>

        {/* All Subjects Quick Option */}
        {subjectFilterTab === 'all' && (
          <button
            type="button"
            onClick={() => {
              setSelectedSubjectId('all')
              setSelectedTopic('all')
              setCurrentStep('configure')
            }}
            className="w-full p-4 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 flex items-center justify-between active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">📚</span>
              <div className="text-left">
                <span className="text-sm font-bold block leading-tight">
                  รวมทุกหมวดวิชา (ภาค ก + ภาค ข)
                </span>
                <span className="text-[11px] text-blue-100 block mt-0.5">
                  คละข้อสอบทุกหมวดเพื่อจำลองความพร้อม
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-200" />
          </button>
        )}

        {/* Subject Grid Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {filteredSubjects.map((s) => {
            const meta = subjectMeta[s.id] || { icon: '📖', desc: '' }
            const isMajor = s.id === 'kb-major'

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedSubjectId(s.id)
                  setSelectedTopic('all')
                  if (isMajor) {
                    // Navigate to major subcategory screen
                    setCurrentStep('select_major')
                  } else {
                    // Directly navigate to configure screen
                    setCurrentStep('configure')
                  }
                }}
                className={`p-3.5 rounded-3xl border text-left flex flex-col justify-between min-h-[115px] active:scale-[0.97] transition-all relative overflow-hidden bg-white hover:bg-blue-50/40 border-slate-200/90 shadow-sm hover:border-blue-300 ${
                  isMajor ? 'ring-2 ring-purple-400/40 bg-purple-50/20' : ''
                }`}
              >
                <div className="flex items-start justify-between w-full">
                  <span className="text-2xl">{meta.icon}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      s.part === 'ก'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : isMajor
                        ? 'bg-purple-100 text-purple-800 border border-purple-200 font-extrabold'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}
                  >
                    {isMajor ? '4 หมวดย่อย' : `ภาค ${s.part}`}
                  </span>
                </div>

                <div className="mt-2">
                  <span className="text-xs font-bold block leading-tight text-slate-800">
                    {s.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1 line-clamp-1">
                    {meta.desc}
                  </span>
                </div>

                <div className="w-full pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-blue-600">
                  <span>{isMajor ? 'เลือกหมวด &rarr;' : 'เริ่ม &rarr;'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // STEP 2: SELECT MAJOR DISCIPLINE (วิชาเอก - 4 หมวด)
  // -------------------------------------------------------------
  if (currentStep === 'select_major') {
    return (
      <div className="max-w-md mx-auto px-4 py-5 pb-28 flex flex-col gap-4 animate-fade-in">
        {/* Back Button & Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentStep('select_subject')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 p-2 rounded-xl bg-white border border-slate-200 shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>เปลี่ยนวิชา</span>
          </button>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            วิชาเอก (วิทยาศาสตร์)
          </span>
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-800">เลือกหมวดวิชาเอก</h2>
          <p className="text-xs text-slate-500">แตะหมวดที่ต้องการฝึกฝนเพื่อเข้าสู่การตั้งค่าทันที</p>
        </div>

        {/* All 4 Major Option */}
        <button
          type="button"
          onClick={() => {
            setSelectedTopic('all')
            setCurrentStep('configure')
          }}
          className="w-full p-4 rounded-3xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-md shadow-purple-500/20 flex items-center justify-between active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔬</span>
            <div className="text-left">
              <span className="text-sm font-bold block leading-tight">
                รวมทั้ง 4 หมวดวิชาเอก
              </span>
              <span className="text-[11px] text-purple-100 block mt-0.5">
                ฟิสิกส์ + เคมี + ชีววิทยา + โลกดาราศาสตร์
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-purple-200" />
        </button>

        {/* 4 Dedicated Cards */}
        <div className="grid grid-cols-2 gap-3">
          {majorDisciplines.map((item) => {
            const Icon = item.icon

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedTopic(item.id)
                  setCurrentStep('configure')
                }}
                className={`p-4 rounded-3xl border text-left transition-all flex flex-col justify-between min-h-[135px] active:scale-[0.97] relative shadow-sm ${item.color}`}
              >
                <div className="flex items-start justify-between w-full">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${item.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/90 text-slate-700 border border-slate-200/60 shadow-xs">
                    {item.badge}
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-bold leading-tight">{item.label}</h4>
                  <p className="text-[10px] mt-1 text-slate-500 leading-snug line-clamp-2">
                    {item.sub}
                  </p>
                </div>

                <div className="w-full pt-2 mt-2 border-t border-slate-200/40 flex items-center justify-between text-[10px] font-bold text-slate-700">
                  <span>เลือกหมวดนี้</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // STEP 3: CONFIGURE (จำนวนข้อ, สุ่ม, เริ่มทำข้อสอบ)
  // -------------------------------------------------------------
  return (
    <div className="max-w-md mx-auto px-4 py-5 pb-28 flex flex-col gap-4 animate-fade-in">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (selectedSubjectId === 'kb-major') {
              setCurrentStep('select_major')
            } else {
              setCurrentStep('select_subject')
            }
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 p-2 rounded-xl bg-white border border-slate-200 shadow-sm active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{selectedSubjectId === 'kb-major' ? 'เปลี่ยนหมวดวิชาเอก' : 'เปลี่ยนวิชา'}</span>
        </button>

        <span className="text-xs font-bold text-blue-600">ขั้นตอนสุดท้าย</span>
      </div>

      {/* Selected Subject Banner Card */}
      <div className="bg-white rounded-3xl p-5 border border-blue-200/80 shadow-sm flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-0.5">
            วิชาที่พร้อมฝึก
          </span>
          <h2 className="text-lg font-bold text-slate-800">
            {selectedSubjectId === 'all'
              ? 'รวมทุกหมวดวิชา'
              : selectedSubjectObj?.name}
          </h2>
          {selectedSubjectId === 'kb-major' && (
            <span className="text-xs font-semibold text-purple-700 mt-0.5 block">
              หมวด: {selectedTopic === 'all' ? 'รวมทั้ง 4 หมวดวิชาเอก' : selectedTopic}
            </span>
          )}
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white border border-blue-100 flex items-center justify-center text-2xl shadow-sm">
          {selectedSubjectId === 'all' ? '📚' : subjectMeta[selectedSubjectId]?.icon || '📖'}
        </div>
      </div>

      {/* Question Count Setting */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-800">เลือกจำนวนข้อสอบ</h3>

        <div className="grid grid-cols-4 gap-2">
          {[
            { count: 10, label: '10 ข้อ', desc: 'เร็ว 5 นาที' },
            { count: 20, label: '20 ข้อ', desc: 'เน้นทวน' },
            { count: 50, label: '50 ข้อ', desc: 'จัดเต็ม' },
            { count: 0, label: 'ทั้งหมด', desc: 'ครบชุด' }
          ].map((item) => {
            const isSelected = questionCount === item.count
            return (
              <button
                key={item.count}
                type="button"
                onClick={() => setQuestionCount(item.count)}
                className={`py-3 px-1 rounded-2xl border text-center transition-all flex flex-col items-center justify-center active:scale-[0.97] ${
                  isSelected
                    ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-300'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs font-bold block">{item.label}</span>
                <span
                  className={`text-[9px] block mt-0.5 ${
                    isSelected ? 'text-blue-100 font-normal' : 'text-slate-400'
                  }`}
                >
                  {item.desc}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Shuffle Setting */}
      <div className="bg-white rounded-3xl p-4 px-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Shuffle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">สุ่มลำดับข้อสอบ</span>
            <span className="text-[10px] text-slate-400 block">สลับข้อไม่ให้จำตำแหน่งเดิม</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsShuffle(!isShuffle)}
          className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
            isShuffle ? 'bg-blue-600 justify-end' : 'bg-slate-200 justify-start'
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
        </button>
      </div>

      {/* Big Action Button */}
      <button
        onClick={handleStartPractice}
        disabled={isLoading}
        className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all mt-2"
      >
        <Play className="w-5 h-5 fill-current" />
        <span>{isLoading ? 'กำลังโหลดข้อสอบ...' : 'เริ่มทำข้อสอบ'}</span>
      </button>
    </div>
  )
}
