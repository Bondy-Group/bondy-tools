'use client'

import { useState, useRef } from 'react'

const BONDY_ORANGE = '#E05C00'
const FONT_MONO = 'DM Mono, monospace'
const FONT_DISPLAY = 'Playfair Display, serif'

const inputStyle = {
  width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '8px',
  padding: '9px 12px', fontSize: '13px', outline: 'none',
  fontFamily: 'inherit', backgroundColor: 'white', color: '#111',
  boxSizing: 'border-box',
}

// ─── Skill Preview Card ───────────────────────────────────────────────────────
function SkillPreviewCard({ skill, index, onChange, onRemove }) {
  const [open, setOpen] = useState(true)
  const istech = skill.skill_type === 'technical'

  return (
    <div style={{ border: `1.5px solid ${istech ? '#ffd4b8' : '#bfdbfe'}`, borderRadius: '12px', overflow: 'hidden', background: 'white', marginBottom: '10px' }}>
      {/* Header */}
      <div onClick={() => setOpen(o => !o)} style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
        cursor: 'pointer', background: istech ? '#fff8f5' : '#f0f7ff',
        borderBottom: open ? `1px solid ${istech ? '#ffd4b8' : '#bfdbfe'}` : 'none'
      }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
          background: istech ? '#FFF3EC' : '#EFF6FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
        }}>
          {istech ? '🔧' : '💬'}
        </div>
        <div style={{ flex: 1 }}>
          <input
            value={skill.skill_name}
            onChange={e => onChange(index, 'skill_name', e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{ fontSize: '14px', fontWeight: 700, color: '#111', background: 'transparent', border: 'none', outline: 'none', width: '240px' }}
            placeholder="Nombre del skill"
          />
          <span style={{ fontSize: '11px', color: '#aaa', fontFamily: FONT_MONO, marginLeft: '8px' }}>
            peso {skill.weight}% · {skill.questions?.length || 0} preguntas
          </span>
        </div>
        {/* Tipo toggle */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {['technical', 'soft'].map(t => (
            <button key={t} onClick={e => { e.stopPropagation(); onChange(index, 'skill_type', t) }}
              style={{
                padding: '4px 10px', border: `1.5px solid ${skill.skill_type === t ? (t === 'technical' ? BONDY_ORANGE : '#4A90D9') : '#e5e7eb'}`,
                background: skill.skill_type === t ? (t === 'technical' ? 'rgba(224,92,0,0.08)' : 'rgba(74,144,217,0.08)') : 'white',
                color: skill.skill_type === t ? (t === 'technical' ? BONDY_ORANGE : '#4A90D9') : '#aaa',
                borderRadius: '6px', cursor: 'pointer', fontSize: '10px', fontWeight: 700, fontFamily: FONT_MONO
              }}>
              {t === 'technical' ? '🔧 Técnico' : '💬 Blando'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="number" min="0" max="100" value={skill.weight}
            onChange={e => onChange(index, 'weight', parseInt(e.target.value) || 0)}
            onClick={e => e.stopPropagation()}
            style={{ width: '56px', border: '1.5px solid #e5e7eb', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', fontFamily: FONT_MONO, textAlign: 'center' }}
          />
          <span style={{ fontSize: '11px', color: '#aaa', fontFamily: FONT_MONO }}>%</span>
          <button onClick={e => { e.stopPropagation(); onRemove(index) }}
            style={{ padding: '4px 8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>
            ✕
          </button>
          <span style={{ color: '#ccc', fontSize: '11px' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Questions */}
      {open && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(skill.questions || []).map((q, qi) => (
            <div key={qi} style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#bbb', fontFamily: FONT_MONO, letterSpacing: '0.1em' }}>
                  PREGUNTA {qi + 1}
                </span>
                <button onClick={() => {
                  const newQ = [...skill.questions]; newQ.splice(qi, 1)
                  onChange(index, 'questions', newQ)
                }} style={{ border: 'none', background: 'none', color: '#ddd', cursor: 'pointer', fontSize: '12px' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { key: 'question', label: 'Pregunta', placeholder: 'Texto de la pregunta...', rows: 2 },
                  { key: 'what_to_look_for', label: 'Qué buscar', placeholder: 'Evidencia y criterios...', rows: 2 },
                  { key: 'red_flag', label: '🚩 Red flag', placeholder: 'Respuesta que preocupa...', rows: 1 },
                  { key: 'green_flag', label: '✅ Green flag', placeholder: 'Respuesta ideal...', rows: 1 },
                  { key: 'follow_up', label: '↩ Repregunta', placeholder: 'Pregunta de profundización...', rows: 1 },
                ].map(({ key, label, placeholder, rows }) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: '9px', fontWeight: 700, color: '#888', fontFamily: FONT_MONO, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {label}
                    </label>
                    <textarea
                      value={q[key] || ''}
                      onChange={e => {
                        const newQ = [...skill.questions]
                        newQ[qi] = { ...newQ[qi], [key]: e.target.value }
                        onChange(index, 'questions', newQ)
                      }}
                      placeholder={placeholder}
                      rows={rows}
                      style={{ ...inputStyle, resize: 'vertical', fontSize: '12px', lineHeight: 1.5 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => onChange(index, 'questions', [...(skill.questions || []), { question: '', what_to_look_for: '', red_flag: '', green_flag: '', follow_up: '' }])}
            style={{ padding: '8px', border: `1.5px dashed ${BONDY_ORANGE}`, background: 'transparent', color: BONDY_ORANGE, borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: FONT_MONO }}>
            + Agregar pregunta
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ImportScorecardTab({ onScorecardSaved }) {
  const fileInputRef = useRef()
  const [step, setStep] = useState('upload') // upload | parsing | preview | saving | done
  const [file, setFile] = useState(null)
  const [clientName, setClientName] = useState('')
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState(null)
  const [saveToBank, setSaveToBank] = useState(true)
  const [savedCount, setSavedCount] = useState(0)

  const totalWeight = parsed?.skills?.reduce((s, sk) => s + (parseInt(sk.weight) || 0), 0) || 0

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) { setFile(f); setError(null) }
  }

  const handleParse = async () => {
    if (!file) return
    setStep('parsing')
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('client', clientName)

      const res = await fetch('/api/parse-scorecard', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setParsed(data.parsed)
      setClientName(data.parsed.client_name || clientName)
      setStep('preview')
    } catch (e) {
      setError(e.message)
      setStep('upload')
    }
  }

  const updateSkill = (i, field, value) => {
    setParsed(prev => {
      const skills = [...prev.skills]
      skills[i] = { ...skills[i], [field]: value }
      return { ...prev, skills }
    })
  }

  const removeSkill = (i) => {
    setParsed(prev => ({ ...prev, skills: prev.skills.filter((_, idx) => idx !== i) }))
  }

  const handleSave = async () => {
    setStep('saving')
    setError(null)
    try {
      // 1. Guardar scorecard
      const scorecardBody = {
        client_name: parsed.client_name || clientName || 'Sin cliente',
        scorecard_name: parsed.scorecard_name,
        description: parsed.description || null,
        scorecard_data: {
          skills: parsed.skills.map(sk => ({
            id: sk.id || `skill_${Date.now()}`,
            name: sk.skill_name,
            skill_type: sk.skill_type,
            weight: sk.weight,
            description: sk.description || '',
            questions: (sk.questions || []).map(q => q.question).filter(Boolean)
          }))
        }
      }

      const scorecardRes = await fetch('/api/scorecards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scorecardBody)
      })
      if (!scorecardRes.ok) {
        const err = await scorecardRes.json()
        throw new Error(err.error)
      }

      // 2. Si saveToBank, guardar preguntas al banco
      if (saveToBank) {
        const questions = []
        for (const skill of parsed.skills) {
          for (const q of (skill.questions || [])) {
            if (!q.question?.trim()) continue
            questions.push({
              skill_name: skill.skill_name,
              skill_type: skill.skill_type,
              question: q.question,
              what_to_look_for: q.what_to_look_for || null,
              red_flag: q.red_flag || null,
              green_flag: q.green_flag || null,
              follow_up: q.follow_up || null,
              client_tags: [parsed.client_name || clientName].filter(Boolean),
              source: 'excel_import',
            })
          }
        }

        if (questions.length > 0) {
          const bankRes = await fetch('/api/question-bank', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questions })
          })
          const bankData = await bankRes.json()
          setSavedCount(bankData.count || questions.length)
        }
      }

      setStep('done')
      if (onScorecardSaved) setTimeout(onScorecardSaved, 2000)
    } catch (e) {
      setError(e.message)
      setStep('preview')
    }
  }

  const reset = () => {
    setStep('upload'); setFile(null); setParsed(null)
    setError(null); setClientName(''); setSavedCount(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── STEP: upload ──
  if (step === 'upload') return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '22px', fontWeight: 700, color: '#111', marginBottom: '8px' }}>
          Importar desde Excel
        </h3>
        <p style={{ fontSize: '13px', color: '#888', lineHeight: 1.7, margin: 0 }}>
          Subí tu scorecard en Excel (.xlsx, .xlsm). La IA va a extraer los skills, pesos y preguntas. Vos lo revisás y confirmás antes de guardar.
        </p>
      </div>

      {/* Cliente */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#555', fontFamily: FONT_MONO, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
          Cliente <span style={{ color: '#aaa', fontWeight: 400 }}>(opcional, si no está en el archivo)</span>
        </label>
        <input value={clientName} onChange={e => setClientName(e.target.value)}
          placeholder="Ej: IOL, Despegar, OpenZeppelin..."
          style={inputStyle}
        />
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${file ? BONDY_ORANGE : '#e5e7eb'}`,
          borderRadius: '14px', padding: '48px 32px', textAlign: 'center',
          cursor: 'pointer', background: file ? 'rgba(224,92,0,0.03)' : '#fafafa',
          transition: 'all 0.2s',
        }}
      >
        <input ref={fileInputRef} type="file" accept=".xlsx,.xlsm,.xls" onChange={handleFile} style={{ display: 'none' }} />
        {file ? (
          <>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#111', marginBottom: '6px' }}>{file.name}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>{(file.size / 1024).toFixed(0)} KB · listo para procesar</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
              Arrastrá tu Excel acá o hacé click para elegirlo
            </div>
            <div style={{ fontSize: '12px', color: '#aaa' }}>.xlsx, .xlsm, .xls</div>
          </>
        )}
      </div>

      {error && (
        <div style={{ marginTop: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleParse}
        disabled={!file}
        style={{
          marginTop: '20px', width: '100%', padding: '14px',
          background: file ? `linear-gradient(135deg, ${BONDY_ORANGE}, #F47C20)` : '#e5e7eb',
          color: file ? 'white' : '#aaa', border: 'none', borderRadius: '10px',
          cursor: file ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 700,
        }}
      >
        Procesar con IA →
      </button>
    </div>
  )

  // ── STEP: parsing ──
  if (step === 'parsing') return (
    <div style={{ textAlign: 'center', padding: '80px 32px' }}>
      <div style={{ fontSize: '40px', marginBottom: '20px', animation: 'spin 1s linear infinite' }}>⚙️</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: '20px', fontWeight: 700, color: '#111', marginBottom: '8px' }}>
        Analizando el archivo...
      </div>
      <div style={{ fontSize: '13px', color: '#888' }}>
        La IA está leyendo los skills, pesos y preguntas. Puede tomar hasta 20 segundos.
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  // ── STEP: done ──
  if (step === 'done') return (
    <div style={{ textAlign: 'center', padding: '80px 32px' }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: '24px', fontWeight: 700, color: '#111', marginBottom: '8px' }}>
        Scorecard guardada
      </div>
      {saveToBank && savedCount > 0 && (
        <div style={{ fontSize: '13px', color: '#888', marginBottom: '24px' }}>
          {savedCount} preguntas agregadas al banco de preguntas.
        </div>
      )}
      <button onClick={reset}
        style={{ padding: '10px 28px', border: `1.5px solid ${BONDY_ORANGE}`, background: 'transparent', color: BONDY_ORANGE, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
        Importar otra scorecard
      </button>
    </div>
  )

  // ── STEP: preview ──
  if (step === 'preview' || step === 'saving') return (
    <div>
      {/* Header preview */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '20px', fontWeight: 700, color: '#111', marginBottom: '4px' }}>
            Revisá antes de guardar
          </h3>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            Editá cualquier campo. Los cambios son solo en esta vista hasta que guardes.
          </p>
        </div>
        <button onClick={reset}
          style={{ padding: '8px 16px', border: '1.5px solid #e5e7eb', background: 'white', color: '#888', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontFamily: FONT_MONO, flexShrink: 0 }}>
          ← Volver
        </button>
      </div>

      {/* Meta fields */}
      <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '20px', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#555', fontFamily: FONT_MONO, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Cliente <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input value={parsed?.client_name || ''} onChange={e => setParsed(p => ({ ...p, client_name: e.target.value }))} style={inputStyle} placeholder="Nombre del cliente" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#555', fontFamily: FONT_MONO, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Nombre de la scorecard <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input value={parsed?.scorecard_name || ''} onChange={e => setParsed(p => ({ ...p, scorecard_name: e.target.value }))} style={inputStyle} placeholder="Ej: TL Frontend — IOL" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#555', fontFamily: FONT_MONO, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Descripción
          </label>
          <input value={parsed?.description || ''} onChange={e => setParsed(p => ({ ...p, description: e.target.value }))} style={inputStyle} placeholder="Perfil que evalúa esta scorecard..." />
        </div>
      </div>

      {/* Weight indicator */}
      <div style={{
        background: totalWeight === 100 ? '#f0fdf4' : '#fff7ed',
        border: `1px solid ${totalWeight === 100 ? '#86efac' : '#fde68a'}`,
        borderRadius: '8px', padding: '10px 16px', marginBottom: '20px',
        display: 'flex', gap: '16px', alignItems: 'center'
      }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: totalWeight === 100 ? '#16a34a' : '#d97706', fontFamily: FONT_MONO }}>
          {totalWeight === 100 ? '✓' : '⚠'} Peso total: {totalWeight}%
        </span>
        <span style={{ fontSize: '12px', color: '#888' }}>
          {parsed?.skills?.filter(s => s.skill_type === 'technical').length || 0} técnicos ·{' '}
          {parsed?.skills?.filter(s => s.skill_type === 'soft').length || 0} blandos ·{' '}
          {parsed?.skills?.reduce((t, s) => t + (s.questions?.length || 0), 0) || 0} preguntas total
        </span>
        {totalWeight !== 100 && <span style={{ fontSize: '11px', color: '#d97706' }}>La IA normaliza si no suma 100.</span>}
      </div>

      {/* Skills */}
      {(parsed?.skills || []).map((skill, i) => (
        <SkillPreviewCard key={skill.id || i} skill={skill} index={i} onChange={updateSkill} onRemove={removeSkill} />
      ))}

      {/* Banco de preguntas toggle */}
      <div style={{ background: 'rgba(224,92,0,0.04)', border: '1px solid rgba(224,92,0,0.15)', borderRadius: '10px', padding: '16px 20px', marginTop: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <input type="checkbox" id="saveToBank" checked={saveToBank} onChange={e => setSaveToBank(e.target.checked)}
          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: BONDY_ORANGE }} />
        <label htmlFor="saveToBank" style={{ cursor: 'pointer', flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111', marginBottom: '2px' }}>
            Guardar preguntas en el banco
          </div>
          <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.5 }}>
            Las preguntas quedan disponibles para reutilizar en otras scorecards y medir efectividad.
          </div>
        </label>
      </div>

      {error && (
        <div style={{ marginTop: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f0f0f0' }}>
        <button onClick={reset}
          style={{ padding: '12px 24px', border: '1.5px solid #e5e7eb', background: 'white', color: '#666', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={step === 'saving' || !parsed?.scorecard_name?.trim() || !parsed?.client_name?.trim()}
          style={{
            padding: '12px 36px', border: 'none',
            background: step === 'saving' ? '#ccc' : `linear-gradient(135deg, ${BONDY_ORANGE}, #F47C20)`,
            color: 'white', borderRadius: '8px',
            cursor: step === 'saving' ? 'not-allowed' : 'pointer',
            fontSize: '13px', fontWeight: 700
          }}
        >
          {step === 'saving' ? 'Guardando...' : '✓ Confirmar y guardar'}
        </button>
      </div>
    </div>
  )

  return null
}
