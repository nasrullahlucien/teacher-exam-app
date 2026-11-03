import type { Subject, Chapter, Question } from '../types'

let cachedSubjects: Subject[] | null = null
let cachedChapters: Chapter[] | null = null
const questionsCache: Record<string, Question[]> = {}

export async function fetchSubjects(): Promise<Subject[]> {
  if (cachedSubjects) return cachedSubjects
  const res = await fetch('/data/subjects.json')
  if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลวิชาได้')
  cachedSubjects = await res.json()
  return cachedSubjects!
}

export async function fetchChapters(): Promise<Chapter[]> {
  if (cachedChapters) return cachedChapters
  const res = await fetch('/data/chapters.json')
  if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลบทอ่านได้')
  cachedChapters = await res.json()
  return cachedChapters!
}

export async function fetchQuestionsBySubject(subjectId: string): Promise<Question[]> {
  if (questionsCache[subjectId]) {
    return questionsCache[subjectId]
  }
  const res = await fetch(`/data/questions/${subjectId}.json`)
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
