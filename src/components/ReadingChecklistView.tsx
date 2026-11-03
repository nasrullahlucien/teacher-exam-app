import React, { useState, useEffect } from 'react'
import { CheckSquare, Square, BookOpen } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, toggleChapterRead } from '../db'
import type { Chapter, Subject } from '../types'
import { fetchChapters, fetchSubjects } from '../services/dataLoader'

export const ReadingChecklistView: React.FC = () => {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])

  // Live query reading records from IndexedDB
  const readingRecords = useLiveQuery(() => db.readingChecklist.toArray(), [])
  const readMap = React.useMemo(() => {
    const map = new Map<string, boolean>()
    readingRecords?.forEach((r) => {
      if (r.isRead) map.set(r.chapterId, true)
    })
    return map
  }, [readingRecords])

  useEffect(() => {
    Promise.all([fetchChapters(), fetchSubjects()]).then(([c, s]) => {
      setChapters(c)
      setSubjects(s)
    })
  }, [])

  const handleToggle = async (chapterId: string) => {
    await toggleChapterRead(chapterId)
  }

  // Calculate global stats
  const totalChapters = chapters.length
  const readChapters = chapters.filter((c) => readMap.has(c.id)).length
  const percentChapters = totalChapters > 0 ? Math.round((readChapters / totalChapters) * 100) : 0

  const totalPages = chapters.reduce((sum, c) => sum + c.pages, 0)
  const readPages = chapters
    .filter((c) => readMap.has(c.id))
    .reduce((sum, c) => sum + c.pages, 0)

  // Group chapters by subject
  const subjectsWithChapters = subjects.map((subj) => {
    const subjChapters = chapters.filter((c) => c.subject === subj.id)
    const subjReadCount = subjChapters.filter((c) => readMap.has(c.id)).length
    const subjPercent =
      subjChapters.length > 0 ? Math.round((subjReadCount / subjChapters.length) * 100) : 0
    return {
      ...subj,
      chapters: subjChapters,
      readCount: subjReadCount,
      percent: subjPercent
    }
  })

  return (
    <div className="max-w-md mx-auto px-4 py-5 pb-24 flex flex-col gap-5 animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-800">เช็กลิสต์การอ่านหนังสือ</h2>
        <p className="text-xs text-slate-500">
          ติดตามบทอ่านที่อ่านจบแล้ว เพื่อความพร้อม 100% ก่อนลงสนามสอบ
        </p>
      </div>

      {/* Global Summary Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-700">ภาพรวมการอ่านทั้งหมด</span>
              <div className="flex items-baseline gap-1 text-slate-800">
                <span className="text-xl font-bold text-blue-600">{readChapters}</span>
                <span className="text-xs text-slate-400">/ {totalChapters} บท</span>
                <span className="text-xs font-bold text-emerald-600 ml-1.5">({percentChapters}%)</span>
              </div>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="text-slate-400 block text-[11px]">อ่านแล้ว</span>
            <span className="font-semibold text-slate-700">
              {readPages} / {totalPages} หน้า
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${percentChapters}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>เหลืออีก {totalChapters - readChapters} บท</span>
          <span>เหลืออีก {totalPages - readPages} หน้า</span>
        </div>
      </div>

      {/* Subject Groups */}
      <div className="flex flex-col gap-4">
        {subjectsWithChapters.map((subj) => {
          if (subj.chapters.length === 0) return null

          return (
            <div
              key={subj.id}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col gap-3"
            >
              {/* Subject Title & Mini Progress */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      subj.part === 'ก'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}
                  >
                    ภาค {subj.part}
                  </span>
                  <h3 className="text-xs font-bold text-slate-800">{subj.name}</h3>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-semibold text-slate-700">
                    {subj.readCount}/{subj.chapters.length}
                  </span>
                  <span className="text-[11px] font-bold text-blue-600">({subj.percent}%)</span>
                </div>
              </div>

              {/* Progress Bar per subject */}
              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${subj.percent}%` }}
                />
              </div>

              {/* Chapter Checkboxes */}
              <div className="flex flex-col gap-2 pt-1">
                {subj.chapters.map((chap) => {
                  const isRead = readMap.has(chap.id)
                  return (
                    <button
                      key={chap.id}
                      type="button"
                      onClick={() => handleToggle(chap.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 active:scale-[0.99] ${
                        isRead
                          ? 'border-emerald-200 bg-emerald-50/40 text-slate-800'
                          : 'border-slate-100 bg-slate-50/50 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isRead ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-xs block leading-snug ${
                            isRead ? 'line-through text-slate-400 font-normal' : 'font-medium text-slate-800'
                          }`}
                        >
                          {chap.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          ความยาว: {chap.pages} หน้า
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
