'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

const O = '#E05C00'
const OL = '#F47C20'
const B = '#111'
const G = '#888885'
const BG = '#F9F8F6'
const RULE = '#EBEBEB'

const mono = { fontFamily: 'DM Mono, monospace' }
const serif = { fontFamily: 'Playfair Display, serif' }

const Label = ({ children }) => (
  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#555', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase', ...mono }}>
    {children}
  </label>
)

const inputStyle = {
  width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '10px',
  padding: '10px 14px', fontSize: '14px', outline: 'none',
  fontFamily: 'inherit', backgroundColor: 'white', color: B,
  boxSizing: 'border-box',
}

const SKILL_TYPES = [
  { value: 'technical', label: '🔧 Técnico' },
  { value: 'soft', label: '💬 Soft skill' },
]

const SCORECARD_TYPES = [
  { value: 'technical', label: 'Técnico' },
  { value: 'cultural', label: 'Cultural Fit' },
]

function ScorecardEditor({ scorecard, onSave, onCancel }) {
  const [name, setName] = useState(scorecard?.name || '')
  const [description, setDescription] = useState(scorecard?.description || '')
  const [type, setType] = useState(scorecard?.scorecard_type || 'technical')
  const [skills, setSkills] = useState(scorecard?.skills || [
    { id: 'skill_1', name: '', type: 'technical', weight: 20, description: '', questions: [''] }
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const totalWeight = skills.reduce((s, sk) => s + (parseInt(sk.weight) || 0), 0)

  const addSkill = () => {
    const newId = 'skill_' + Date.now()
    setSkills(prev => [...prev, { id: newId, name: '', type: 'technical', weight: 10, description: '', questions: [''] }])
  }

  const removeSkill = (idx) => setSkills(prev => prev.filter((_, i) => i !== idx))

  const updateSkill = (idx, field, value) => {
    setSkills(prev => prev.map((sk, i) => i === idx ? { ...sk, [field]: value } : sk))
  }

  const addQuestion = (skillIdx) => {
    setSkills(prev => prev.map((sk, i) => i === skillIdx
      ? { ...sk, questions: [...(sk.questions || []), ''] }
      : sk))
  }

  const updateQuestion = (skillIdx, qIdx, value) => {
    setSkills(prev => prev.map((sk, i) => i === skillIdx
      ? { ...sk, questions: sk.questions.map((q, qi) => qi === qIdx ? value : q) }
      : sk))
  }

  const removeQuestion = (skillIdx, qIdx) => {
    setSkills(prev => prev.map((sk, i) => i === skillIdx
      ? { ...sk, questions: sk.questions.filter((_, qi) => qi !== qIdx) }
      : sk))
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es requerido'); return }
    if (totalWeight !== 100) { setError(`Los pesos deben sumar 100 (actual: ${totalWeight})`); return }
    setSaving(true); setError(null)
    try {
      const cleanedSkills = skills.map(sk => ({
        ...sk,
        id: sk.id || ('skill_' + sk.name.toLowerCase().replace(/\s+/g, '_')),
        weight: parseInt(sk.weight) || 0,
        questions: (sk.questions || []).filter(q => q.trim()),
      }))
      await onSave({ name, description, scorecard_type: type, skills: cleanedSkills })
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e5e7eb', padding: '28px' }}>
      <h3 style={{ ...serif, fontSize: '18px', fontWeight: 700, margin: '0 0 24px', color: B }}>
        {scorecard ? 'Editar scorecard' : 'Nueva scorecard'}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <Label>Nombre del scorecard</Label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Scorecard Técnico Backend" style={inputStyle} />
        </div>
        <div>
          <Label>Tipo</Label>
          <select value={type} onChange={e => setType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {SCORECARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <Label>Descripción (opcional)</Label>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Para qué roles se usa esta scorecard..." style={inputStyle} />
      </div>

      {/* Skills */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: B }}>Skills evaluados</span>
          <span style={{ ...mono, fontSize: '11px', color: totalWeight === 100 ? '#22c55e' : '#ef4444', marginLeft: '10px' }}>
            Peso total: {totalWeight}/100
          </span>
        </div>
        <button onClick={addSkill} style={{ ...mono, fontSize: '11px', padding: '6px 14px', borderRadius: '8px', background: O, color: 'white', border: 'none', cursor: 'pointer', letterSpacing: '0.05em' }}>
          + Agregar skill
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {skills.map((skill, idx) => (
          <div key={skill.id || idx} style={{ background: '#FAFAFA', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '10px', marginBottom: '10px', alignItems: 'end' }}>
              <div>
                <Label>Nombre del skill</Label>
                <input value={skill.name} onChange={e => updateSkill(idx, 'name', e.target.value)}
                  placeholder="Python & Ecosystem" style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} />
              </div>
              <div style={{ width: '120px' }}>
                <Label>Tipo</Label>
                <select value={skill.type} onChange={e => updateSkill(idx, 'type', e.target.value)}
                  style={{ ...inputStyle, fontSize: '12px', padding: '8px 12px', cursor: 'pointer', width: '120px' }}>
                  {SKILL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div style={{ width: '80px' }}>
                <Label>Peso %</Label>
                <input type="number" min="0" max="100" value={skill.weight}
                  onChange={e => updateSkill(idx, 'weight', e.target.value)}
                  style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px', width: '80px', textAlign: 'center' }} />
              </div>
              <button onClick={() => removeSkill(idx)} style={{ width: '32px', height: '32px', marginBottom: '2px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <Label>Descripción del skill</Label>
              <input value={skill.description || ''} onChange={e => updateSkill(idx, 'description', e.target.value)}
                placeholder="Qué evalúa este skill..." style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <Label>Preguntas guía</Label>
                <button onClick={() => addQuestion(idx)} style={{ ...mono, fontSize: '10px', color: O, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.05em' }}>
                  + pregunta
                </button>
              </div>
              {(skill.questions || []).map((q, qi) => (
                <div key={qi} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                  <input value={q} onChange={e => updateQuestion(idx, qi, e.target.value)}
                    placeholder={`Pregunta ${qi + 1}...`}
                    style={{ ...inputStyle, fontSize: '12px', padding: '7px 12px', flex: 1 }} />
                  {(skill.questions || []).length > 1 && (
                    <button onClick={() => removeQuestion(idx, qi)} style={{ padding: '7px 10px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer', fontSize: '14px' }}>×</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: '10px', background: 'white', border: '1.5px solid #e5e7eb', fontSize: '13px', cursor: 'pointer', color: G }}>
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '10px 24px', borderRadius: '10px', background: saving ? '#ccc' : O, color: 'white', border: 'none', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Guardando...' : 'Guardar scorecard'}
        </button>
      </div>
    </div>
  )
}

function ClientCard({ client, scorecards, onAddScorecard, onEditScorecard, onDeleteScorecard, onDeleteClient }) {
  const [expanded, setExpanded] = useState(false)
  const techSc = scorecards.filter(s => s.scorecard_type === 'technical')
  const cultSc = scorecards.filter(s => s.scorecard_type === 'cultural')
  const isDefault = client.name === 'DEFAULT_BONDY'

  return (
    <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: isDefault ? '#f0f0f0' : '#FFF8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
            {isDefault ? '⭐' : '🏢'}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: B }}>{client.display_name || client.name}</div>
            {client.industry && <div style={{ fontSize: '12px', color: G }}>{client.industry}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {techSc.length > 0 && <span style={{ ...mono, fontSize: '10px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '6px' }}>🔧 {techSc.length} técnica{techSc.length > 1 ? 's' : ''}</span>}
            {cultSc.length > 0 && <span style={{ ...mono, fontSize: '10px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '6px' }}>💬 {cultSc.length} cultural</span>}
            {techSc.length === 0 && cultSc.length === 0 && <span style={{ ...mono, fontSize: '10px', color: '#ccc' }}>Sin scorecards</span>}
          </div>
          {!isDefault && (
            <button onClick={e => { e.stopPropagation(); onDeleteClient(client.id) }}
              style={{ fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}
              title="Desactivar cliente">✕</button>
          )}
          <span style={{ color: G, fontSize: '14px' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${RULE}`, padding: '20px 24px' }}>
          {/* Scorecards técnicas */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ ...mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: G }}>Scorecards técnicas</span>
              <button onClick={() => onAddScorecard(client, 'technical')}
                style={{ ...mono, fontSize: '11px', padding: '4px 12px', borderRadius: '6px', background: O, color: 'white', border: 'none', cursor: 'pointer' }}>
                + Nueva
              </button>
            </div>
            {techSc.length === 0
              ? <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>Sin scorecards técnicas. Creá una para este cliente.</p>
              : techSc.map(sc => (
                <ScorecardRow key={sc.id} sc={sc} onEdit={() => onEditScorecard(client, sc)} onDelete={() => onDeleteScorecard(sc.id)} />
              ))}
          </div>

          {/* Scorecards culturales */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ ...mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: G }}>Cultural Fit</span>
              <button onClick={() => onAddScorecard(client, 'cultural')}
                style={{ ...mono, fontSize: '11px', padding: '4px 12px', borderRadius: '6px', background: '#1d4ed8', color: 'white', border: 'none', cursor: 'pointer' }}>
                + Nueva
              </button>
            </div>
            {cultSc.length === 0
              ? <p style={{ fontSize: '12px', color: '#bbb', margin: 0 }}>Sin scorecard de cultural fit.</p>
              : cultSc.map(sc => (
                <ScorecardRow key={sc.id} sc={sc} onEdit={() => onEditScorecard(client, sc)} onDelete={() => onDeleteScorecard(sc.id)} />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ScorecardRow({ sc, onEdit, onDelete }) {
  const totalSkills = sc.skills?.length || 0
  const totalWeight = sc.skills?.reduce((s, sk) => s + (sk.weight || 0), 0) || 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: '#FAFAFA', border: '1px solid #f0f0f0', marginBottom: '8px' }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: B, marginBottom: '2px' }}>{sc.name}</div>
        <div style={{ ...mono, fontSize: '10px', color: G }}>
          {totalSkills} skills · peso total: {totalWeight}%
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onEdit} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '7px', background: 'white', border: '1.5px solid #e5e7eb', cursor: 'pointer', color: G }}>
          Editar
        </button>
        <button onClick={onDelete} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '7px', background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer', color: '#dc2626' }}>
          Eliminar
        </button>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { data: session } = useSession()
  const [clients, setClients] = useState([])
  const [scorecards, setScorecards] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingScorecard, setEditingScorecard] = useState(null) // { client, scorecard? }
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientDisplay, setNewClientDisplay] = useState('')
  const [newClientIndustry, setNewClientIndustry] = useState('')
  const [savingClient, setSavingClient] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [cr, sr] = await Promise.all([
        fetch('/api/clients').then(r => r.json()),
        fetch('/api/scorecards').then(r => r.json()),
      ])
      setClients(cr.clients || [])
      setScorecards(sr.scorecards || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleSaveScorecard = async (formData) => {
    const { client, scorecard } = editingScorecard
    if (scorecard) {
      // Update
      await fetch(`/api/scorecards/byid?id=${scorecard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, updated_by: session?.user?.email }),
      })
    } else {
      // Create
      await fetch('/api/scorecards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, client_id: client.id, client_name: client.name, created_by: session?.user?.email }),
      })
    }
    setEditingScorecard(null)
    loadData()
  }

  const handleDeleteScorecard = async (id) => {
    if (!confirm('¿Eliminar esta scorecard?')) return
    await fetch(`/api/scorecards/byid?id=${id}`, { method: 'DELETE' })
    loadData()
  }

  const handleDeleteClient = async (id) => {
    if (!confirm('¿Desactivar este cliente?')) return
    await fetch('/api/clients', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: false }),
    })
    loadData()
  }

  const handleAddClient = async () => {
    if (!newClientName.trim()) return
    setSavingClient(true)
    await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClientName, display_name: newClientDisplay || newClientName, industry: newClientIndustry }),
    })
    setNewClientName(''); setNewClientDisplay(''); setNewClientIndustry('')
    setShowNewClient(false)
    setSavingClient(false)
    loadData()
  }

  const getClientScorecards = (clientName) => scorecards.filter(s => s.client_name === clientName)

  // Ordenar: DEFAULT_BONDY primero, luego alfabético
  const sortedClients = [...clients].sort((a, b) => {
    if (a.name === 'DEFAULT_BONDY') return -1
    if (b.name === 'DEFAULT_BONDY') return 1
    return (a.display_name || a.name).localeCompare(b.display_name || b.name)
  })

  return (
    <main style={{ background: BG, minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${RULE}`, padding: '20px 64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(249,248,246,0.95)', position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(8px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ ...serif, fontSize: '18px', fontWeight: 900, color: B, letterSpacing: '-0.02em' }}>
            Bond<em style={{ color: O, fontStyle: 'italic' }}>y</em>.
          </span>
          <span style={{ ...mono, fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: O, background: 'rgba(224,92,0,0.08)', padding: '3px 8px', border: '1px solid rgba(224,92,0,0.2)' }}>
            Admin
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {session?.user?.image && <img src={session.user.image} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />}
          <Link href="/internal" style={{ ...mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: G, textDecoration: 'none' }}>← Volver</Link>
        </div>
      </nav>

      <div style={{ padding: '40px 64px' }}>
        {editingScorecard ? (
          <div>
            <div style={{ ...mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: G, marginBottom: '20px' }}>
              Cliente: <strong style={{ color: B }}>{editingScorecard.client.display_name || editingScorecard.client.name}</strong>
              {' · '}
              {editingScorecard.scorecard ? 'Editando scorecard' : `Nueva scorecard ${editingScorecard.type === 'cultural' ? 'cultural' : 'técnica'}`}
            </div>
            <ScorecardEditor
              scorecard={editingScorecard.scorecard
                ? { ...editingScorecard.scorecard, scorecard_type: editingScorecard.scorecard.scorecard_type }
                : { scorecard_type: editingScorecard.type }
              }
              onSave={handleSaveScorecard}
              onCancel={() => setEditingScorecard(null)}
            />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px' }}>
              <div>
                <h1 style={{ ...serif, fontSize: '36px', fontWeight: 900, color: B, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                  Gestión de <em style={{ color: O, fontStyle: 'italic' }}>scorecards</em>
                </h1>
                <p style={{ fontSize: '14px', color: G, margin: 0 }}>
                  Configurá las scorecards técnicas y culturales por cliente.
                </p>
              </div>
              <button onClick={() => setShowNewClient(true)}
                style={{ padding: '12px 24px', borderRadius: '10px', background: B, color: 'white', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', ...mono, letterSpacing: '0.05em' }}>
                + Nuevo cliente
              </button>
            </div>

            {showNewClient && (
              <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e5e7eb', padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ ...serif, fontSize: '16px', fontWeight: 700, margin: '0 0 16px', color: B }}>Nuevo cliente</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <Label>Código interno *</Label>
                    <input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="IOL" style={inputStyle} />
                  </div>
                  <div>
                    <Label>Nombre para mostrar</Label>
                    <input value={newClientDisplay} onChange={e => setNewClientDisplay(e.target.value)} placeholder="IOL (Invertir Online)" style={inputStyle} />
                  </div>
                  <div>
                    <Label>Industria</Label>
                    <input value={newClientIndustry} onChange={e => setNewClientIndustry(e.target.value)} placeholder="Fintech" style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowNewClient(false)} style={{ padding: '9px 18px', borderRadius: '8px', background: 'white', border: '1.5px solid #e5e7eb', fontSize: '13px', cursor: 'pointer', color: G }}>Cancelar</button>
                  <button onClick={handleAddClient} disabled={savingClient || !newClientName.trim()}
                    style={{ padding: '9px 18px', borderRadius: '8px', background: !newClientName.trim() ? '#ccc' : O, color: 'white', border: 'none', fontSize: '13px', fontWeight: 700, cursor: !newClientName.trim() ? 'not-allowed' : 'pointer' }}>
                    {savingClient ? 'Guardando...' : 'Crear cliente'}
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: G }}>Cargando...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sortedClients.map(client => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    scorecards={getClientScorecards(client.name)}
                    onAddScorecard={(c, type) => setEditingScorecard({ client: c, scorecard: null, type })}
                    onEditScorecard={(c, sc) => setEditingScorecard({ client: c, scorecard: sc, type: sc.scorecard_type })}
                    onDeleteScorecard={handleDeleteScorecard}
                    onDeleteClient={handleDeleteClient}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
