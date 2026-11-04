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
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Subject, Question, LastPracticeInfo } from '../types'
import { fetchSubjects, fetchQuestionsBySubject, fetchAllQuestions } from '../services/dataLoader'
import { PracticeSession } from './PracticeSession'

interface PracticeViewProps {
  initialSubjectId?: string | null
  initialTopic?: string | null
  onClearInitialSubject?: () => void
}

type Step = 'select_subject' | 'select_major_discipline' | 'select_major_subtopic' | 'configure'

// Topics directly from สารบัญวิชาเอก.md
export const MAJOR_SYLLABUS_TOPICS: Record<string, string[]> = {
  '⚡ ฟิสิกส์': [
    '1. ธรรมชาติของฟิสิกส์ ปริมาณทางฟิสิกส์ หน่วย และ การวัด',
    '2. แรงในชีวิตประจำวัน (แรงลัพธ์, แรงเสียดทาน...)',
    '3. สนามไฟฟ้า สนามแม่เหล็ก และ สนามโน้มถ่วง',
    '4. การเคลื่อนที่ 1 มิติ',
    '5. การเคลื่อนที่ 2 มิติ (วงกลม, ซิมเปิลฮาร์มอนิก, โพรเจคไทล์)',
    '6. งาน และกำลัง',
    '7. พลังงานศักย์ พลังงานจลน์ และพลังงานกล',
    '8. พลังงานความร้อน',
    '9. คลื่นกล และ คลื่นแม่เหล็กไฟฟ้า',
    '10. คลื่นแสง ทัศนอุปกรณ์ และการมองเห็นของดวงตา',
    '11. ไฟฟ้า'
  ],
  '🧪 เคมี': [
    '1. เคมีพื้นฐาน สารในชีวิตประจำวัน',
    '2. สารละลายและร้อยละความเข้มข้น',
    '3. การแยกสารผสม',
    '4. ปฏิกิริยาเคมีในชีวิตประจำวัน',
    '5. กรด-เบส',
    '6. โครงสร้างอะตอม และสมบัติของธาตุตามตารางธาตุ',
    '7. โมล และ ปริมาณสารสัมพันธ์',
    '8. กัมมันตภาพรังสี และ ครึ่งชีวิต',
    '9. โครงสร้างของวัสดุ และ พอลิเมอร์',
    '10. สารชีวโมเลกุลของสิ่งมีชีวิต'
  ],
  '🧬 ชีววิทยา': [
    '1. เซลล์ และ การลำเลียงสารผ่านเซลล์',
    '2. การแบ่งเซลล์',
    '3. การหายใจระดับเซลล์',
    '4. Taxonomy และ ความหลากหลายทางชีวภาพ',
    '5. ระบบนิเวศ และ สิ่งแวดล้อม',
    '6. ระบบร่างกายของสัตว์',
    '7. ระบบร่างกายของมนุษย์',
    '8. ความรู้เรื่องพืช'
  ],
  '🪐 โลก ดาราศาสตร์ และอวกาศ': [
    '1. โครงสร้างของโลก และ การเปลี่ยนแปลงของเปลือกโลก',
    '2. ทรัพยากรณ์ - ดิน',
    '3. ทรัพยากรณ์ - หินและแร่ธาตุ',
    '4. ทรัพยากรณ์ - น้ำ',
    '5. เชื้อเพลิง และ พลังงานทดแทน',
    '6. บรรยากาศของโลก',
    '7. การพยากรณ์อากาศ และ ภัยพิบัติทางธรรมชาติ',
    '8. ปฏิสัมพันธ์ของระบบสุริยะ และ เทคโนโลยีทางอวกาศ'
  ]
}

export function isMatchingTopic(qTopic?: string, targetTopic?: string): boolean {
  if (!qTopic || !targetTopic) return false
  if (qTopic === targetTopic) return true
  // Match prefix before dash/hyphen or parenthesis, e.g. "2. แรงในชีวิตประจำวัน"
  const qClean = qTopic.split(/[-–(]/)[0].trim()
  const targetClean = targetTopic.split(/[-–(]/)[0].trim()
  if (qClean && targetClean && qClean === targetClean) return true

  // Match by number prefix e.g. "2."
  const qNum = qTopic.match(/^(\d+)\./)?.[1]
  const targetNum = targetTopic.match(/^(\d+)\./)?.[1]
  if (qNum && targetNum && qNum === targetNum) return true

  return false
}

export const PracticeView: React.FC<PracticeViewProps> = ({
  initialSubjectId,
  initialTopic,
  onClearInitialSubject
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectQuestionCounts, setSubjectQuestionCounts] = useState<Record<string, number>>({})
  const [lastPractice, setLastPractice] = useState<LastPracticeInfo | null>(null)
  const [currentStep, setCurrentStep] = useState<Step>('select_subject')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all')
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('all')
  const [selectedTopic, setSelectedTopic] = useState<string>('all')
  const [majorQuestions, setMajorQuestions] = useState<Question[]>([])
  const [questionCount, setQuestionCount] = useState<number>(10)
  const [isShuffle, setIsShuffle] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [subjectFilterTab, setSubjectFilterTab] = useState<'all' | 'ก' | 'ข'>('all')
  const [activeSession, setActiveSession] = useState<{
    title: string
    questions: Question[]
  } | null>(null)

  const examHistory = useLiveQuery(() => db.examHistory.toArray(), [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('teacher_exam_last_practice')
      if (saved) {
        setLastPractice(JSON.parse(saved))
      }
    } catch {}

    fetchSubjects().then(async (subjList) => {
      setSubjects(subjList)
      const counts: Record<string, number> = {}

      for (const s of subjList) {
        try {
          const qList = await fetchQuestionsBySubject(s.id)
          counts[s.id] = qList.length
          if (s.id === 'kb-major') {
            setMajorQuestions(qList)
          }
        } catch {
          counts[s.id] = s.id === 'kb-major' ? 811 : 10
        }
      }
      setSubjectQuestionCounts(counts)

      if (initialSubjectId) {
        setSelectedSubjectId(initialSubjectId)
        if (initialSubjectId === 'kb-major') {
          if (initialTopic) {
            if (MAJOR_SYLLABUS_TOPICS[initialTopic]) {
              setSelectedDiscipline(initialTopic)
              setSelectedTopic('all')
              setCurrentStep('select_major_subtopic')
            } else {
              setSelectedTopic(initialTopic)
              setCurrentStep('configure')
            }
          } else {
            setCurrentStep('select_major_discipline')
          }
        } else {
          if (initialTopic) setSelectedTopic(initialTopic)
          setCurrentStep('configure')
        }
        if (onClearInitialSubject) onClearInitialSubject()
      }
      setIsLoading(false)
    })
  }, [initialSubjectId, initialTopic, onClearInitialSubject])

  const getSubjectProgress = (subjectId: string) => {
    const totalQuestions = subjectQuestionCounts[subjectId] || (subjectId === 'kb-major' ? 811 : 10)
    let totalAttempted = 0
    let totalCorrect = 0

    ;(examHistory || []).forEach((h) => {
      if (h.subjectId === subjectId) {
        totalAttempted += h.totalQuestions
        totalCorrect += h.score
      } else if (h.subjectBreakdown && h.subjectBreakdown[subjectId]) {
        totalAttempted += h.subjectBreakdown[subjectId].total
        totalCorrect += h.subjectBreakdown[subjectId].correct
      } else if (h.details && h.details.length > 0) {
        const matches = h.details.filter((d) => d.subjectId === subjectId)
        totalAttempted += matches.length
        totalCorrect += matches.filter((d) => d.isCorrect).length
      }
    })

    const coveragePercent = Math.min(100, Math.round((totalAttempted / totalQuestions) * 100))
    const avgScore = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0

    return { totalQuestions, totalAttempted, coveragePercent, avgScore }
  }

  const getDisciplineStats = (disciplineId: string) => {
    const disciplineQIds = new Set(
      majorQuestions.filter((q) => q.discipline === disciplineId).map((q) => q.id)
    )

    let attempted = 0
    let correct = 0

    ;(examHistory || []).forEach((h) => {
      if (h.details && h.details.length > 0) {
        h.details.forEach((d) => {
          if (disciplineQIds.has(d.questionId)) {
            attempted++
            if (d.isCorrect) correct++
          }
        })
      }
    })

    if (attempted === 0) {
      return {
        isStarted: false,
        statusText: 'ยังไม่เริ่ม',
        avgScore: 0,
        attempted: 0
      }
    }

    const avg = Math.round((correct / attempted) * 100)
    return {
      isStarted: true,
      statusText: `เฉลี่ย ${avg}%`,
      avgScore: avg,
      attempted
    }
  }

  const handleResumePractice = async (saved: LastPracticeInfo) => {
    setIsLoading(true)
    try {
      let pool: Question[] = []
      let title = saved.subjectName

      if (saved.subjectId === 'all') {
        pool = await fetchAllQuestions()
        title = 'ฝึกทำข้อสอบรวมทุกวิชา'
      } else if (saved.subjectId === 'kb-major') {
        pool = await fetchQuestionsBySubject('kb-major')
        title = 'วิชาเอก (วิทยาศาสตร์)'

        if (saved.discipline && saved.discipline !== 'all') {
          pool = pool.filter((q) => q.discipline === saved.discipline)
          title = `${saved.discipline}`
        }

        if (saved.topic && saved.topic !== 'all') {
          pool = pool.filter((q) => isMatchingTopic(q.topic, saved.topic))
          title = `${title} • ${saved.topic}`
        }
      } else {
        pool = await fetchQuestionsBySubject(saved.subjectId)
        title = saved.subjectName

        if (saved.topic && saved.topic !== 'all') {
          pool = pool.filter((q) => isMatchingTopic(q.topic, saved.topic))
          title = `${title} (${saved.topic})`
        }
      }

      if (pool.length === 0) {
        alert('ยังไม่มีข้อสอบในหัวข้อนี้ กำลังทยอยเพิ่มข้อสอบเร็วๆ นี้ครับ')
        setIsLoading(false)
        return
      }

      let prepared = [...pool]
      if (saved.isShuffle) {
        prepared.sort(() => Math.random() - 0.5)
      }

      const count = saved.questionCount || 10
      if (count > 0 && count < prepared.length) {
        prepared = prepared.slice(0, count)
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

  const handleStartPractice = async () => {
    setIsLoading(true)
    try {
      let pool: Question[] = []
      let title = 'ฝึกทำข้อสอบรวมทุกวิชา'

      if (selectedSubjectId === 'all') {
        pool = await fetchAllQuestions()
      } else if (selectedSubjectId === 'kb-major') {
        pool = await fetchQuestionsBySubject('kb-major')
        title = 'วิชาเอก (วิทยาศาสตร์)'

        if (selectedDiscipline !== 'all') {
          pool = pool.filter((q) => q.discipline === selectedDiscipline)
          title = `${selectedDiscipline}`
        }

        if (selectedTopic !== 'all') {
          pool = pool.filter((q) => isMatchingTopic(q.topic, selectedTopic))
          title = `${title} • ${selectedTopic}`
        }
      } else {
        const subj = subjects.find((s) => s.id === selectedSubjectId)
        title = subj?.name || 'ฝึกแยกหมวด'
        pool = await fetchQuestionsBySubject(selectedSubjectId)

        if (selectedTopic !== 'all') {
          pool = pool.filter((q) => isMatchingTopic(q.topic, selectedTopic))
          title = `${title} (${selectedTopic})`
        }
      }

      if (pool.length === 0) {
        alert('ยังไม่มีข้อสอบในหัวข้อนี้ กำลังทยอยเพิ่มข้อสอบเร็วๆ นี้ครับ')
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

      // Save last practice session for quick continue
      const practiceInfo: LastPracticeInfo = {
        subjectId: selectedSubjectId,
        subjectName:
          selectedSubjectId === 'all'
            ? 'รวมทุกวิชา'
            : subjects.find((s) => s.id === selectedSubjectId)?.name || 'วิชาเอก (วิทยาศาสตร์)',
        discipline: selectedDiscipline,
        topic: selectedTopic,
        questionCount,
        isShuffle,
        timestamp: new Date().toISOString()
      }
      try {
        localStorage.setItem('teacher_exam_last_practice', JSON.stringify(practiceInfo))
        setLastPractice(practiceInfo)
      } catch {}

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
      sub: '11 เรื่อง (ธรรมชาติ แรง คลื่น ไฟฟ้า)',
      badge: '⚡ Physics'
    },
    {
      id: '🧪 เคมี',
      label: 'เคมี',
      icon: FlaskConical,
      color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900',
      iconBg: 'bg-emerald-100 text-emerald-600',
      sub: '10 เรื่อง (สาร สารละลาย กรด-เบส ตารางธาตุ)',
      badge: '🧪 Chemistry'
    },
    {
      id: '🧬 ชีววิทยา',
      label: 'ชีววิทยา',
      icon: Dna,
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-900',
      iconBg: 'bg-purple-100 text-purple-600',
      sub: '8 เรื่อง (เซลล์ พันธุศาสตร์ พืช สัตว์)',
      badge: '🧬 Biology'
    },
    {
      id: '🪐 โลก ดาราศาสตร์ และอวกาศ',
      label: 'โลก ดาราศาสตร์',
      icon: Orbit,
      color: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900',
      iconBg: 'bg-amber-100 text-amber-600',
      sub: '8 เรื่อง (เปลือกโลก ดิน หิน น้ำ อวกาศ)',
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

        {/* Quick Resume Card: ทำต่อจากเดิม */}
        {lastPractice && (
          <div className="p-4 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-blue-500/20 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shrink-0">
                ⚡
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/20 text-blue-100">
                    ทำต่อจากเดิม
                  </span>
                  <span className="text-[10px] text-blue-200 truncate">
                    {lastPractice.discipline !== 'all' ? lastPractice.discipline : lastPractice.subjectName}
                  </span>
                </div>
                <h3 className="text-sm font-bold truncate leading-tight">
                  {lastPractice.topic !== 'all' ? lastPractice.topic : 'รวมทุกหัวข้อ'}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleResumePractice(lastPractice)}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white text-blue-700 font-bold text-xs shadow-sm hover:bg-blue-50 active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>ทำต่อ</span>
            </button>
          </div>
        )}

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
              setSelectedDiscipline('all')
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
            const prog = getSubjectProgress(s.id)

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedSubjectId(s.id)
                  setSelectedTopic('all')
                  if (isMajor) {
                    setCurrentStep('select_major_discipline')
                  } else {
                    setSelectedDiscipline('all')
                    setCurrentStep('configure')
                  }
                }}
                className={`p-3.5 rounded-3xl border text-left flex flex-col justify-between min-h-[145px] active:scale-[0.97] transition-all relative overflow-hidden bg-white hover:bg-blue-50/40 border-slate-200/90 shadow-sm hover:border-blue-300 ${
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

                <div className="mt-2 w-full">
                  <span className="text-xs font-bold block leading-tight text-slate-800">
                    {s.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1 line-clamp-1">
                    {meta.desc}
                  </span>

                  {/* Question count & Progress % */}
                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex flex-col gap-1 w-full">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-medium">{prog.totalQuestions} ข้อ</span>
                      <span
                        className={
                          prog.coveragePercent > 0
                            ? 'text-blue-600 font-bold'
                            : 'text-slate-400'
                        }
                      >
                        ทำแล้ว {prog.coveragePercent}%
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          prog.coveragePercent >= 100
                            ? 'bg-emerald-500'
                            : prog.coveragePercent > 0
                            ? 'bg-blue-500'
                            : 'bg-slate-200'
                        }`}
                        style={{ width: `${prog.coveragePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-blue-600">
                  <span>{isMajor ? 'เลือกหมวด →' : 'เริ่ม →'}</span>
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
  if (currentStep === 'select_major_discipline') {
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
          <p className="text-xs text-slate-500">แตะหมวดที่ต้องการเพื่อดูหัวข้อย่อยตามสารบัญ</p>
        </div>

        {/* All 4 Major Option */}
        <button
          type="button"
          onClick={() => {
            setSelectedDiscipline('all')
            setSelectedTopic('all')
            setCurrentStep('configure')
          }}
          className="w-full p-4 rounded-3xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-md shadow-purple-500/20 flex items-center justify-between active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔬</span>
            <div className="text-left">
              <span className="text-sm font-bold block leading-tight">
                รวมทั้ง 4 หมวดวิชาเอก ({majorQuestions.length} ข้อ)
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
            const count = majorQuestions.filter((q) => q.discipline === item.id).length
            const discStats = getDisciplineStats(item.id)

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedDiscipline(item.id)
                  setSelectedTopic('all')
                  setCurrentStep('select_major_subtopic')
                }}
                className={`p-4 rounded-3xl border text-left transition-all flex flex-col justify-between min-h-[160px] active:scale-[0.97] relative shadow-sm ${item.color}`}
              >
                <div className="flex items-start justify-between w-full">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${item.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-xs">
                    {count} ข้อ
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-bold leading-tight">{item.label}</h4>
                  <p className="text-[10px] mt-1 text-slate-500 leading-snug line-clamp-2">
                    {item.sub}
                  </p>

                  {/* Discipline Status Badge */}
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-medium">สถานะ:</span>
                    {discStats.isStarted ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-200 shadow-2xs">
                        เฉลี่ย {discStats.avgScore}% ({discStats.attempted} ข้อ)
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200/60">
                        ยังไม่เริ่ม
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full pt-2 mt-2 border-t border-slate-200/50 flex items-center justify-between text-[10px] font-bold text-slate-700">
                  <span>ดูหัวข้อย่อย →</span>
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
  // STEP 3: SELECT MAJOR SUBTOPIC (ตามสารบัญวิชาเอก.md)
  // -------------------------------------------------------------
  if (currentStep === 'select_major_subtopic') {
    const syllabusList = MAJOR_SYLLABUS_TOPICS[selectedDiscipline] || []
    const disciplineCount = majorQuestions.filter((q) => q.discipline === selectedDiscipline).length

    return (
      <div className="max-w-md mx-auto px-4 py-5 pb-28 flex flex-col gap-4 animate-fade-in">
        {/* Back Button & Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentStep('select_major_discipline')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 p-2 rounded-xl bg-white border border-slate-200 shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>เปลี่ยนหมวด</span>
          </button>

          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            {selectedDiscipline}
          </span>
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-800">เลือกหัวข้อย่อย</h2>
          <p className="text-xs text-slate-500">อ้างอิงตามสารบัญวิชาเอก (แตะเพื่อเริ่มฝึกทำข้อสอบ)</p>
        </div>

        {/* All topics in this discipline option */}
        <button
          type="button"
          onClick={() => {
            setSelectedTopic('all')
            setCurrentStep('configure')
          }}
          className="w-full p-4 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 flex items-center justify-between active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div className="text-left">
              <span className="text-sm font-bold block leading-tight">
                รวมทุกเรื่องในวิชา{selectedDiscipline.replace(/^[^\s]+\s*/, '')}
              </span>
              <span className="text-[11px] text-blue-100 block mt-0.5">
                สุ่มข้อสอบครบทุกเรื่องที่มีในคลัง ({disciplineCount} ข้อ)
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-blue-200" />
        </button>

        {/* Subtopics from สารบัญวิชาเอก */}
        <div className="flex flex-col gap-2">
          {syllabusList.map((topicName, idx) => {
            const count = majorQuestions.filter(
              (q) => q.discipline === selectedDiscipline && isMatchingTopic(q.topic, topicName)
            ).length
            const hasQuestions = count > 0

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedTopic(topicName)
                  setCurrentStep('configure')
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between active:scale-[0.98] ${
                  hasQuestions
                    ? 'bg-white hover:bg-blue-50/50 border-slate-200 text-slate-800 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200/60 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span
                    className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                      hasQuestions
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold leading-snug line-clamp-2">
                    {topicName.replace(/^\d+\.\s*/, '')}
                  </span>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {hasQuestions ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {count} ข้อ
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                      เร็วๆ นี้
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // STEP 4: CONFIGURE (จำนวนข้อ, สุ่ม, เริ่มทำข้อสอบ)
  // -------------------------------------------------------------
  return (
    <div className="max-w-md mx-auto px-4 py-5 pb-28 flex flex-col gap-4 animate-fade-in">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (selectedSubjectId === 'kb-major') {
              if (selectedDiscipline !== 'all') {
                setCurrentStep('select_major_subtopic')
              } else {
                setCurrentStep('select_major_discipline')
              }
            } else {
              setCurrentStep('select_subject')
            }
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 p-2 rounded-xl bg-white border border-slate-200 shadow-sm active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>
            {selectedSubjectId === 'kb-major' ? 'เปลี่ยนหัวข้อ' : 'เปลี่ยนวิชา'}
          </span>
        </button>

        <span className="text-xs font-bold text-blue-600">พร้อมเริ่มฝึก</span>
      </div>

      {/* Selected Subject Banner Card */}
      <div className="bg-white rounded-3xl p-5 border border-blue-200/80 shadow-sm flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-0.5">
            วิชาที่พร้อมฝึก
          </span>
          <h2 className="text-base font-bold text-slate-800">
            {selectedSubjectId === 'all'
              ? 'รวมทุกหมวดวิชา'
              : selectedSubjectId === 'kb-major'
              ? `วิชาเอก: ${selectedDiscipline === 'all' ? 'รวมทั้ง 4 หมวด' : selectedDiscipline}`
              : selectedSubjectObj?.name}
          </h2>
          {selectedSubjectId === 'kb-major' && selectedTopic !== 'all' && (
            <span className="text-xs font-semibold text-purple-700 mt-1 block">
              เรื่อง: {selectedTopic}
            </span>
          )}
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white border border-blue-100 flex items-center justify-center text-2xl shadow-sm shrink-0 ml-2">
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
