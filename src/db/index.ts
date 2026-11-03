import Dexie, { type Table } from 'dexie'
import type { MistakeRecord, ExamHistoryRecord, ReadingChecklistRecord, Question } from '../types'

export class ExamDatabase extends Dexie {
  mistakes!: Table<MistakeRecord, number>
  examHistory!: Table<ExamHistoryRecord, number>
  readingChecklist!: Table<ReadingChecklistRecord, string>

  constructor() {
    super('TeacherExamDB')
    this.version(1).stores({
      mistakes: '++id, &questionId, subjectId, topic, consecutiveCorrect, lastAttemptDate',
      examHistory: '++id, mode, subjectId, date',
      readingChecklist: '&chapterId, isRead'
    })
  }
}

export const db = new ExamDatabase()

/**
 * บันทึกผลการตอบข้อสอบ:
 * - ถ้าตอบผิด: เพิ่มเข้าสมุดข้อผิด (หรือรีเซ็ตคะแนนต่อเนื่องเป็น 0)
 * - ถ้าตอบถูก: หากข้อนี้อยู่ในสมุดข้อผิด ให้นับบวก 1 ครั้ง ถ้าถูกติดกัน 2 ครั้ง จะนำออกจากสมุดข้อผิดอัตโนมัติ
 */
export async function recordAnswer(question: Question, isCorrect: boolean): Promise<{ removedFromMistakes: boolean; currentConsecutive: number }> {
  const existing = await db.mistakes.where('questionId').equals(question.id).first()
  const now = new Date().toISOString()
  let removedFromMistakes = false
  let currentConsecutive = 0

  if (!isCorrect) {
    if (existing) {
      await db.mistakes.update(existing.id!, {
        consecutiveCorrect: 0,
        totalWrong: (existing.totalWrong || 1) + 1,
        lastAttemptDate: now
      })
    } else {
      await db.mistakes.add({
        questionId: question.id,
        subjectId: question.subject,
        topic: question.topic,
        consecutiveCorrect: 0,
        totalWrong: 1,
        lastAttemptDate: now
      })
    }
  } else {
    if (existing) {
      const nextConsecutive = existing.consecutiveCorrect + 1
      currentConsecutive = nextConsecutive
      if (nextConsecutive >= 2) {
        // ตอบถูก 2 ครั้งติด -> ปลดออกจากสมุดข้อผิด
        await db.mistakes.delete(existing.id!)
        removedFromMistakes = true
      } else {
        await db.mistakes.update(existing.id!, {
          consecutiveCorrect: nextConsecutive,
          lastAttemptDate: now
        })
      }
    }
  }

  return { removedFromMistakes, currentConsecutive }
}

/**
 * บันทึกสรุปผลการทำข้อสอบ (ประวัติ)
 */
export async function saveExamHistory(record: Omit<ExamHistoryRecord, 'id'>): Promise<number> {
  return await db.examHistory.add(record)
}

/**
 * สลับสถานะการอ่านบทเรียน
 */
export async function toggleChapterRead(chapterId: string): Promise<boolean> {
  const existing = await db.readingChecklist.get(chapterId)
  const isNowRead = !existing?.isRead
  await db.readingChecklist.put({
    chapterId,
    isRead: isNowRead,
    completedAt: isNowRead ? new Date().toISOString() : undefined
  })
  return isNowRead
}

/**
 * ส่งออกข้อมูลทั้งหมดเป็น JSON
 */
export async function exportAllData(): Promise<string> {
  const mistakes = await db.mistakes.toArray()
  const examHistory = await db.examHistory.toArray()
  const readingChecklist = await db.readingChecklist.toArray()

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      mistakes,
      examHistory,
      readingChecklist
    }
  }

  return JSON.stringify(backup, null, 2)
}

/**
 * นำเข้าข้อมูลสำรองจากไฟล์ JSON
 */
export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(jsonString)
    if (!parsed || !parsed.data) {
      throw new Error('รูปแบบไฟล์ข้อมูลสำรองไม่ถูกต้อง')
    }

    await db.transaction('rw', db.mistakes, db.examHistory, db.readingChecklist, async () => {
      await db.mistakes.clear()
      await db.examHistory.clear()
      await db.readingChecklist.clear()

      if (Array.isArray(parsed.data.mistakes)) {
        await db.mistakes.bulkAdd(parsed.data.mistakes)
      }
      if (Array.isArray(parsed.data.examHistory)) {
        await db.examHistory.bulkAdd(parsed.data.examHistory)
      }
      if (Array.isArray(parsed.data.readingChecklist)) {
        await db.readingChecklist.bulkAdd(parsed.data.readingChecklist)
      }
    })

    return true
  } catch (error) {
    console.error('Failed to import data:', error)
    throw error
  }
}
