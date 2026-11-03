import React from 'react'
import { Home, BookOpen, AlertCircle, CheckSquare } from 'lucide-react'

export type NavTab = 'dashboard' | 'practice' | 'mistakes' | 'checklist'

interface BottomNavProps {
  currentTab: NavTab
  onSelectTab: (tab: NavTab) => void
  mistakeCount: number
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  mistakeCount
}) => {
  const tabs = [
    { id: 'dashboard' as NavTab, label: 'หน้าหลัก', icon: Home },
    { id: 'practice' as NavTab, label: 'ฝึกข้อสอบ', icon: BookOpen },
    { id: 'mistakes' as NavTab, label: 'สมุดข้อผิด', icon: AlertCircle, badge: mistakeCount },
    { id: 'checklist' as NavTab, label: 'เช็กลิสต์', icon: CheckSquare }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 safe-area-pb">
      <div className="max-w-md mx-auto grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = currentTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                isActive
                  ? 'text-blue-600 font-semibold'
                  : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center ring-2 ring-white">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-none tracking-tight">{tab.label}</span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
