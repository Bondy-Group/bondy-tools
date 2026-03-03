'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

const BONDY_ORANGE = '#E05C00'
const FONT_MONO = 'DM Mono, monospace'

// Clasificación heurística de skills técnicos vs blandos
const SOFT_KEYWORDS = ['feedback', 'lideraz', 'mentor', 'negoci', 'comunicac', 'equipo', 'hiring', 'selección', 'alineación', 'conflicto', 'gestión', 'cultura', 'colabor', 'empat', 'motivac', 'coaching', 'performance']
function guessSoftSkill(name) {
  const lower = name.toLowerCase()
  return SOFT_KEYWORDS.some(k => lower.includes(k))
}

function parseXLSX(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  const skillsMap = {}
  let headerRow = -1

  // Encontrar fila de header (contiene "Skill" y "Peso")
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map(c => String(c).toLowerCase())
    if (row.some(c => c.includes('skill')) && row.some(c => c.includes('peso'))) {
      const hasQ = row.some(c => c.includes('pregunta') || c.includes('q#'))
      if (hasQ) { headerRow = i; break }
    }
  }

  if (headerRow === -1) {
    // Fallback: fila que tenga "Pregunta" y "Skill"
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i].map(c => String(c).toLowerCase())
      if (row.some(c => c.includes('pregunta')) && row.some(c => c.includes('skill'))) {
        headerRow = i; break
      }
    }
  }

  if (headerRow === -1) return { skills: [], raw: rows }

  const headers = rows[headerRow].map(c => String(c).toLowerCase().trim())
  const colSkill = headers.findIndex(h => h === 'skill')
  const colPeso = headers.findIndex(h => h.includes('peso'))
  const colQ = headers.findIndex(h => h.includes('pregunta') || h.includes('q#') && !h.includes('q#') || h === 'q#' || h.includes('pregunta'))
  const colPregunta = headers.findIndex(h => h === 'pregunta' || h.includes('pregunta principal'))
  const colBusca = headers.findIndex(h => h.includes('busca') || h.includes('evidencia') || h.includes('look'))
  const colRed = headers.findIndex(h => h.includes('red flag') || h.includes('red_flag'))
  const colGreen = headers.findIndex(h => h.includes('green flag') || h.includes('green_flag'))
  const colRepregunta = headers.findIndex(h => h.includes('repregunta') || h.includes('follow'))

  // Redetectar colPregunta mas específico
  const colPreguntaFinal = headers.findIndex((h, i) => {
    if (i <= colPeso) return false
    return h.includes('pregunta') || (h.length > 0 && i === colQ + 1)
  })

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i]
    const skillName = String(row[colSkill] || '').trim()
    const peso = parseFloat(row[colPeso]) || 0
    const pregunta = String(row[colPreguntaFinal] || row[colPregunta] || '').trim()
    const busca = String(colBusca >= 0 ? row[colBusca] : '').trim()
    const redFlag = String(colRed >= 0 ? row[colRed] : '').trim()
    const greenFlag = String(colGreen >= 0 ? row[colGreen] : '').trim()
    const repregunta = String(colRepregunta >= 0 ? row[colRepregunta] : '').trim()

    if (!skillName || skillName.toLowerCase() === 'total' || !peso) continue

    if (!skillsMap[skillName]) {
      skillsMap[skillName] = {
        id: `skill_${Date.now()}_${Object.keys(skillsMap).length}`,
        name: skillName,
        weight: peso,
        skill_type: guessSoftSkill(skillName) ? 'soft' : 'technical',
        description: '',
        questions: []
      }
    }

    if (pregunta) {
      skillsMap[skillName].questions.push({
        question: pregunta,
        what_to_look_for: busca,
        red_flag: redFlag,
        green_flag: greenFlag,
        follow_up: repregunta,
      })
    }
  }

  return { skills: Object.values(skillsMap), raw: rows, headerRow }
}

function SkillPreviewCard({ skill, index, onChange, onToggleType }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ border: `1.5px solid ${skill.skill_type === 'technical' ? '#ffd4b8' : '#bfdbfe'}`, borderRadius: '12px', overflow: 'hidden', background: 'white', marginBottom: '8px' }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: skill.skill_type === 'technical' ? '#FFF8F4' : '#F0F7FF', borderBottom: open ? `1px solid ${skill.skill_type === 'technical' ? '#ffd4b8' : '#bfdbfe'}` : 'none' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#111', flex: 1 }}>{skill.name}</span>
        <span style={{ fontSize: '11px', fontFamily: FONT_MONO, color: '#888' }}>peso {skill.weight}%</span>
        <button
          onClick={e => { e.stopPropagation(); onToggleType(index) }}
          style={{ padding: '3px 10px', border: `1px solid ${skill.skill_type === 'technical' ? BONDY_ORANGE : '#3b82f6'}`, borderRadius: '20px', background: 'transparent', color: skill.skill_type === 'technical' ? BONDY_ORANGE : '#3b82f6', fontSize: '10px', cursor: 'pointer', fontFamily: FONT_MONO, letterSpacing: '0.08em' }}
        >
          {skill.skill_type === 'technical' ? '🔧 Técnico' : '💬 Blando'}
        </button>
        <span style={{ color: '#ccc', fontSize: '12px' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ padding: '12px 16px' }}>
          {skill.questions.length === 0 && <p style={{ color: '#bbb', fontSize: '12px', fontStyle: 'italic', margin: 0 }}>Sin preguntas detectadas.</p>}
          {skill.questions.map((q, qi) => (
            <div key={qi} style={{ borderLeft: `3px solid ${skill.skill_type === 'technical' ? '#ffd4b8' : '#bfdbfe'}`, paddingLeft: '12px', marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#111', margin: '0 0 4px' }}>P{qi + 1}. {q.question}</p>
              {q.follow_up && <p style={{ fontSize: '12px', color: '#555', margin: '0 0 2px' }}>↩ <em>{q.follow_up}</em></p>}
              {q.what_to_look_for && <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 2px' }}>🔍 {q.what_to_look_for}</p>}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                {q.green_flag && <span style={{ fontSize: '11px', color: '#16a34a', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '4px', padding: '2px 6px' }}>✓ {q.green_flag.substring(0, 80)}{q.green_flag.length > 80 ? '…' : ''}</span>}
                {q.red_flag && <span style={{ fontSize: '11px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', padding: '2px 6px' }}>✗ {q.red_flag.substring(0, 80)}{q.red_flag.length > 80 ? '…' : ''}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ScorecardUploader({ onComplete, existingClients = [] }) {
  const [step, setStep] = useState('upload') // upload | preview | saving | done
  const [dragging, setDragging] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [clientName, setClientName] = useState('')
  const [customClient, setCustomClient] = useState('')
  const [scorecardName, setScorecardName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  const totalWeight = parsed ? parsed.skills.reduce((s, sk) => s + (parseFloat(sk.weight) || 0), 0) : 0

  const handleFile = (file) => {
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const buffer = new Uint8Array(e.target.result)
        const result = parseXLSX(buffer)
        if (!result.skills || result.skills.length === 0) {
          setError('No se encontraron skills en el archivo. Verificá que tenga columnas: Skill, Peso (%), Pregunta.')
          return
        }
        // Intentar extraer nombre del scorecard del título (fila 1)
        const firstRow = result.raw[0]
        const titleGuess = firstRow ? String(firstRow[0] || '').trim() : ''
        if (titleGuess && !scorecardName) setScorecardName(titleGuess)
        setParsed(result)
        setStep('preview')
      } catch (err) {
        setError('Error leyendo el archivo: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const toggleSkillType = (index) => {
    setParsed(prev => {
      const skills = [...prev.skills]
      skills[index] = { ...skills[index], skill_type: skills[index].skill_type === 'technical' ? 'soft' : 'technical' }
      return { ...prev, skills }
    })
  }

  const handleSave = async () => {
    const finalClient = clientName === '__CUSTOM__' ? customClient.trim() : clientName
    if (!finalClient) return setError('Seleccioná o ingresá el cliente')
    if (!scorecardName.trim()) return setError('Ingresá un nombre para la scorecard')
    if (!parsed?.skills?.length) return setError('No hay skills para guardar')

    setSaving(true)
    setError(null)

    try {
      // 1. Guardar scorecard
      const skillsForScorecard = parsed.skills.map(s => ({
        id: s.id,
        name: s.name,
        weight: s.weight,
        skill_type: s.skill_type,
        description: s.description || '',
        questions: s.questions.map(q => q.question), // solo texto para la scorecard
      }))

      const scRes = await fetch('/api/scorecards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: finalClient,
          scorecard_name: scorecardName.trim(),
          scorecard_data: { skills: skillsForScorecard },
        })
      })
      const scData = await scRes.json()
      if (!scRes.ok) throw new Error('Scorecard: ' + scData.error)

      // 2. Guardar preguntas en banco
      const questionsForBank = []
      for (const skill of parsed.skills) {
        for (const q of skill.questions) {
          questionsForBank.push({
            skill_name: skill.name,
            skill_type: skill.skill_type,
            question: q.question,
            follow_up: q.follow_up || null,
            green_flag: q.green_flag || null,
            red_flag: q.red_flag || null,
            what_to_look_for: q.what_to_look_for || null,
            source_client: finalClient,
            client_tags: [finalClient],
          })
        }
      }

      const qbRes = await fetch('/api/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: questionsForBank })
      })
      const qbData = await qbRes.json()
      if (!qbRes.ok) throw new Error('Banco: ' + qbData.error)

      const created = qbData.results?.filter(r => r.action === 'created').length || 0
      const updated = qbData.results?.filter(r => r.action === 'updated').length || 0

      setSaveResult({
        scorecard: scData.scorecard?.scorecard_name,
        client: finalClient,
        skills: parsed.skills.length,
        qCreated: created,
        qUpdated: updated,
      })
      setStep('done')
      if (onComplete) onComplete(scData.scorecard)

    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (step === 'done' && saveResult) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
        <h3 style={{ fontWeight: 700, fontSize: '18px', color: '#111', marginBottom: '8px' }}>Todo guardado</h3>
        <p style={{ color: '#555', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
          <strong style={{ color: BONDY_ORANGE }}>{saveResult.scorecard}</strong> para <strong>{saveResult.client}</strong><br />
          {saveResult.skills} skills · {saveResult.qCreated} preguntas nuevas en el banco · {saveResult.qUpdated} actualizadas
        </p>
        <button
          onClick={() => { setStep('upload'); setParsed(null); setSaveResult(null); setClientName(''); setScorecardName('') }}
          style={{ padding: '10px 24px', border: `1.5px solid ${BONDY_ORANGE}`, background: 'transparent', color: BONDY_ORANGE, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: FONT_MONO }}
        >
          Cargar otro archivo
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '860px' }}>
      {step === 'upload' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.6, margin: 0 }}>
              Subí el Excel de la scorecard. Se van a detectar automáticamente los skills, pesos, preguntas y flags.
              Después podés revisar y ajustar antes de guardar.
            </p>
          </div>
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileRef.current.click()}
            style={{
              border: `2px dashed ${dragging ? BONDY_ORANGE : '#e5e7eb'}`,
              borderRadius: '14px',
              padding: '56px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'rgba(224,92,0,0.03)' : 'white',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📊</div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>
              Arrastrá el Excel acá o hacé click para seleccionar
            </p>
            <p style={{ fontSize: '12px', color: '#aaa', fontFamily: FONT_MONO }}>
              Soporta .xlsx · .xlsm · .xls
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xlsm,.xls"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>
          {error && <div style={{ marginTop: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '13px' }}>⚠️ {error}</div>}
        </div>
      )}

      {step === 'preview' && parsed && (
        <div>
          {/* Header preview */}
          <div style={{ background: 'rgba(224,92,0,0.04)', border: '1px solid rgba(224,92,0,0.15)', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '10px', fontFamily: FONT_MONO, letterSpacing: '0.12em', textTransform: 'uppercase', color: BONDY_ORANGE }}>
                {parsed.skills.length} skills detectados · peso total {totalWeight}%
              </span>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#555' }}>
                Revisá los tipos (técnico / blando) y hacé click en el badge para corregir. Luego completá el cliente y nombre.
              </p>
            </div>
            <button
              onClick={() => { setStep('upload'); setParsed(null) }}
              style={{ fontSize: '11px', fontFamily: FONT_MONO, color: '#888', background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer' }}
            >
              ← Subir otro archivo
            </button>
          </div>

          {/* Datos del scorecard */}
          <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '20px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontFamily: FONT_MONO, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', marginBottom: '6px', fontWeight: 600 }}>
                Cliente <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', outline: 'none', backgroundColor: 'white', color: '#111', boxSizing: 'border-box' }}
              >
                <option value="">— Seleccioná —</option>
                <option value="__CUSTOM__">✏️ Nuevo cliente</option>
                {existingClients.filter(c => c !== '__DEFAULT__').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {clientName === '__CUSTOM__' && (
                <input
                  value={customClient}
                  onChange={e => setCustomClient(e.target.value)}
                  placeholder="Nombre del cliente..."
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', outline: 'none', backgroundColor: 'white', color: '#111', boxSizing: 'border-box', marginTop: '8px' }}
                />
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontFamily: FONT_MONO, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', marginBottom: '6px', fontWeight: 600 }}>
                Nombre de la scorecard <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                value={scorecardName}
                onChange={e => setScorecardName(e.target.value)}
                placeholder="Ej: IOL — Tech Lead Frontend"
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', outline: 'none', backgroundColor: 'white', color: '#111', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Skills */}
          <div style={{ marginBottom: '20px' }}>
            {parsed.skills.map((skill, i) => (
              <SkillPreviewCard key={skill.id || i} skill={skill} index={i} onChange={() => {}} onToggleType={toggleSkillType} />
            ))}
          </div>

          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>⚠️ {error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={() => { setStep('upload'); setParsed(null) }}
              style={{ padding: '10px 24px', border: '1.5px solid #e5e7eb', background: 'white', color: '#666', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '10px 32px', border: 'none', background: saving ? '#ccc' : `linear-gradient(135deg, ${BONDY_ORANGE}, #F47C20)`, color: 'white', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700 }}
            >
              {saving ? 'Guardando...' : '✓ Guardar scorecard + banco de preguntas'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
