'use client'

import { useState, useEffect } from 'react'
import { DIMENSION_LABELS } from '@/lib/prompts'

const BONDY_ORANGE = '#F47C20'
const BONDY_DARK = '#1A1A2E'

const DEFAULT_PROFILES = {
  autonomia: 5,
  teamwork: 5,
  comunicacion: 5,
  ambiguedad: 5,
  velocidadCalidad: 5,
  misionAlineacion: 5,
  feedbackCultura: 5,
  remoteFirst: 5,
}

const scoreColor = (score) => {
  if (score >= 8) return '#10b981'
  if (score >= 6) return BONDY_ORANGE
  if (score >= 4) return '#f59e0b'
  return '#ef4444'
}

function RadarChart({ scores }) {
  const dims = Object.keys(DIMENSION_LABELS)
  const n = dims.length
  const cx = 160, cy = 160, r = 120
  
  const getPoint = (i, value) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    const radius = (value / 10) * r
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    }
  }

  const gridLevels = [2, 4, 6, 8, 10]
  const labelPoints = dims.map((_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    return {
      x: cx + (r + 24) * Math.cos(angle),
      y: cy + (r + 24) * Math.sin(angle),
    }
  })

  const scorePoints = dims.map((key, i) => getPoint(i, scores[key] || 0))
  const polygonPath = scorePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  const gridPaths = gridLevels.map(level => {
    const pts = dims.map((_, i) => getPoint(i, level))
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  })

  return (
    <svg width="320" height="320" viewBox="0 0 320 320">
      {/* Grid */}
      {gridPaths.map((path, i) => (
        <path key={i} d={path} fill="none" stroke="#e5e7eb" strokeWidth="1" />
      ))}
      {/* Spokes */}
      {dims.map((_, i) => {
        const p = getPoint(i, 10)
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth="1" />
      })}
      {/* Score polygon */}
      <path d={polygonPath} fill={BONDY_ORANGE} fillOpacity="0.2" stroke={BONDY_ORANGE} strokeWidth="2" />
      {/* Score dots */}
      {scorePoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill={BONDY_ORANGE} />
      ))}
      {/* Labels */}
      {labelPoints.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={p.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="9"
          fill="#6b7280"
          fontFamily="Inter, sans-serif"
        >
          {Object.values(DIMENSION_LABELS)[i].split(' ')[0]}
        </text>
      ))}
    </svg>
  )
}

export default function CulturalFitTab() {
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [profiles, setProfiles] = useState({}) // { clientId: { ...profile config } }
  const [clientConfig, setClientConfig] = useState({ ...DEFAULT_PROFILES })
  const [configNotes, setConfigNotes] = useState({})
  const [showConfig, setShowConfig] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loadingClients, setLoadingClients] = useState(true)

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(data => {
        setClients(data.clients || [])
        setLoadingClients(false)
      })
      .catch(() => setLoadingClients(false))
  }, [])

  const handleClientSelect = (client) => {
    setSelectedClient(client)
    setResult(null)
    if (profiles[client.id]) {
      setClientConfig(profiles[client.id].scores)
      setConfigNotes(profiles[client.id].notes || {})
    } else {
      setClientConfig({ ...DEFAULT_PROFILES })
      setConfigNotes({})
    }
  }

  const saveConfig = () => {
    if (!selectedClient) return
    setProfiles(prev => ({
      ...prev,
      [selectedClient.id]: { scores: clientConfig, notes: configNotes }
    }))
    setShowConfig(false)
  }

  const analyze = async () => {
    if (!transcript.trim() || !selectedClient) return
    setLoading(true)
    setError(null)
    setResult(null)

    const clientProfile = {
      company: selectedClient.name,
      industry: selectedClient.industry,
      dimensions: Object.entries(DIMENSION_LABELS).reduce((acc, [key, label]) => {
        acc[key] = {
          label,
          expectedScore: clientConfig[key],
          notes: configNotes[key] || '',
        }
        return acc
      }, {}),
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, summary, type: 'cultural', clientProfile }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data.result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadHTML = () => {
    if (!result) return
    const html = generateCulturalHTML(result, selectedClient)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cultural-fit-${selectedClient.name.toLowerCase().replace(/\s+/g, '-')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const inputStyle = {
    width: '100%',
    border: '1.5px solid #e5e7eb',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
  }

  return (
    <div className="space-y-6">
      {/* Client selector + config */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800 text-lg">Cultural Fit Analysis</h2>
          {selectedClient && (
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="text-sm px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ⚙️ Configurar perfil de {selectedClient.name}
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Empresa cliente</label>
          {loadingClients ? (
            <p className="text-sm text-gray-400">Cargando clientes...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {clients.slice(0, 18).map(client => (
                <button
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    selectedClient?.id === client.id
                      ? 'border-orange-400 bg-orange-50 text-orange-800 font-semibold'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="font-medium truncate">{client.name}</div>
                  {client.industry && <div className="text-xs text-gray-400 mt-0.5 truncate">{client.industry}</div>}
                  {profiles[client.id] && <div className="text-xs text-green-500 mt-0.5">✓ Configurado</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Config panel */}
        {showConfig && selectedClient && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="font-semibold text-gray-700 mb-4 text-sm">
              Perfil cultural esperado para <span style={{ color: BONDY_ORANGE }}>{selectedClient.name}</span>
            </h3>
            <div className="space-y-4">
              {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
                <div key={key} className="grid grid-cols-5 gap-3 items-start">
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Peso esperado: <span style={{ color: scoreColor(clientConfig[key]) }} className="font-semibold">{clientConfig[key]}/10</span>
                    </p>
                  </div>
                  <div className="col-span-1 flex items-center pt-1">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={clientConfig[key]}
                      onChange={e => setClientConfig(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                      className="w-full accent-orange-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Nota contextual..."
                      value={configNotes[key] || ''}
                      onChange={e => setConfigNotes(prev => ({ ...prev, [key]: e.target.value }))}
                      style={{ ...inputStyle, padding: '8px 12px' }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={saveConfig}
              className="mt-4 px-6 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: BONDY_ORANGE }}
            >
              Guardar configuración
            </button>
          </div>
        )}
      </div>

      {/* Transcript input */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Resumen Gemini <span className="text-gray-400 font-normal">(opcional)</span></label>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="Pegá el resumen de Gemini..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Transcripción <span className="text-red-400">*</span></label>
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder="Pegá la transcripción de la entrevista..."
            rows={10}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={analyze}
          disabled={!transcript.trim() || !selectedClient || loading}
          className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: loading || !selectedClient ? '#ccc' : `linear-gradient(135deg, ${BONDY_ORANGE}, #e86c10)` }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Analizando fit cultural...
            </span>
          ) : !selectedClient ? 'Seleccioná una empresa primero' : '🎯 Analizar Cultural Fit'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <p className="font-semibold text-gray-800">Cultural Fit — {selectedClient.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{result.recommendation}</p>
            </div>
            <button
              onClick={downloadHTML}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: BONDY_ORANGE }}
            >
              ⬇ Descargar
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Radar */}
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl mb-3 text-white text-2xl font-bold"
                style={{ background: scoreColor(result.overallScore) }}>
                {result.overallScore}
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-4">Score general</p>
              <RadarChart scores={Object.fromEntries(
                Object.keys(DIMENSION_LABELS).map(k => [k, result.dimensions?.[k]?.score || 5])
              )} />
            </div>

            {/* Dimensions */}
            <div className="space-y-3">
              {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
                const dim = result.dimensions?.[key]
                if (!dim) return null
                return (
                  <div key={key} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-600">{label}</span>
                      <span className="text-sm font-bold" style={{ color: scoreColor(dim.score) }}>
                        {dim.score}/10
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${(dim.score / 10) * 100}%`, background: scoreColor(dim.score) }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{dim.analysis}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="px-6 pb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Resumen</p>
              <p className="text-sm text-gray-600 leading-relaxed">{result.overallSummary}</p>
              {result.greenFlags?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.greenFlags.map((f, i) => (
                    <span key={i} className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full">✓ {f}</span>
                  ))}
                </div>
              )}
              {result.redFlags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.redFlags.map((f, i) => (
                    <span key={i} className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full">⚠ {f}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function generateCulturalHTML(result, client) {
  const dims = Object.entries(DIMENSION_LABELS)
  const scoreColor = (s) => s >= 8 ? '#10b981' : s >= 6 ? '#F47C20' : s >= 4 ? '#f59e0b' : '#ef4444'
  
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Cultural Fit - ${client?.name || 'Cliente'}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #f8f9fa; color: #1a1a2e; }
  .container { max-width: 800px; margin: 0 auto; background: white; min-height: 100vh; }
  .header { background: linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%); padding: 40px; }
  .logo { width: 44px; height: 44px; background: linear-gradient(135deg, #F47C20, #e86c10); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 18px; margin-bottom: 24px; }
  .header h1 { color: white; font-size: 24px; font-weight: 700; margin-bottom: 4px; }
  .header p { color: rgba(147,197,253,0.8); font-size: 14px; }
  .content { padding: 40px; }
  .score-badge { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 16px; font-size: 28px; font-weight: 700; color: white; margin-bottom: 16px; }
  .dim { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
  .dim-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .dim-label { font-size: 13px; font-weight: 600; color: #374151; }
  .dim-score { font-size: 14px; font-weight: 700; }
  .bar { background: #f3f4f6; border-radius: 4px; height: 6px; margin-bottom: 8px; }
  .bar-fill { height: 6px; border-radius: 4px; }
  .dim-text { font-size: 13px; color: #6b7280; line-height: 1.6; }
  .summary { background: #f9fafb; border-radius: 12px; padding: 20px; margin-top: 24px; }
  .tag { display: inline-block; font-size: 12px; padding: 4px 12px; border-radius: 20px; margin: 4px; }
  .footer { border-top: 1px solid #e5e7eb; padding: 24px 40px; background: #f9fafb; text-align: center; color: #9ca3af; font-size: 12px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">B</div>
    <h1>Cultural Fit Report</h1>
    <p>${client?.name} · Generado por Bondy Tools</p>
  </div>
  <div class="content">
    <div style="text-align:center;margin-bottom:32px;">
      <div class="score-badge" style="background:${scoreColor(result.overallScore)};margin:0 auto 12px;">${result.overallScore}</div>
      <p style="font-size:18px;font-weight:700;color:#1a1a2e;">${result.recommendation}</p>
    </div>
    ${dims.map(([key, label]) => {
      const dim = result.dimensions?.[key]
      if (!dim) return ''
      return `<div class="dim">
        <div class="dim-header">
          <span class="dim-label">${label}</span>
          <span class="dim-score" style="color:${scoreColor(dim.score)}">${dim.score}/10</span>
        </div>
        <div class="bar"><div class="bar-fill" style="width:${(dim.score/10)*100}%;background:${scoreColor(dim.score)}"></div></div>
        <p class="dim-text">${dim.analysis}</p>
        ${dim.evidence ? `<p class="dim-text" style="font-style:italic;margin-top:4px;color:#9ca3af;">"${dim.evidence}"</p>` : ''}
      </div>`
    }).join('')}
    <div class="summary">
      <p style="font-weight:600;margin-bottom:8px;color:#374151;">Resumen</p>
      <p style="color:#6b7280;font-size:14px;line-height:1.7;">${result.overallSummary}</p>
      <div style="margin-top:12px;">
        ${(result.greenFlags||[]).map(f => `<span class="tag" style="background:#dcfce7;color:#166534;">✓ ${f}</span>`).join('')}
        ${(result.redFlags||[]).map(f => `<span class="tag" style="background:#fee2e2;color:#991b1b;">⚠ ${f}</span>`).join('')}
      </div>
    </div>
  </div>
  <div class="footer">
    Generado por Bondy Tools · ${new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
  </div>
</div>
</body>
</html>`
}
