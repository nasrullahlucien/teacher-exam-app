import React, { useState, useEffect } from 'react'
import {
  Play,
  Sparkles,
  Shuffle,
  Atom,
  FlaskConical,
  Dna,
  Orbit,
  Check
} from 'lucide-react'
import type { Subject, Question } from '../types'
import { fetchSubjects, fetchQuestionsBySubject, fetchAllQuestions } from '../services/dataLoader'
import { PracticeSession } from './PracticeSession'

interface PracticeViewProps {
  initialSubjectId?: string | null
  initialTopic?: string | null
  onClearInitialSubject?: () => void
}

export const PracticeView: React.FC<PracticeViewProps> = ({
  initialSubjectId,
  initialTopic,
  onClearInitialSubject
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all')
  const [topics, setTopics] = useState<string[]>([])
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
        const found = res.find((s) => s.id === initialSubjectId)
        if (found) {
          setSubjectFilterTab(found.part)
        }
        if (initialTopic) {
          setSelectedTopic(initialTopic)
        }
        if (onClearInitialSubject) onClearInitialSubject()
      }
      setIsLoading(false)
    })
  }, [initialSubjectId, initialTopic, onClearInitialSubject])

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
      if (selectedSubjectId !== 'kb-major') {
        setSelectedTopic('all')
      }
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

  // Icons and visual badges for subjects
  const subjectMeta: Record<string, { icon: string; color: string; desc: string }> = {
    'ka-analysis': { icon: '🧮', color: 'from-blue-500/10 to-indigo-500/10 border-blue-200 text-blue-700', desc: 'คณิตศาสตร์ ตรรกะ บทความ' },
    'ka-english': { icon: '🇬🇧', color: 'from-sky-500/10 to-blue-500/10 border-sky-200 text-sky-700', desc: 'Grammar Vocab Reading' },
    'ka-civil': { icon: '🏛️', color: 'from-amber-500/10 to-yellow-500/10 border-amber-200 text-amber-700', desc: 'ระเบียบข้าราชการ จริยธรรม' },
    'kb-teaching': { icon: '🧑‍🏫', color: 'from-emerald-500/10 to-teal-500/10 border-emerald-200 text-emerald-700', desc: 'หลักสูตร จิตวิทยา การประเมิน' },
    'kb-law': { icon: '⚖️', color: 'from-indigo-500/10 to-purple-500/10 border-indigo-200 text-indigo-700', desc: 'พ.ร.บ.การศึกษา คุรุสภา' },
    'kb-reform': { icon: '🚀', color: 'from-rose-500/10 to-pink-500/10 border-rose-200 text-rose-700', desc: 'ยุทธศาสตร์ชาติ จุดเน้น ศธ.' },
    'kb-general': { icon: '🌐', color: 'from-teal-500/10 to-cyan-500/10 border-teal-200 text-teal-700', desc: 'เหตุการณ์ปัจจุบัน เศรษฐกิจ นโยบาย' },
    'kb-major': { icon: '🔬', color: 'from-purple-500/10 to-pink-500/10 border-purple-200 text-purple-700', desc: 'ฟิสิกส์ เคมี ชีวะ โลกดาราศาสตร์' },
  }

  // 4 Major Science Disciplines with enhanced cards
  const majorDisciplines = [
    {
      id: '⚡ ฟิสิกส์',
      label: 'ฟิสิกส์',
      icon: Atom,
      color: 'bg-blue-50/90 hover:bg-blue-100/90 border-blue-200 text-blue-900',
      activeColor: 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-400',
      iconColor: 'text-blue-600',
      sub: 'การเคลื่อนที่ แรง งาน พลังงาน ไฟฟ้า',
      badge: '⚡ Physics'
    },
    {
      id: '🧪 เคมี',
      label: 'เคมี',
      icon: FlaskConical,
      color: 'bg-emerald-50/90 hover:bg-emerald-100/90 border-emerald-200 text-emerald-900',
      activeColor: 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400',
      iconColor: 'text-emerald-600',
      sub: 'สสาร ตารางธาตุ พันธะ กรด-เบส',
      badge: '🧪 Chemistry'
    },
    {
      id: '🧬 ชีววิทยา',
      label: 'ชีววิทยา',
      icon: Dna,
      color: 'bg-purple-50/90 hover:bg-purple-100/90 border-purple-200 text-purple-900',
      activeColor: 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20 ring-2 ring-purple-400',
      iconColor: 'text-purple-600',
      sub: 'เซลล์ ออร์แกเนลล์ พันธุศาสตร์ เมนเดล',
      badge: '🧬 Biology'
    },
    {
      id: '🪐 โลก ดาราศาสตร์ และอวกาศ',
      label: 'โลก ดาราศาสตร์',
      icon: Orbit,
      color: 'bg-amber-50/90 hover:bg-amber-100/90 border-amber-200 text-amber-900',
      activeColor: 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/20 ring-2 ring-amber-400',
      iconColor: 'text-amber-600',
      sub: 'ชั้นบรรยากาศ น้ำเกิดน้ำตาย อวกาศ',
      badge: '🪐 Earth & Space'
    }
  ]

  const filteredSubjects = subjects.filter(
    (s) => subjectFilterTab === 'all' || s.part === subjectFilterTab
  )

  const selectedSubjectObj = subjects.find((s) => s.id === selectedSubjectId)

  return (
    <div className="max-w-md mx-auto px-4 py-5 pb-28 flex flex-col gap-5 animate-fade-in">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <h2 className="text-xl font-bold text-slate-800">ฝึกทำข้อสอบ</h2>
        </div>
        <p className="text-xs text-slate-500">
          เลือกวิชาและตั้งค่าจำนวนข้อ ตอบแล้วมีเฉลยละเอียดทันที
        </p>
      </div>

      {/* Step 1: Subject Selection */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
              1
            </div>
            <h3 className="text-sm font-bold text-slate-800">เลือกหมวดวิชา</h3>
          </div>

          {/* Part Filter Tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setSubjectFilterTab('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                subjectFilterTab === 'all'
                  ? 'bg-white text-slate-800 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setSubjectFilterTab('ก')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                subjectFilterTab === 'ก'
                  ? 'bg-white text-blue-700 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ภาค ก
            </button>
            <button
              type="button"
              onClick={() => setSubjectFilterTab('ข')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                subjectFilterTab === 'ข'
                  ? 'bg-white text-emerald-700 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ภาค ข
            </button>
          </div>
        </div>

        {/* All Subjects Quick Option */}
        {subjectFilterTab === 'all' && (
          <button
            type="button"
            onClick={() => {
              setSelectedSubjectId('all')
              setSelectedTopic('all')
            }}
            className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between active:scale-[0.99] ${
              selectedSubjectId === 'all'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📚</span>
              <div>
                <span className="text-xs font-bold block leading-tight">
                  รวมทุกหมวดวิชา (คละข้อสอบ ภาค ก + ภาค ข)
                </span>
                <span
                  className={`text-[10px] block mt-0.5 ${
                    selectedSubjectId === 'all' ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  สุ่มข้อสอบจากทุกหมวดเพื่อจำลองความพร้อมรอบด้าน
                </span>
              </div>
            </div>
            {selectedSubjectId === 'all' && (
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </button>
        )}

        {/* Subject Grid Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {filteredSubjects.map((s) => {
            const isSelected = selectedSubjectId === s.id
            const meta = subjectMeta[s.id] || { icon: '📖', desc: '' }

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedSubjectId(s.id)
                  setSelectedTopic('all')
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all min-h-[96px] active:scale-[0.98] relative overflow-hidden ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/90 text-blue-900 shadow-md shadow-blue-500/10 ring-2 ring-blue-500'
                    : 'border-slate-200/90 bg-slate-50/60 hover:bg-slate-100/80 text-slate-700'
                }`}
              >
                <div className="flex items-start justify-between w-full">
                  <span className="text-xl">{meta.icon}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      s.part === 'ก'
                        ? 'bg-blue-100/80 text-blue-700'
                        : 'bg-emerald-100/80 text-emerald-700'
                    }`}
                  >
                    ภาค {s.part}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold block leading-tight text-slate-800">
                    {s.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1 line-clamp-1">
                    {meta.desc}
                  </span>
                </div>

                {isSelected && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
                    <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Selected Subject Banner */}
        {selectedSubjectId !== 'all' && (
          <div className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
            <span>
              วิชาที่เลือก: <b className="text-slate-800">{selectedSubjectObj?.name}</b>
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedSubjectId('all')
                setSelectedTopic('all')
              }}
              className="text-blue-600 font-semibold text-[11px] hover:underline"
            >
              เปลี่ยนเป็นรวมทุกวิชา
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Special 4 Science Disciplines for Major Subject */}
      {selectedSubjectId === 'kb-major' && (
        <div className="bg-white rounded-3xl p-5 border border-purple-200/80 shadow-sm flex flex-col gap-3.5 animate-fade-in bg-gradient-to-b from-purple-50/30 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                2
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">เลือกหมวดวิชาเอก</h3>
                <p className="text-[11px] text-slate-500">
                  แตะเลือกหมวดที่ต้องการ หรือแตะ &quot;รวมทั้ง 4 หมวด&quot;
                </p>
              </div>
            </div>

            {selectedTopic !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedTopic('all')}
                className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 hover:bg-purple-100 active:scale-95 transition-all"
              >
                รวมทั้ง 4 หมวด
              </button>
            )}
          </div>

          {/* 4 Beautiful Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {majorDisciplines.map((item) => {
              const isSelected = selectedTopic === item.id
              const Icon = item.icon

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedTopic(isSelected ? 'all' : item.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[105px] active:scale-[0.98] relative overflow-hidden ${
                    isSelected ? item.activeColor : item.color
                  }`}
                >
                  <div className="flex items-start justify-between w-full">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-white shadow-sm ' + item.iconColor
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-white/80 text-slate-600 border border-slate-200/50'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <div className="mt-2">
                    <h4 className="text-xs font-bold leading-tight">{item.label}</h4>
                    <p
                      className={`text-[10px] mt-0.5 leading-snug line-clamp-1 ${
                        isSelected ? 'text-white/80' : 'text-slate-500'
                      }`}
                    >
                      {item.sub}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-sm">
                      <Check className="w-2.5 h-2.5 text-blue-600 stroke-[3]" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="text-center pt-1">
            <span className="text-[11px] text-slate-500 font-medium">
              กำลังเลือก: <b className="text-purple-700">{selectedTopic === 'all' ? 'รวมทั้ง 4 หมวด (ฟิสิกส์ เคมี ชีวะ โลกดาราศาสตร์)' : selectedTopic}</b>
            </span>
          </div>
        </div>
      )}

      {/* Subtopics for other subjects */}
      {selectedSubjectId !== 'all' && selectedSubjectId !== 'kb-major' && topics.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col gap-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">เลือกหัวข้อย่อย</h3>
            {selectedTopic !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedTopic('all')}
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                เลือกทั้งหมด
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedTopic('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedTopic === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทุกหัวข้อย่อย
            </button>
            {topics.map((t) => {
              const isSelected = selectedTopic === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTopic(isSelected ? 'all' : t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3: Question Count & Settings */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
            {selectedSubjectId === 'kb-major' ? '3' : '2'}
          </div>
          <h3 className="text-sm font-bold text-slate-800">จำนวนข้อและการสุ่ม</h3>
        </div>

        {/* Count Selector */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { count: 10, label: '10 ข้อ', desc: 'ด่วน 5 นาที' },
            { count: 20, label: '20 ข้อ', desc: 'เน้นทบทวน' },
            { count: 50, label: '50 ข้อ', desc: 'ซ้อมจัดเต็ม' },
            { count: 0, label: 'ทั้งหมด', desc: 'ครบทุกข้อ' }
          ].map((item) => {
            const isSelected = questionCount === item.count
            return (
              <button
                key={item.count}
                type="button"
                onClick={() => setQuestionCount(item.count)}
                className={`py-2.5 px-1.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center active:scale-[0.98] ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm ring-2 ring-blue-500'
                    : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs font-bold block">{item.label}</span>
                <span
                  className={`text-[9px] block mt-0.5 ${
                    isSelected ? 'text-blue-600 font-medium' : 'text-slate-400'
                  }`}
                >
                  {item.desc}
                </span>
              </button>
            )
          })}
        </div>

        {/* Shuffle Option */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Shuffle className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-700 block leading-tight">
                สุ่มลำดับข้อสอบ
              </span>
              <span className="text-[10px] text-slate-400 block">
                สลับข้อไม่ให้จำตำแหน่งคำตอบเดิม
              </span>
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

        {/* Big Start Button */}
        <button
          onClick={handleStartPractice}
          disabled={isLoading}
          className="w-full mt-2 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isLoading ? 'กำลังโหลดข้อสอบ...' : 'เริ่มฝึกทำข้อสอบทันที'}</span>
        </button>
      </div>

      {/* Helpful Tip */}
      <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-blue-800">
          <b>ทริคการติว:</b> ทำข้อสอบแล้วมีเฉลยให้ทันที หากตอบผิดระบบจะบันทึกเข้า <b>สมุดข้อผิด</b> ให้ทบทวนซ้ำจนตอบถูก 2 ครั้งติดเพื่อความแม่นยำ
        </p>
      </div>
    </div>
  )
}
