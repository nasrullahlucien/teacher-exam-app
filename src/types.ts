export interface Subject {
  id: string
  part: 'ก' | 'ข'
  name: string
}

export interface Question {
  id: string
  subject: string
  topic: string
  discipline?: string
  question: string
  choices: string[]
  answer: number // 0-based index
  explanation: string
  source: string
}

export interface Chapter {
  id: string
  subject: string
  name: string
  pages: number
}

export interface MistakeRecord {
  id?: number
  questionId: string
  subjectId: string
  topic: string
  consecutiveCorrect: number
  totalWrong: number
  lastAttemptDate: string
}

export interface ExamQuestionDetail {
  questionId: string
  subjectId: string
  topic: string
  userAnswer: number | null
  correctAnswer: number
  isCorrect: boolean
  isFlagged?: boolean
}

export interface ExamHistoryRecord {
  id?: number
  mode: 'practice' | 'mock'
  subjectId: string // 'all' or subject ID
  score: number
  totalQuestions: number
  percentage: number
  timeSpentSeconds: number
  date: string
  details?: ExamQuestionDetail[]
  subjectBreakdown?: Record<string, { total: number; correct: number; name: string }>
  topicBreakdown?: Record<string, { total: number; correct: number }>
}

export interface DailyActivityRecord {
  date: string // YYYY-MM-DD
  questionsAnswered: number
  examsCompleted: number
  goal: number
  goalMet: boolean
}

export interface UserSettings {
  id: string // 'user_settings'
  targetExamDate?: string
  dailyQuestionGoal: number
}

export interface ReadingChecklistRecord {
  chapterId: string
  isRead: boolean
  completedAt?: string
}

export interface QuestionAnswerState {
  selectedIndex: number | null
  isSubmitted: boolean
}
