import Dexie, { type Table } from 'dexie'
import type {
  MistakeRecord,
  ExamHistoryRecord,
  ReadingChecklistRecord,
  Question,
  DailyActivityRecord,
  UserSettings
} from '../types'

export class ExamDatabase extends Dexie {
  mistakes!: Table<MistakeRecord, number>
  examHistory!: Table<ExamHistoryRecord, number>
  readingChecklist!: Table<ReadingChecklistRecord, string>
  dailyActivity!: Table<DailyActivityRecord, string>
  userSettings!: Table<UserSettings, string>

  constructor() {
    super('TeacherExamDB')
    this.version(1).stores({
      mistakes: '++id, &questionId, subjectId, topic, consecutiveCorrect, lastAttemptDate',
      examHistory: '++id, mode, subjectId, date',
      readingChecklist: '&chapterId, isRead'
    })

    this.version(2).stores({
      mistakes: '++id, &questionId, subjectId, topic, consecutiveCorrect, lastAttemptDate',
      examHistory: '++id, mode, subjectId, date',
      readingChecklist: '&chapterId, isRead',
      dailyActivity: '&date, goalMet',
      userSettings: '&id'
    })
  }
}

export const db = new ExamDatabase()

/**
 * ดึงการตั้งค่าผู้ใช้ (วันสอบจริง, เป้าหมายรายวัน)
 */
export async function getUserSettings(): Promise<UserSettings> {
  const settings = await db.userSettings.get('current')
  if (settings) return settings

  const defaultSettings: UserSettings = {
    id: 'current',
    targetExamDate: undefined,
    dailyQuestionGoal: 30
  }
  await db.userSettings.put(defaultSettings)
  return defaultSettings
}

/**
 * บันทึกการตั้งค่าผู้ใช้
 */
export async function saveUserSettings(settings: Partial<UserSettings>): Promise<void> {
  const current = await getUserSettings()
  await db.userSettings.put({
    ...current,
    ...settings,
    id: 'current'
  })
}

/**
 * บันทึกกิจกรรมประจำวัน (Daily Activity)
 */
export async function recordDailyActivity(questionsCount: number, isExamCompleted = false): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const settings = await getUserSettings()
  const existing = await db.dailyActivity.get(today)

  const currentQuestions = (existing?.questionsAnswered || 0) + questionsCount
  const currentExams = (existing?.examsCompleted || 0) + (isExamCompleted ? 1 : 0)
  const goal = settings.dailyQuestionGoal || 30
  const goalMet = currentQuestions >= goal

  await db.dailyActivity.put({
    date: today,
    questionsAnswered: currentQuestions,
    examsCompleted: currentExams,
    goal,
    goalMet
  })
}

/**
 * คำนวณจำนวนวันทำข้อสอบต่อเนื่อง (Streak Days)
 */
export async function getStreakCount(): Promise<number> {
  const activities = await db.dailyActivity.toArray()
  const activityMap = new Map<string, DailyActivityRecord>()
  activities.forEach((a) => activityMap.set(a.date, a))

  let streak = 0
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  const todayRecord = activityMap.get(todayStr)
  let checkDate = new Date()

  // ถ้าวันนี้ทำครบเป้าหมาย นับเริ่มต้นจากวันนี้
  // ถ้าวันนี้ยังไม่ครบ ให้ตรวจว่าเมื่อวานทำครบไหมเพื่อรักษาสตรีคไว้
  if (todayRecord && todayRecord.goalMet) {
    streak++
    checkDate.setDate(checkDate.getDate() - 1)
  } else {
    checkDate.setDate(checkDate.getDate() - 1)
  }

  while (true) {
    const dStr = checkDate.toISOString().split('T')[0]
    const rec = activityMap.get(dStr)
    if (rec && rec.goalMet) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

/**
 * บันทึกผลการตอบข้อสอบ:
 * - ถ้าตอบผิด: เพิ่มเข้าสมุดข้อผิด (หรือรีเซ็ตคะแนนต่อเนื่องเป็น 0)
 * - ถ้าตอบถูก: หากข้อนี้อยู่ในสมุดข้อผิด ให้นับบวก 1 ครั้ง ถ้าถูกติดกัน 2 ครั้ง จะนำออกจากสมุดข้อผิดอัตโนมัติ
 */
export async function recordAnswer(
  question: Question,
  isCorrect: boolean
): Promise<{ removedFromMistakes: boolean; currentConsecutive: number }> {
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

  // อัปเดตกิจกรรมรายวัน +1 ข้อ
  await recordDailyActivity(1, false)

  return { removedFromMistakes, currentConsecutive }
}

/**
 * บันทึกสรุปผลการทำข้อสอบ (ประวัติ)
 */
export async function saveExamHistory(record: Omit<ExamHistoryRecord, 'id'>): Promise<number> {
  const id = await db.examHistory.add(record)
  // บันทึกกิจกรรมรายวันว่าทำข้อสอบจบ 1 ครั้ง
  await recordDailyActivity(0, true)
  return id
}

/**
 * วิเคราะห์ 5 อันดับหัวข้อที่อ่อนที่สุด
 */
export async function getWeakestTopics(limit = 5): Promise<{ topic: string; subjectId: string; wrongCount: number }[]> {
  const mistakes = await db.mistakes.toArray()
  const topicMap = new Map<string, { topic: string; subjectId: string; wrongCount: number }>()

  mistakes.forEach((m) => {
    const key = `${m.subjectId}:::${m.topic}`
    const existing = topicMap.get(key)
    if (existing) {
      existing.wrongCount += m.totalWrong || 1
    } else {
      topicMap.set(key, {
        topic: m.topic,
        subjectId: m.subjectId,
        wrongCount: m.totalWrong || 1
      })
    }
  })

  const sorted = Array.from(topicMap.values()).sort((a, b) => b.wrongCount - a.wrongCount)
  return sorted.slice(0, limit)
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
  const dailyActivity = await db.dailyActivity.toArray()
  const userSettings = await db.userSettings.toArray()

  const backup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      mistakes,
      examHistory,
      readingChecklist,
      dailyActivity,
      userSettings
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

    await db.transaction('rw', db.mistakes, db.examHistory, db.readingChecklist, db.dailyActivity, db.userSettings, async () => {
      await db.mistakes.clear()
      await db.examHistory.clear()
      await db.readingChecklist.clear()
      await db.dailyActivity.clear()
      await db.userSettings.clear()

      if (Array.isArray(parsed.data.mistakes)) {
        await db.mistakes.bulkAdd(parsed.data.mistakes)
      }
      if (Array.isArray(parsed.data.examHistory)) {
        await db.examHistory.bulkAdd(parsed.data.examHistory)
      }
      if (Array.isArray(parsed.data.readingChecklist)) {
        await db.readingChecklist.bulkAdd(parsed.data.readingChecklist)
      }
      if (Array.isArray(parsed.data.dailyActivity)) {
        await db.dailyActivity.bulkAdd(parsed.data.dailyActivity)
      }
      if (Array.isArray(parsed.data.userSettings)) {
        await db.userSettings.bulkAdd(parsed.data.userSettings)
      }
    })

    return true
  } catch (error) {
    console.error('Failed to import data:', error)
    throw error
  }
}
