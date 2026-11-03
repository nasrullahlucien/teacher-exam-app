import React, { useState, useRef } from 'react'
import { X, Download, Upload, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'
import { exportAllData, importAllData } from '../db'

interface BackupModalProps {
  isOpen: boolean
  onClose: () => void
  onDataChanged: () => void
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose, onDataChanged }) => {
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleExport = async () => {
    try {
      setIsProcessing(true)
      const json = await exportAllData()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const dateStr = new Date().toISOString().split('T')[0]
      const a = document.createElement('a')
      a.href = url
      a.download = `teacher_exam_backup_${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setStatusMessage({
        type: 'success',
        text: 'ส่งออกไฟล์สำรองข้อมูลสำเร็จเรียบร้อย!'
      })
    } catch (err) {
      console.error(err)
      setStatusMessage({
        type: 'error',
        text: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const confirm = window.confirm(
      'การนำเข้าข้อมูลสำรองจะเขียนทับความคืบหน้าปัจจุบัน คุณต้องการดำเนินการต่อหรือไม่?'
    )
    if (!confirm) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    try {
      setIsProcessing(true)
      const text = await file.text()
      await importAllData(text)
      setStatusMessage({
        type: 'success',
        text: 'กู้คืนข้อมูลความคืบหน้าสำเร็จเรียบร้อย!'
      })
      onDataChanged()
    } catch (err) {
      console.error(err)
      setStatusMessage({
        type: 'error',
        text: 'ไฟล์ไม่ถูกต้อง ไม่สามารถกู้คืนข้อมูลได้'
      })
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl border border-slate-100 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">สำรอง / กู้คืนข้อมูล</h2>
              <p className="text-xs text-slate-500">บันทึกความคืบหน้าไว้บนเครื่องของคุณ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleExport}
            disabled={isProcessing}
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-700 font-semibold text-sm transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-blue-600" />
              <span>ส่งออกไฟล์สำรอง (Export JSON)</span>
            </div>
            <span className="text-xs text-blue-500 font-normal">บันทึกเก็บไว้</span>
          </button>

          <label className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all cursor-pointer active:scale-[0.98]">
            <div className="flex items-center gap-2.5">
              <Upload className="w-4 h-4 text-slate-600" />
              <span>กู้คืนข้อมูล (Import JSON)</span>
            </div>
            <span className="text-xs text-slate-400 font-normal">เลือกไฟล์</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
          </label>
        </div>

        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          ข้อมูลการทำข้อสอบทั้งหมดเก็บอยู่ในเครื่องของคุณแบบออฟไลน์
          คุณสามารถส่งออกไฟล์ JSON เพื่อย้ายไปใช้งานบนอุปกรณ์อื่นได้ทุกเมื่อ
        </p>
      </div>
    </div>
  )
}
