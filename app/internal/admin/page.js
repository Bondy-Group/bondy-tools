'use client'

import { useState, useEffect } from 'react'

const BONDY_ORANGE = '#E05C00'
const BONDY_BG = '#F9F8F6'

const inputStyle = {
  width: '100%',
  border: '1.5px solid #e5e7eb',
  borderRadius: '10px',
  padding: '10px 14px',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
  backgroundColor: 'white',
  color: '#111',
  boxSizing: 'border-box',
}

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#555', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
    {children}{required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
  </label>
)

const SKILL_TYPES = [
  { value: 'technical', label: '⚙️ Técnico' },
  { value: 'soft', label: '🧠 Soft skill' },
]

function SkillEditor({ skill, index, onChange, onRemove, totalSkills }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div style={{ border: '1.5px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: skill.type === 'soft' ? '#fafff8' : '#fffaf8' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', background: skill.type === 'soft' ? '#f0fff0' : '#fff8f5', borderBottom: expanded ? '1px solid #f0f0f0' : 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#bbb' }}>#{index + 1}</span>
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#111' }}>{skill.name || 'Nuevo skill'}</span>
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: skill.type === 'soft' ? '#dcfce7' : '#fff3e0', color: skill.type === 'soft' ? '#166534' : '#9a3412', fontWeight: 600 }}>
            {skill.type === 'soft' ? '🧠 Soft' : '⚙️ Técnico'}
          </span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: BONDY_ORANGE, fontWeight: 700 }}>{skill.weight}%</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={(e) => { e.stopPropagation(); onRemove() }} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fecaca', background: 'white', color: '#dc2626', fontSize: '11px', cursor: 'pointer' }}>✕</button>
          <span style={{ fontSize: '11px', color: '#999', padding: '4px 8px' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '12px' }}>
            <div>
              <Label required>Nombre del skill</Label>
              <input value={skill.name} onChange={e => onChange({ ...skill, name: e.target.value })} placeholder="Ej: Python & Ecosystem" style={inputStyle} />
            </div>
            <div>
              <Label required>Tipo</Label>
              <select value={skill.type} onChange={e => onChange({ ...skill, type: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                {SKILL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label required>Peso %</Label>
              <input type="number" min="1" max="100" value={skill.weight} onChange={e => onChange({ ...skill, weight: parseInt(e.target.value) || 0 })} style={inputStyle} />
            </div>
          </div>

          <div>
            <Label>Descripción</Label>
            <input value={skill.description || ''} onChange={e => onChange({ ...skill, description: e.target.value })} placeholder="Qué se evalúa en este skill..." style={inputStyle} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <Label>Preguntas de referencia</Label>
              <button onClick={() => onChange({ ...skill, questions: [...(skill.questions || []), ''] })}
                style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: `1px solid ${BONDY_ORANGE}`, color: BONDY_ORANGE, background: 'white', cursor: 'pointer' }}>
                + Agregar
              </button>
            </div>
            {(skill.questions || []).map((q, qi) => (
              <div key={qi} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <input value={q} onChange={e => {
                  const qs = [...skill.questions]; qs[qi] = e.target.value
                  onChange({ ...skill, questions: qs })
                }} placeholder={`Pregunta ${qi + 1}...`} style={{ ...inputStyle, flex: 1 }} />
                <button onClick={() => {
                  const qs = skill.questions.filter((_, i) => i !== qi)
                  onChange({ ...skill, questions: qs })
                }} style={{ padding: '0 10px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', color: '#999', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
            {(!skill.questions || skill.questions.length === 0) && (
              <p style={{ fontSize: '12px', color: '#ccc', fontStyle: 'italic' }}>Sin preguntas. Son opcionales pero ayudan al recruiter.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ScorecardForm({ initial, onSave, onCancel, isSaving }) {
  const [clientName, setClientName] = useState(initial?.client_name || '')
  const [clientId, setClientId] = useState(initial?.client_id || '')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [skills, setSkills] = useState(initial?.technical_scorecard?.skills || [])
  const [idManuallyEdited, setIdManuallyEdited] = useState(!!initial?.client_id)

  const totalWeight = skills.reduce((sum, s) => sum + (s.weight || 0), 0)
  const isEditing = !!initial?.id

  const handleClientNameChange = (val) => {
    setClientName(val)
    if (!idManuallyEdited && !isEditing) {
      setClientId(val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))
    }
  }

  const addSkill = (type) => {
    setSkills([...skills, { id: `skill_${Date.now()}`, name: '', type, weight: 10, description: '', questions: [] }])
  }

  const handleSave = () => {
    if (!clientName.trim() || !clientId.trim()) return alert('Cliente y ID son requeridos')
    if (totalWeight !== 100) return alert(`Los pesos deben sumar 100%. Actualmente suman ${totalWeight}%`)
    if (skills.length === 0) return alert('Agregá al menos un skill')
    onSave({ id: initial?.id, client_id: clientId, client_name: clientName, notes, technical_scorecard: { totalWeight: 100, skills } })
  }

  return (
    <div style={{ background: 'white', borderRadius: '16px', border: '1.5px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ padding: '24px 28px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 700, margin: 0, color: '#111' }}>
          {isEditing ? `Editando: ${initial.client_name}` : 'Nueva scorecard de cliente'}
        </h2>
      </div>

      <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Cliente info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <Label required>Nombre del cliente</Label>
            <input value={clientName} onChange={e => handleClientNameChange(e.target.value)} placeholder="Ej: IOL (Invertir Online)" style={inputStyle} disabled={isEditing && initial?.is_default} />
          </div>
          <div>
            <Label required>ID único (slug)</Label>
            <input value={clientId} onChange={e => { setClientId(e.target.value.toLowerCase().replace(/\s+/g, '_')); setIdManuallyEdited(true) }} placeholder="Ej: iol" style={{ ...inputStyle, fontFamily: 'DM Mono, monospace', background: isEditing ? '#f9f9f9' : 'white', color: '#888' }} disabled={isEditing} />
            {!isEditing && <p style={{ fontSize: '11px', color: '#bbb', marginTop: '4px' }}>Se genera automáticamente, no lo modifiques salvo que necesites.</p>}
          </div>
        </div>

        <div>
          <Label>Notas internas</Label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Contexto sobre el cliente, qué valoran, tecnologías clave, etc." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* Skills */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '15px', margin: 0, color: '#111' }}>Skills a evaluar</h3>
              <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0' }}>
                Peso total: <strong style={{ color: totalWeight === 100 ? '#22c55e' : '#ef4444' }}>{totalWeight}%</strong>
                {totalWeight !== 100 && ` — debe sumar exactamente 100%`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => addSkill('technical')}
                style={{ padding: '8px 14px', borderRadius: '8px', border: `1.5px solid ${BONDY_ORANGE}`, background: 'white', color: BONDY_ORANGE, fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                + Técnico
              </button>
              <button onClick={() => addSkill('soft')}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #166534', background: 'white', color: '#166534', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                + Soft skill
              </button>
            </div>
          </div>

          {skills.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', border: '2px dashed #e5e7eb', borderRadius: '12px', color: '#ccc' }}>
              <p style={{ margin: 0, fontSize: '14px' }}>Todavía no hay skills. Agregá al menos uno.</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {skills.map((skill, i) => (
              <SkillEditor
                key={skill.id || i}
                skill={skill}
                index={i}
                totalSkills={skills.length}
                onChange={(updated) => { const s = [...skills]; s[i] = updated; setSkills(s) }}
                onRemove={() => setSkills(skills.filter((_, si) => si !== i))}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
          <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: '10px', border: '1.5px solid #e5e7eb', background: 'white', color: '#555', fontSize: '13px', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isSaving}
            style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: isSaving ? '#ccc' : BONDY_ORANGE, color: 'white', fontSize: '13px', fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
            {isSaving ? 'Guardando...' : isEditing ? '💾 Guardar cambios' : '✓ Crear scorecard'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ScorecardCard({ sc, onEdit, onToggle }) {
  const skills = sc.technical_scorecard?.skills || []
  const techSkills = skills.filter(s => s.type === 'technical')
  const softSkills = skills.filter(s => s.type === 'soft')

  return (
    <div style={{ background: 'white', borderRadius: '14px', border: `1.5px solid ${sc.is_default ? BONDY_ORANGE : '#e5e7eb'}`, overflow: 'hidden', opacity: sc.is_active ? 1 : 0.5 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '17px', fontWeight: 700, margin: 0, color: '#111' }}>{sc.client_name}</h3>
            {sc.is_default && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: '#fff3e0', color: BONDY_ORANGE, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>DEFAULT</span>}
            {!sc.is_active && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: '#f3f4f6', color: '#999', fontWeight: 700 }}>INACTIVO</span>}
          </div>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#bbb', margin: 0 }}>{sc.client_id}</p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => onEdit(sc)}
            style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${BONDY_ORANGE}`, color: BONDY_ORANGE, background: 'white', fontSize: '12px', cursor: 'pointer' }}>
            Editar
          </button>
          {!sc.is_default && (
            <button onClick={() => onToggle(sc)}
              style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', color: '#555', background: 'white', fontSize: '12px', cursor: 'pointer' }}>
              {sc.is_active ? 'Desactivar' : 'Activar'}
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sc.notes && <p style={{ fontSize: '12px', color: '#666', margin: 0, fontStyle: 'italic' }}>{sc.notes}</p>}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {techSkills.map(s => (
            <span key={s.id} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#fff3e0', color: '#9a3412', fontWeight: 600 }}>
              ⚙️ {s.name} ({s.weight}%)
            </span>
          ))}
          {softSkills.map(s => (
            <span key={s.id} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#dcfce7', color: '#166534', fontWeight: 600 }}>
              🧠 {s.name} ({s.weight}%)
            </span>
          ))}
        </div>
        {skills.length === 0 && <p style={{ fontSize: '12px', color: '#ccc', margin: 0 }}>Sin skills configurados</p>}
      </div>
    </div>
  )
}

export default function AdminScorecards() {
  const [scorecards, setScorecards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState('list') // 'list' | 'new' | 'edit'
  const [editing, setEditing] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadScorecards = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/scorecards')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setScorecards(data.scorecards || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadScorecards() }, [])

  const handleSave = async (formData) => {
    setIsSaving(true)
    try {
      const method = formData.id ? 'PUT' : 'POST'
      const res = await fetch('/api/scorecards', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(formData.id ? 'Scorecard actualizada ✓' : 'Scorecard creada ✓')
      setView('list')
      setEditing(null)
      loadScorecards()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setIsSaving(false) }
  }

  const handleToggle = async (sc) => {
    try {
      const res = await fetch('/api/scorecards', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sc.id, is_active: !sc.is_active })
      })
      if (!res.ok) throw new Error('Error al actualizar')
      showToast(sc.is_active ? 'Scorecard desactivada' : 'Scorecard activada')
      loadScorecards()
    } catch (e) { alert(e.message) }
  }

  return (
    <div style={{ background: BONDY_BG, minHeight: '100vh' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, padding: '12px 20px', borderRadius: '10px', background: toast.type === 'success' ? '#111' : '#dc2626', color: 'white', fontSize: '13px', fontWeight: 700, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          {toast.msg}
        </div>
      )}

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #EBEBEB', padding: '16px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(249,248,246,0.95)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', fontWeight: 900, color: '#111' }}>
            Bond<em style={{ color: BONDY_ORANGE, fontStyle: 'italic' }}>y</em>.
          </span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: BONDY_ORANGE, background: 'rgba(224,92,0,0.08)', padding: '3px 8px', border: '1px solid rgba(224,92,0,0.2)' }}>
            Admin · Scorecards
          </span>
        </div>
        <a href="/internal" style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', textDecoration: 'none' }}>
          ← Volver a Internal
        </a>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>

        {view === 'list' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
              <div>
                <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: 900, color: '#111', margin: 0 }}>Scorecards de clientes</h1>
                <p style={{ color: '#888', fontSize: '14px', marginTop: '8px' }}>Configurá la scorecard técnica de cada cliente. Los recruiters la verán al seleccionar el cliente.</p>
              </div>
              <button onClick={() => { setEditing(null); setView('new') }}
                style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: BONDY_ORANGE, color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                + Nueva scorecard
              </button>
            </div>

            {loading && <p style={{ color: '#999', textAlign: 'center', padding: '60px 0' }}>Cargando...</p>}
            {error && <div style={{ padding: '16px', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', marginBottom: '16px' }}>⚠️ {error}</div>}

            {!loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Default first */}
                {scorecards.filter(s => s.is_default).map(sc => (
                  <ScorecardCard key={sc.id} sc={sc} onEdit={(s) => { setEditing(s); setView('edit') }} onToggle={handleToggle} />
                ))}
                {/* Rest */}
                {scorecards.filter(s => !s.is_default).map(sc => (
                  <ScorecardCard key={sc.id} sc={sc} onEdit={(s) => { setEditing(s); setView('edit') }} onToggle={handleToggle} />
                ))}
                {scorecards.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px', border: '2px dashed #e5e7eb', borderRadius: '14px', color: '#ccc' }}>
                    <p style={{ fontSize: '15px', margin: 0 }}>No hay scorecards todavía. ¡Creá la primera!</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {(view === 'new' || view === 'edit') && (
          <ScorecardForm
            initial={view === 'edit' ? editing : null}
            onSave={handleSave}
            onCancel={() => { setView('list'); setEditing(null) }}
            isSaving={isSaving}
          />
        )}

      </div>
    </div>
  )
}
