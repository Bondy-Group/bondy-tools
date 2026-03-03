'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const BONDY_ORANGE = '#E05C00'
const FONT_MONO = 'DM Mono, monospace'
const FONT_DISPLAY = 'Playfair Display, serif'

const BondyLogo = () => (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
    <rect width="7" height="26" rx="1" fill="#111111"/>
    <rect x="7" y="1" width="16" height="11" rx="5.5" fill="#111111"/>
    <rect x="7" y="14" width="17" height="11" rx="5.5" fill="#111111"/>
    <circle cx="27" cy="29" r="3" fill="#E05C00"/>
  </svg>
)

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555', marginBottom: '6px', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: FONT_MONO }}>
    {children} {required && <span style={{ color: '#ef4444' }}>*</span>}
  </label>
)

const inputStyle = {
  width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '8px',
  padding: '9px 12px', fontSize: '13px', outline: 'none',
  fontFamily: 'inherit', backgroundColor: 'white', color: '#111',
  boxSizing: 'border-box',
}

function SkillEditor({ skill, index, onChange, onDelete, onMove, total }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ border: '1.5px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', background: 'white' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: open ? '#FAFAFA' : 'white', borderBottom: open ? '1px solid #f0f0f0' : 'none' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0, background: skill.skill_type === 'technical' ? '#FFF3EC' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
          {skill.skill_type === 'technical' ? '🔧' : '💬'}
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>{skill.name || <span style={{ color: '#bbb' }}>Sin nombre</span>}</span>
          <span style={{ fontSize: '11px', color: '#bbb', marginLeft: '8px', fontFamily: FONT_MONO }}>peso {skill.weight}%</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {index > 0 && <button onClick={e => { e.stopPropagation(); onMove(index, -1) }} style={{ padding: '4px 6px', border: 'none', background: 'none', cursor: 'pointer', color: '#aaa', fontSize: '12px' }}>↑</button>}
          {index < total - 1 && <button onClick={e => { e.stopPropagation(); onMove(index, 1) }} style={{ padding: '4px 6px', border: 'none', background: 'none', cursor: 'pointer', color: '#aaa', fontSize: '12px' }}>↓</button>}
          <button onClick={e => { e.stopPropagation(); onDelete(index) }} style={{ padding: '4px 8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>Eliminar</button>
          <span style={{ color: '#ccc', fontSize: '12px', marginLeft: '4px' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '12px' }}>
            <div>
              <Label required>Nombre del skill</Label>
              <input value={skill.name} onChange={e => onChange(index, 'name', e.target.value)} placeholder="Ej: Python & Ecosystem" style={inputStyle} />
            </div>
            <div>
              <Label required>Tipo</Label>
              <select value={skill.skill_type} onChange={e => onChange(index, 'skill_type', e.target.value)} style={inputStyle}>
                <option value="technical">🔧 Técnico</option>
                <option value="soft">💬 Blando</option>
              </select>
            </div>
            <div>
              <Label required>Peso %</Label>
              <input type="number" min="1" max="100" value={skill.weight} onChange={e => onChange(index, 'weight', parseInt(e.target.value) || 0)} style={inputStyle} />
            </div>
          </div>
          <div>
            <Label>Descripción</Label>
            <input value={skill.description} onChange={e => onChange(index, 'description', e.target.value)} placeholder="Qué evalúa este skill..." style={inputStyle} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <Label>Preguntas de entrevista</Label>
              <button onClick={() => onChange(index, 'questions', [...(skill.questions || []), ''])}
                style={{ fontSize: '11px', padding: '4px 10px', border: `1px solid ${BONDY_ORANGE}`, background: 'transparent', color: BONDY_ORANGE, borderRadius: '6px', cursor: 'pointer', fontFamily: FONT_MONO }}>
                + Pregunta
              </button>
            </div>
            {(skill.questions || []).map((q, qi) => (
              <div key={qi} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '6px' }}>
                <span style={{ color: '#bbb', fontSize: '11px', fontFamily: FONT_MONO, paddingTop: '10px', flexShrink: 0 }}>{qi + 1}.</span>
                <input value={q} onChange={e => { const nq = [...skill.questions]; nq[qi] = e.target.value; onChange(index, 'questions', nq) }} placeholder="Pregunta..." style={{ ...inputStyle, flex: 1 }} />
                <button onClick={() => onChange(index, 'questions', skill.questions.filter((_, i) => i !== qi))} style={{ padding: '8px', border: 'none', background: 'none', cursor: 'pointer', color: '#ddd' }}>✕</button>
              </div>
            ))}
            {(!skill.questions || skill.questions.length === 0) && <p style={{ fontSize: '12px', color: '#bbb', fontStyle: 'italic', margin: 0 }}>Sin preguntas.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function ScorecardForm({ initial, onSave, onCancel, existingClients }) {
  const [clientName, setClientName] = useState(initial?.client_name || '')
  const [customClient, setCustomClient] = useState('')
  const [scorecardName, setScorecardName] = useState(initial?.scorecard_name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [skills, setSkills] = useState(initial?.scorecard_data?.skills || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isDefault = clientName === '__DEFAULT__'
  const totalWeight = skills.reduce((s, sk) => s + (parseInt(sk.weight) || 0), 0)
  const techSkills = skills.filter(s => s.skill_type === 'technical')
  const softSkills = skills.filter(s => s.skill_type === 'soft')

  const addSkill = (type) => setSkills(prev => [...prev, { id: `skill_${Date.now()}`, name: '', weight: 10, skill_type: type, description: '', questions: [] }])
  const updateSkill = (i, field, value) => setSkills(prev => { const c = [...prev]; c[i] = { ...c[i], [field]: value }; return c })
  const deleteSkill = (i) => setSkills(prev => prev.filter((_, idx) => idx !== i))
  const moveSkill = (i, dir) => setSkills(prev => { const c = [...prev]; const t = i + dir; [c[i], c[t]] = [c[t], c[i]]; return c })

  const save = async () => {
    const finalClient = clientName === '__CUSTOM__' ? customClient.trim() : clientName
    if (!finalClient) return setError('Seleccioná o ingresá un cliente')
    if (!scorecardName.trim()) return setError('Ingresá un nombre')
    if (skills.length === 0) return setError('Agregá al menos un skill')
    setSaving(true); setError(null)
    try {
      const method = initial?.id ? 'PUT' : 'POST'
      const body = { ...(initial?.id ? { id: initial.id } : {}), client_name: finalClient, scorecard_name: scorecardName.trim(), description: description.trim() || null, scorecard_data: { skills } }
      const res = await fetch('/api/scorecards', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSave(data.scorecard)
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '18px', fontWeight: 700, margin: 0 }}>{initial?.id ? 'Editar scorecard' : 'Nueva scorecard'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <Label required>Cliente</Label>
            <select value={clientName} onChange={e => setClientName(e.target.value)} style={inputStyle}>
              <option value="">— Seleccioná —</option>
              <option value="__DEFAULT__">⭐ Default (sin cliente)</option>
              <option value="__CUSTOM__">✏️ Nuevo cliente</option>
              {existingClients.filter(c => c !== '__DEFAULT__').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {clientName === '__CUSTOM__' && <input value={customClient} onChange={e => setCustomClient(e.target.value)} placeholder="Nombre del cliente..." style={{ ...inputStyle, marginTop: '8px' }} />}
            {isDefault && <p style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>Se usa cuando no se selecciona cliente específico.</p>}
          </div>
          <div>
            <Label required>Nombre de la scorecard</Label>
            <input value={scorecardName} onChange={e => setScorecardName(e.target.value)} placeholder="Ej: IOL — Backend Python Senior" style={inputStyle} />
          </div>
        </div>
        <div>
          <Label>Descripción</Label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción breve del perfil que evalúa..." style={inputStyle} />
        </div>
        {skills.length > 0 && (
          <div style={{ background: totalWeight === 100 ? '#f0fdf4' : '#fff7ed', border: `1px solid ${totalWeight === 100 ? '#86efac' : '#fde68a'}`, borderRadius: '8px', padding: '10px 14px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: totalWeight === 100 ? '#16a34a' : '#d97706', fontFamily: FONT_MONO }}>{totalWeight === 100 ? '✓' : '⚠'} Peso total: {totalWeight}%</span>
            <span style={{ fontSize: '11px', color: '#999' }}>{techSkills.length} técnicos · {softSkills.length} blandos</span>
            {totalWeight !== 100 && <span style={{ fontSize: '11px', color: '#d97706' }}>La IA normaliza si no suma 100.</span>}
          </div>
        )}
      </div>

      {/* Skills técnicos */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: BONDY_ORANGE, fontFamily: FONT_MONO }}>Skills Técnicos ({techSkills.length})</span>
          <button onClick={() => addSkill('technical')} style={{ padding: '8px 16px', border: `1.5px solid ${BONDY_ORANGE}`, background: 'transparent', color: BONDY_ORANGE, borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: FONT_MONO }}>+ Técnico</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {techSkills.length === 0 && <div style={{ border: '1.5px dashed #e5e7eb', borderRadius: '10px', padding: '20px', textAlign: 'center', color: '#bbb', fontSize: '13px' }}>Sin skills técnicos todavía.</div>}
          {skills.map((skill, i) => skill.skill_type === 'technical' && <SkillEditor key={skill.id || i} skill={skill} index={i} onChange={updateSkill} onDelete={deleteSkill} onMove={moveSkill} total={skills.length} />)}
        </div>
      </div>

      {/* Skills blandos */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4A90D9', fontFamily: FONT_MONO }}>Skills Blandos ({softSkills.length})</span>
          <button onClick={() => addSkill('soft')} style={{ padding: '8px 16px', border: '1.5px solid #4A90D9', background: 'transparent', color: '#4A90D9', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: FONT_MONO }}>+ Blando</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {softSkills.length === 0 && <div style={{ border: '1.5px dashed #e5e7eb', borderRadius: '10px', padding: '20px', textAlign: 'center', color: '#bbb', fontSize: '13px' }}>Sin skills blandos todavía.</div>}
          {skills.map((skill, i) => skill.skill_type === 'soft' && <SkillEditor key={skill.id || i} skill={skill} index={i} onChange={updateSkill} onDelete={deleteSkill} onMove={moveSkill} total={skills.length} />)}
        </div>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', fontSize: '13px' }}>⚠️ {error}</div>}

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '10px 24px', border: '1.5px solid #e5e7eb', background: 'white', color: '#666', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Cancelar</button>
        <button onClick={save} disabled={saving} style={{ padding: '10px 32px', border: 'none', background: saving ? '#ccc' : `linear-gradient(135deg, ${BONDY_ORANGE}, #F47C20)`, color: 'white', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700 }}>
          {saving ? 'Guardando...' : '✓ Guardar scorecard'}
        </button>
      </div>
    </div>
  )
}

function ScorecardRow({ sc, onEdit, onDeactivate, isDefault }) {
  const skills = sc.scorecard_data?.skills || []
  const techCount = skills.filter(s => s.skill_type === 'technical').length
  const softCount = skills.filter(s => s.skill_type === 'soft').length
  return (
    <div style={{ background: 'white', border: `1.5px solid ${isDefault ? '#ffd4b8' : '#e5e7eb'}`, borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
      {isDefault && <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFF3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>⭐</div>}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>{sc.scorecard_name}</span>
          {isDefault && <span style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: BONDY_ORANGE, background: 'rgba(224,92,0,0.08)', padding: '2px 6px', border: '1px solid rgba(224,92,0,0.2)', fontFamily: FONT_MONO }}>Default</span>}
        </div>
        <div style={{ fontSize: '12px', color: '#888' }}>
          <span style={{ color: BONDY_ORANGE, fontWeight: 600 }}>{isDefault ? 'Sin cliente asignado' : sc.client_name}</span>
          <span style={{ margin: '0 8px', color: '#ddd' }}>·</span>
          <span>🔧 {techCount} técnicos · 💬 {softCount} blandos</span>
          {sc.description && <><span style={{ margin: '0 8px', color: '#ddd' }}>·</span><span style={{ color: '#aaa' }}>{sc.description}</span></>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button onClick={onEdit} style={{ padding: '7px 16px', border: `1.5px solid ${BONDY_ORANGE}`, background: 'transparent', color: BONDY_ORANGE, borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Editar</button>
        {!isDefault && <button onClick={onDeactivate} style={{ padding: '7px 12px', border: '1px solid #e5e7eb', background: 'white', color: '#aaa', borderRadius: '7px', cursor: 'pointer', fontSize: '12px' }}>Desactivar</button>}
      </div>
    </div>
  )
}

function ScorecardContent({ embedded }) {
  const [scorecards, setScorecards] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const existingClients = [...new Set(scorecards.map(s => s.client_name))].sort()

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/scorecards')
      const data = await res.json()
      setScorecards(data.scorecards || [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSave = () => {
    load(); setView('list'); setEditing(null)
    setSuccessMsg('Scorecard guardada ✓')
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const handleDeactivate = async (id) => {
    if (!confirm('¿Desactivar esta scorecard?')) return
    await fetch('/api/scorecards', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active: false }) })
    load()
  }

  return (
    <div style={embedded ? {} : { padding: '48px 64px' }}>
      {!embedded && (
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: BONDY_ORANGE, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: FONT_MONO }}>
            <span style={{ display: 'block', width: '20px', height: '1px', background: BONDY_ORANGE }} />
            Gestión de evaluaciones
          </div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '40px', fontWeight: 900, color: '#111', marginBottom: '12px', lineHeight: 1 }}>Scorecards<br /><em style={{ color: BONDY_ORANGE }}>por cliente.</em></h1>
          <p style={{ fontSize: '14px', color: '#888', maxWidth: '520px', lineHeight: 1.7 }}>Creá y gestioná scorecards específicas por cliente. Los recruiters las cargan automáticamente al seleccionar el cliente en el asistente.</p>
        </div>
      )}

      {embedded && (
        <div style={{ marginBottom: '24px', padding: '16px 20px', background: 'rgba(224,92,0,0.04)', border: '1px solid rgba(224,92,0,0.12)', borderRadius: '10px' }}>
          <p style={{ fontSize: '13px', color: '#555', margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: BONDY_ORANGE }}>Client Management</strong> — Creá y gestioná scorecards por cliente. Se cargan automáticamente cuando el recruiter selecciona el cliente en el asistente.
          </p>
        </div>
      )}

      {successMsg && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', color: '#16a34a', fontSize: '13px', marginBottom: '24px' }}>✓ {successMsg}</div>}

      {view === 'list' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
            <button onClick={() => { setEditing(null); setView('new') }} style={{ padding: '12px 28px', border: 'none', background: `linear-gradient(135deg, ${BONDY_ORANGE}, #F47C20)`, color: 'white', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>+ Nueva scorecard</button>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#bbb', fontSize: '14px' }}>Cargando...</div>
          ) : scorecards.length === 0 ? (
            <div style={{ border: '1.5px dashed #e5e7eb', borderRadius: '14px', padding: '60px', textAlign: 'center' }}>
              <p style={{ color: '#bbb', fontSize: '15px', marginBottom: '20px' }}>No hay scorecards todavía.</p>
              <button onClick={() => setView('new')} style={{ padding: '10px 24px', border: `1.5px solid ${BONDY_ORANGE}`, background: 'transparent', color: BONDY_ORANGE, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>Crear la primera</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {scorecards.filter(s => s.client_name === '__DEFAULT__').map(sc => (
                <ScorecardRow key={sc.id} sc={sc} onEdit={() => { setEditing(sc); setView('edit') }} onDeactivate={() => handleDeactivate(sc.id)} isDefault />
              ))}
              {scorecards.filter(s => s.client_name !== '__DEFAULT__').map(sc => (
                <ScorecardRow key={sc.id} sc={sc} onEdit={() => { setEditing(sc); setView('edit') }} onDeactivate={() => handleDeactivate(sc.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {(view === 'new' || view === 'edit') && (
        <ScorecardForm initial={view === 'edit' ? editing : null} existingClients={existingClients} onSave={handleSave} onCancel={() => { setView('list'); setEditing(null) }} />
      )}
    </div>
  )
}

export default function ScorecardAdminPage({ embedded = false }) {
  if (embedded) {
    return <ScorecardContent embedded />
  }

  return (
    <main style={{ background: '#F9F8F6', minHeight: '100vh' }}>
      <nav style={{ borderBottom: '1px solid #EBEBEB', padding: '20px 64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(249,248,246,0.95)', position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(8px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BondyLogo />
          <span style={{ fontSize: '18px', fontWeight: 900, color: '#111', letterSpacing: '-0.02em', fontFamily: FONT_DISPLAY }}>Bond<em style={{ color: BONDY_ORANGE, fontStyle: 'italic' }}>y</em>.</span>
          <span style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: BONDY_ORANGE, background: 'rgba(224,92,0,0.08)', padding: '3px 8px', border: '1px solid rgba(224,92,0,0.2)', fontFamily: FONT_MONO }}>Admin · Scorecards</span>
        </div>
        <Link href="/internal" style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', textDecoration: 'none', fontFamily: FONT_MONO }}>← Volver al hub</Link>
      </nav>
      <ScorecardContent embedded={false} />
    </main>
  )
}
