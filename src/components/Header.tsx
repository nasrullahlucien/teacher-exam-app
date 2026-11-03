import React from 'react'
import { GraduationCap, Database } from 'lucide-react'

interface HeaderProps {
  onOpenBackup: () => void
}

export const Header: React.FC<HeaderProps> = ({ onOpenBackup }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">ติวสอบครูผู้ช่วย</h1>
            <p className="text-[11px] text-slate-500 font-medium">เตรียมพร้อมสู่การบรรจุรับราชการ</p>
          </div>
        </div>

        <button
          onClick={onOpenBackup}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 active:scale-95 transition-all border border-slate-200"
          title="สำรอง / กู้คืนข้อมูล"
        >
          <Database className="w-3.5 h-3.5" />
          <span>สำรองข้อมูล</span>
        </button>
      </div>
    </header>
  )
}
