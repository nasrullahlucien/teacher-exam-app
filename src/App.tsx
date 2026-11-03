import { useState } from 'react'
import { Header } from './components/Header'
import { BottomNav, type NavTab } from './components/BottomNav'
import { Dashboard } from './components/Dashboard'
import { PracticeView } from './components/PracticeView'
import { MistakesView } from './components/MistakesView'
import { ReadingChecklistView } from './components/ReadingChecklistView'
import { BackupModal } from './components/BackupModal'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [isBackupOpen, setIsBackupOpen] = useState(false)

  // Live count of pending mistakes for the bottom navigation badge
  const mistakeCount = useLiveQuery(async () => {
    return await db.mistakes.count()
  }, []) ?? 0

  const handleNavigate = (tab: NavTab, subjectId?: string) => {
    if (subjectId) {
      setSelectedSubjectId(subjectId)
    }
    setCurrentTab(tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Top Header */}
      <Header onOpenBackup={() => setIsBackupOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
        {currentTab === 'practice' && (
          <PracticeView
            initialSubjectId={selectedSubjectId}
            onClearInitialSubject={() => setSelectedSubjectId(null)}
          />
        )}
        {currentTab === 'mistakes' && <MistakesView />}
        {currentTab === 'checklist' && <ReadingChecklistView />}
      </main>

      {/* Bottom Mobile Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setSelectedSubjectId(null)
          setCurrentTab(tab)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        mistakeCount={mistakeCount}
      />

      {/* Backup & Restore Modal */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onDataChanged={() => {
          // Re-render handled reactively by Dexie hooks
        }}
      />
    </div>
  )
}

export default App
