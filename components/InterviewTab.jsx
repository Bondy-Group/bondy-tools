'use client'

import { useState, useRef } from 'react'

const BONDY_ORANGE = '#F47C20'

const inputStyle = {
  width: '100%',
  border: '1.5px solid #e5e7eb',
  borderRadius: '12px',
  padding: '12px 16px',
  fontSize: '14px',
  outline: 'none',
  resize: 'vertical',
  fontFamily: 'Inter, sans-serif',
  backgroundColor: 'white',
}

const Label = ({ children }) => (
  <label className="block text-sm font-semibold text-gray-700 mb-1">{children}</label>
)
const Muted = ({ children }) => (
  <span className="text-gray-400 font-normal">{children}</span>
)

export default function InterviewTab() {
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [jd, setJd] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [recruiterName, setRecruiterName] = useState('')
  const [clientName, setClientName] = useState('')
  const [language, setLanguage] = useState('es')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const reportRef = useRef(null)

  const generate = async () => {
    if (!transcript.trim()) return
    setLoading(true)
    setError(null)
    setReport(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          summary,
          jd,
          linkedin,
          language,
          clientName: clientName || null,
          type: 'screening',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const fullReport = recruiterName
        ? `${data.result}\n\n${language === 'en' ? 'Interview conducted by' : 'Entrevista realizada por'} ${recruiterName}`
        : data.result

      setReport(fullReport)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!report) return
    try {
      await navigator.clipboard.writeText(report)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      if (reportRef.current) {
        reportRef.current.select()
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 shadow-sm">
        <h2 className="font-bold text-gray-800 text-lg">Nueva entrevista</h2>

        {/* Row 1: Cliente + Recruiter */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Cliente <Muted>(opcional)</Muted></Label>
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Ej: Uala, Mercado Libre..."
              style={{ ...inputStyle, resize: 'none', paddingTop: '10px', paddingBottom: '10px' }}
            />
          </div>
          <div>
            <Label>Recruiter <Muted>(pie del reporte)</Muted></Label>
            <input
              type="text"
              value={recruiterName}
              onChange={e => setRecruiterName(e.target.value)}
              placeholder="Ej: Lucía Palomeque"
              style={{ ...inputStyle, resize: 'none', paddingTop: '10px', paddingBottom: '10px' }}
            />
          </div>
        </div>

        {/* Row 2: LinkedIn + Language */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>LinkedIn URL <Muted>(opcional)</Muted></Label>
            <input
              type="text"
              value={linkedin}
              onChange={e => setLinkedin(e.target.value)}
              placeholder="linkedin.com/in/..."
              style={{ ...inputStyle, resize: 'none', paddingTop: '10px', paddingBottom: '10px' }}
            />
          </div>
          <div>
            <Label>Idioma del reporte</Label>
            <div className="flex gap-2 mt-1">
              {['es', 'en'].map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                  style={{
                    background: language === lang ? BONDY_ORANGE : 'white',
                    color: language === lang ? 'white' : '#6b7280',
                    borderColor: language === lang ? BONDY_ORANGE : '#e5e7eb',
                  }}
                >
                  {lang === 'es' ? '🇦🇷 Español' : '🇺🇸 English'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Job Description */}
        <div>
          <Label>Job Description <Muted>(opcional — mejora el análisis de match)</Muted></Label>
          <textarea
            value={jd}
            onChange={e => setJd(e.target.value)}
            placeholder="Pegá la job description de la posición..."
            rows={4}
            style={inputStyle}
          />
        </div>

        {/* Gemini summary */}
        <div>
          <Label>Resumen de Gemini <Muted>(opcional pero recomendado)</Muted></Label>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="Pegá el resumen que generó Gemini de la entrevista..."
            rows={3}
            style={inputStyle}
          />
        </div>

        {/* Transcript */}
        <div>
          <Label>Transcripción completa <span className="text-red-400">*</span></Label>
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder="Pegá la transcripción completa de la entrevista..."
            rows={10}
            style={inputStyle}
          />
          {transcript && (
            <p className="text-xs text-gray-400 mt-1">
              {transcript.split(/\s+/).length} palabras · {Math.ceil(transcript.split(/\s+/).length / 130)} min aprox.
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">⚠️ {error}</div>
        )}

        <button
          onClick={generate}
          disabled={!transcript.trim() || loading}
          className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: loading ? '#ccc' : `linear-gradient(135deg, ${BONDY_ORANGE}, #e86c10)` }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Generando reporte...
            </span>
          ) : '✨ Generar Screening Report'}
        </button>
      </div>

      {/* Report output */}
      {report && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: BONDY_ORANGE }}>✓</div>
              <p className="font-semibold text-gray-800 text-sm">Reporte generado</p>
            </div>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: copied ? '#22c55e' : `linear-gradient(135deg, ${BONDY_ORANGE}, #e86c10)` }}
            >
              {copied ? '✓ Copiado!' : '📋 Copiar texto'}
            </button>
          </div>
          <textarea ref={reportRef} value={report} readOnly style={{ position: 'absolute', left: '-9999px' }} />
          <div className="p-6">
            <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Inter, sans-serif', lineHeight: 1.8 }}>
              {report}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
