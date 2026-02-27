'use client'

import { useState } from 'react'
import Link from 'next/link'
import InterviewTab from '@/components/InterviewTab'
import CulturalFitTab from '@/components/CulturalFitTab'

const BONDY_ORANGE = '#F47C20'

export default function InternalPage() {
  const [activeTab, setActiveTab] = useState('interview')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3 group">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg"
                  style={{ background: `linear-gradient(135deg, ${BONDY_ORANGE}, #e86c10)` }}
                >
                  B
                </div>
                <div>
                  <p className="text-white/50 text-xs group-hover:text-white/80 transition-colors">← Bondy Tools</p>
                  <h1 className="text-white font-bold text-lg leading-tight">Bondy Team</h1>
                </div>
              </Link>
            </div>
            <div className="flex gap-1 bg-white/10 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('interview')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'interview' ? 'bg-white text-gray-900' : 'text-white/70 hover:text-white'
                }`}
              >
                📋 Screening Report
              </button>
              <button
                onClick={() => setActiveTab('cultural')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'cultural' ? 'bg-white text-gray-900' : 'text-white/70 hover:text-white'
                }`}
              >
                🎯 Cultural Fit
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {activeTab === 'interview' ? <InterviewTab /> : <CulturalFitTab />}
      </div>
    </div>
  )
}
