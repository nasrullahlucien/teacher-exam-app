import type { Subject, Chapter, Question } from '../types'

let cachedSubjects: Subject[] | null = null
let cachedChapters: Chapter[] | null = null
let cachedManifest: Record<string, string[]> | null = null
const questionsCache: Record<string, Question[]> = {}

const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`

export async function fetchSubjects(): Promise<Subject[]> {
  if (cachedSubjects) return cachedSubjects
  const res = await fetch(`${BASE}data/subjects.json`)
  if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลวิชาได้')
  cachedSubjects = await res.json()
  return cachedSubjects!
}

export async function fetchChapters(): Promise<Chapter[]> {
  if (cachedChapters) return cachedChapters
  const res = await fetch(`${BASE}data/chapters.json`)
  if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลบทอ่านได้')
  cachedChapters = await res.json()
  return cachedChapters!
}

export async function fetchManifest(): Promise<Record<string, string[]>> {
  if (cachedManifest) return cachedManifest
  try {
    const res = await fetch(`${BASE}data/questions/manifest.json`)
    if (res.ok) {
      cachedManifest = await res.json()
      return cachedManifest!
    }
  } catch (err) {
    console.warn('Failed to load manifest.json, fallback to single files', err)
  }
  return {}
}

export async function fetchQuestionsBySubject(subjectId: string): Promise<Question[]> {
  if (questionsCache[subjectId]) {
    return questionsCache[subjectId]
  }

  // 1. Check if manifest has subfolder topic files for this subject
  try {
    const manifest = await fetchManifest()
    const fileList = manifest[subjectId]

    if (fileList && Array.isArray(fileList) && fileList.length > 0) {
      const filePromises = fileList.map(async (filePath) => {
        try {
          const res = await fetch(`${BASE}data/questions/${filePath}`)
          if (!res.ok) return []
          const data: Question[] = await res.json()
          return Array.isArray(data) ? data : []
        } catch {
          return []
        }
      })

      const results = await Promise.all(filePromises)
      const combined = results.flat()
      if (combined.length > 0) {
        questionsCache[subjectId] = combined
        return combined
      }
    }
  } catch (e) {
    console.warn(`Manifest load failed for ${subjectId}, trying single file`, e)
  }

  // 2. Fallback to single <subjectId>.json
  const res = await fetch(`${BASE}data/questions/${subjectId}.json`)
  if (!res.ok) throw new Error(`ไม่สามารถโหลดข้อสอบวิชา ${subjectId} ได้`)
  const data: Question[] = await res.json()
  questionsCache[subjectId] = data
  return data
}

export async function fetchAllQuestions(): Promise<Question[]> {
  const subjects = await fetchSubjects()
  const promises = subjects.map(s => fetchQuestionsBySubject(s.id).catch(() => []))
  const results = await Promise.all(promises)
  return results.flat()
}

export async function fetchQuestionsByIds(questionIds: string[]): Promise<Question[]> {
  const all = await fetchAllQuestions()
  const idSet = new Set(questionIds)
  return all.filter(q => idSet.has(q.id))
}
