'use client'

import { useState, useCallback, useRef } from 'react'

const BONDY_ORANGE = '#F47C20'
const BONDY_DARK = '#1A1A2E'

function CandidateSearch({ onSelect, selectedCandidate }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef(null)

  const search = useCallback((value) => {
    clearTimeout(debounceRef.current)
    if (value.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/candidates?q=${encodeURIComponent(value)}`)
        const data = await res.json()
        setResults(data.candidates || [])
        setShowDropdown(true)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }, 400)
  }, [])

  const handleChange = (e) => {
    setQuery(e.target.value)
    search(e.target.value)
    if (selectedCandidate) onSelect(null)
  }

  const handleSelect = (candidate) => {
    onSelect(candidate)
    setQuery(candidate.name)
    setShowDropdown(false)
    setResults([])
  }

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        Candidato en Airtable <span className="text-gray-400 font-normal">(opcional — para guardar automáticamente)</span>
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder="Buscar por nombre..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
        />
        {loading && (
          <div className="absolute right-3 top-3.5">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
          </div>
        )}
        {selectedCandidate && (
          <div className="absolute right-3 top-3.5 text-green-500 text-sm">✓</div>
        )}
      </div>
      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg max-h-48 overflow-y-auto">
          {results.map((c) => (
            <button
              key={c.id}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
              onClick={() => handleSelect(c)}
            >
              <div className="font-medium text-gray-800 text-sm">{c.name}</div>
              <div className="text-gray-400 text-xs mt-0.5">
                {[c.profile, c.seniority, c.status].filter(Boolean).join(' · ')}
              </div>
            </button>
          ))}
        </div>
      )}
      {selectedCandidate && (
        <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
          ✓ {selectedCandidate.name} seleccionado — el reporte se guardará en Airtable automáticamente
        </div>
      )}
    </div>
  )
}

export default function InterviewTab() {
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [recruiterName, setRecruiterName] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedToAirtable, setSavedToAirtable] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const reportRef = useRef(null)

  const generate = async () => {
    if (!transcript.trim()) return
    setLoading(true)
    setError(null)
    setReport(null)
    setSavedToAirtable(false)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, summary, type: 'screening' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Append recruiter line if provided
      const fullReport = recruiterName
        ? `${data.result}\n\nEntrevista realizada por ${recruiterName}`
        : data.result

      setReport(fullReport)

      // Auto-save to Airtable if candidate selected
      if (selectedCandidate) {
        setSaving(true)
        try {
          await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recordId: selectedCandidate.id, reportHtml: fullReport }),
          })
          setSavedToAirtable(true)
        } catch (e) {
          console.error('Airtable save error:', e)
        } finally {
          setSaving(false)
        }
      }
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
    } catch (e) {
      // Fallback: select the textarea text
      if (reportRef.current) {
        reportRef.current.select()
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    }
  }

  const inputStyle = {
    width: '100%',
    border: '1.5px solid #e5e7eb',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.2s',
    backgroundColor: 'white',
  }

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 shadow-sm">
        <h2 className="font-bold text-gray-800 text-lg">Nueva entrevista</h2>

        <CandidateSearch onSelect={setSelectedCandidate} selectedCandidate={selectedCandidate} />

        <div className="grid grid-cols-2 gap-4">
          {!selectedCandidate && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nombre del candidato <span className="text-gray-400 font-normal">(si no está en Airtable)</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Martín González"
                style={{ ...inputStyle, paddingTop: '10px', paddingBottom: '10px', resize: 'none' }}
              />
            </div>
          )}
          <div className={selectedCandidate ? 'col-span-2' : ''}>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Recruiter <span className="text-gray-400 font-normal">(aparece al pie del reporte)</span>
            </label>
            <input
              type="text"
              value={recruiterName}
              onChange={e => setRecruiterName(e.target.value)}
              placeholder="Ej: Lucía Palomeque"
              style={{ ...inputStyle, paddingTop: '10px', paddingBottom: '10px', resize: 'none' }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Resumen de Gemini <span className="text-gray-400 font-normal">(opcional pero recomendado)</span>
          </label>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="Pegá el resumen que generó Gemini de la entrevista..."
            rows={4}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Transcripción completa <span className="text-red-400">*</span>
          </label>
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
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            ⚠️ {error}
          </div>
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

      {/* Report Output */}
      {report && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                style={{ background: BONDY_ORANGE }}
              >
                ✓
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">Reporte generado</p>
                {saving && <p className="text-xs text-blue-500">Guardando en Airtable...</p>}
                {savedToAirtable && <p className="text-xs text-green-600">✓ Guardado en Airtable</p>}
              </div>
            </div>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: copied ? '#22c55e' : `linear-gradient(135deg, ${BONDY_ORANGE}, #e86c10)` }}
            >
              {copied ? '✓ Copiado!' : '📋 Copiar texto'}
            </button>
          </div>

          {/* Hidden textarea for fallback copy */}
          <textarea
            ref={reportRef}
            value={report}
            readOnly
            style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}
          />

          <div className="p-6">
            <pre
              className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap"
              style={{ fontFamily: 'Inter, sans-serif', lineHeight: 1.8 }}
            >
              {report}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
