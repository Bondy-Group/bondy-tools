'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

const tw = {
  bg: '#FEFCF9', white: '#FFFFFF', ink: '#1A1A1A', inkMid: '#3A3530',
  inkSub: '#5A5550', inkFaint: '#7A7874', rule: '#E8E4DE', green: '#4A8C40',
  greenTint: 'rgba(74,140,64,0.06)', orange: '#C06A2D',
}
const serif = "'Special Elite', Georgia, serif"
const mono = "'Courier Prime', Courier, monospace"
const ui = "'Plus Jakarta Sans', system-ui, sans-serif"

const STATUS_OPTS = ['new', 'active', 'archived', 'spam', 'hired_elsewhere']

function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function TalentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { status: authStatus } = useSession()
  const [talent, setTalent] = useState(null)
  const [edits, setEdits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [savedAt, setSavedAt] = useState(null)
  const [saving, setSaving] = useState(false)
  const [newTag, setNewTag] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/talent-pool/${params.id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setTalent(data.talent)
      setEdits(data.edits || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authStatus === 'authenticated') load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, params.id])

  async function patchTalent(patch) {
    setSaving(true)
    try {
      const res = await fetch(`/api/talent-pool/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'update failed')
      setTalent(data.talent)
      setSavedAt(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function copyEditLink() {
    // Refetch para obtener edit_token (no viene en el list)
    const res = await fetch(`/api/talent-pool/${params.id}`)
    const data = await res.json()
    const token = data?.talent?.edit_token
    if (!token) {
      alert('No se pudo obtener el token')
      return
    }
    const url = `https://wearebondy.com/es/jobs/edit?token=${encodeURIComponent(token)}`
    try {
      await navigator.clipboard.writeText(url)
      alert(`Link copiado al clipboard:\n${url}`)
    } catch {
      prompt('Copiá este link:', url)
    }
  }

  async function handleDelete() {
    if (!confirm('Hard delete: borra al candidato + edit history. Irreversible. ¿Seguir?')) return
    const res = await fetch(`/api/talent-pool/${params.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/internal/talent-pool')
    else alert('Delete failed')
  }

  if (authStatus === 'loading' || loading) {
    return <div style={{ padding: 32, background: tw.bg, minHeight: '100vh', fontFamily: mono, fontSize: 13, color: tw.inkFaint }}>Cargando…</div>
  }
  if (!talent) {
    return <div style={{ padding: 32, background: tw.bg, minHeight: '100vh', fontFamily: mono, fontSize: 13, color: tw.orange }}>{error || 'No encontrado'}</div>
  }

  return (
    <div style={{ background: tw.bg, minHeight: '100vh', fontFamily: ui, color: tw.ink }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${tw.rule}`, background: tw.white, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 0 }}>
            <Link href="/internal/talent-pool" style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: tw.inkFaint, textDecoration: 'none', flexShrink: 0 }}>
              ← Talent Pool
            </Link>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontFamily: serif, fontSize: 22, fontWeight: 400, color: tw.inkMid }}>{talent.name || '—'}</h1>
              <div style={{ fontFamily: mono, fontSize: 11, color: tw.inkFaint, marginTop: 2 }}>
                {talent.email}{talent.linkedin_url ? ' · ' : ''}{talent.linkedin_url ? <a href={talent.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: tw.green }}>LinkedIn ↗</a> : null}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: mono, fontSize: 10, color: saving ? tw.green : tw.inkFaint }}>
              {saving ? 'Guardando…' : savedAt ? `✓ ${savedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : ''}
            </span>
            <button onClick={copyEditLink} style={btnSecondary(false)}>Copiar edit link</button>
            <button onClick={handleDelete} style={{ ...btnSecondary(false), color: tw.orange, borderColor: tw.orange }}>Borrar</button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ maxWidth: 1100, margin: '16px auto 0', padding: '0 32px' }}>
          <div style={{ padding: 14, background: '#FFF4F0', border: `1px solid ${tw.orange}`, color: tw.orange, fontFamily: mono, fontSize: 13 }}>{error}</div>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 32, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24, alignItems: 'start' }}>
        {/* Main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Datos básicos */}
          <Card title="Datos básicos">
            <Row label="Posición actual" value={talent.current_position} />
            <Row label="Empresa actual" value={talent.current_company} />
            <Row label="Años de experiencia" value={talent.years_experience} />
            <Row label="Ubicación" value={[talent.location_city, talent.location_country].filter(Boolean).join(', ')} />
            <Row label="Área primaria" value={talent.primary_area} />
            <Row label="Seniority" value={talent.seniority} />
          </Card>

          {/* Skills */}
          <Card title={`Skills (${(talent.skills || []).length})`}>
            {talent.skills?.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {talent.skills.map((s) => <Chip key={s}>{s}</Chip>)}
              </div>
            ) : <Empty />}
          </Card>

          {/* Preferencias */}
          <Card title="Preferencias">
            <Row label="Modalidad" value={(talent.modality_preference || []).join(', ')} />
            <Row label="Tipo de contrato" value={(talent.contract_preference || []).join(', ')} />
            <Row label="Inglés" value={talent.english_level} />
            <Row label="Español" value={talent.spanish_level} />
            <Row label="Relocate" value={talent.open_to_relocate ? 'Sí' : '—'} />
            <Row label="Viajes" value={talent.willing_to_travel ? 'Sí' : '—'} />
          </Card>

          {/* Compensación */}
          <Card title="Compensación">
            <Row
              label="Salario deseado"
              value={
                talent.desired_salary_amount
                  ? `${talent.desired_salary_currency || ''} ${Number(talent.desired_salary_amount).toLocaleString()} ${talent.desired_salary_period === 'yearly' ? '/ año' : talent.desired_salary_period === 'monthly' ? '/ mes' : ''}`
                  : null
              }
            />
            <Row label="Notas" value={talent.desired_salary_notes} />
          </Card>

          {/* Disponibilidad */}
          <Card title="Disponibilidad">
            <Row label="Disponible desde" value={talent.available_from} />
            <Row label="Aviso de renuncia" value={talent.notice_period} />
          </Card>

          {/* Pitch */}
          {talent.pitch && (
            <Card title="Pitch del candidato">
              <p style={{ fontFamily: ui, fontSize: 14, lineHeight: 1.7, color: tw.inkMid, margin: 0, whiteSpace: 'pre-wrap' }}>{talent.pitch}</p>
            </Card>
          )}

          {/* Edit history */}
          <Card title={`Historial de ediciones (${edits.length})`}>
            {edits.length === 0 ? <Empty>El candidato todavía no editó el perfil.</Empty> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {edits.map((e) => (
                  <div key={e.id} style={{ borderLeft: `2px solid ${tw.green}`, paddingLeft: 12, fontFamily: ui, fontSize: 12, color: tw.inkSub }}>
                    <div style={{ fontFamily: mono, fontSize: 10, color: tw.inkFaint }}>{fmtDateTime(e.created_at)} · {e.source}</div>
                    <div style={{ marginTop: 2 }}>{(e.fields_changed || []).join(', ') || '(sin detalle)'}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar admin */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 80 }}>
          <Card title="Admin">
            <FieldLabel>Status</FieldLabel>
            <select
              value={talent.status || 'new'}
              onChange={(e) => patchTalent({ status: e.target.value })}
              style={selectStyle()}
            >
              {STATUS_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>

            <div style={{ marginTop: 14 }}>
              <FieldLabel>Notas internas</FieldLabel>
              <textarea
                defaultValue={talent.notes || ''}
                onBlur={(e) => {
                  if (e.target.value !== (talent.notes || '')) patchTalent({ notes: e.target.value })
                }}
                style={{ ...selectStyle(), minHeight: 100, resize: 'vertical', lineHeight: 1.5 }}
                placeholder="Notas que solo ve el equipo de Bondy…"
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <FieldLabel>Tags internos</FieldLabel>
              {(talent.internal_tags || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  {talent.internal_tags.map((t) => (
                    <span key={t} style={chipStyle}>
                      {t}
                      <button
                        onClick={() => patchTalent({ internal_tags: talent.internal_tags.filter((x) => x !== t) })}
                        style={{ background: 'transparent', border: 'none', color: tw.orange, cursor: 'pointer', marginLeft: 4 }}
                      >×</button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTag.trim()) {
                      e.preventDefault()
                      const tag = newTag.trim()
                      const next = [...(talent.internal_tags || []), tag]
                      patchTalent({ internal_tags: next })
                      setNewTag('')
                    }
                  }}
                  placeholder="Nuevo tag + Enter"
                  style={selectStyle()}
                />
              </div>
            </div>
          </Card>

          <Card title="Metadata">
            <Row label="Llegó" value={fmtDateTime(talent.created_at)} small />
            <Row label="Última edit (candidato)" value={fmtDateTime(talent.last_edited_by_candidate_at)} small />
            <Row label="Veces editado" value={talent.edit_count || 0} small />
            <Row label="Source" value={talent.source} small />
            {talent.utm_source && <Row label="UTM" value={`${talent.utm_source} / ${talent.utm_medium || ''} / ${talent.utm_campaign || ''}`} small />}
            <Row label="Edit link expira" value={fmtDateTime(talent.edit_token_expires_at)} small />
          </Card>
        </aside>
      </div>
    </div>
  )
}

// ────── helpers ──────
function Card({ title, children }) {
  return (
    <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, padding: '18px 20px' }}>
      <h3 style={{ margin: '0 0 12px 0', fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: tw.inkFaint }}>{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, value, small }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: small ? '120px 1fr' : '160px 1fr', gap: 12, padding: '5px 0', alignItems: 'baseline' }}>
      <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: tw.inkFaint }}>{label}</div>
      <div style={{ fontFamily: ui, fontSize: small ? 12 : 14, color: value ? tw.inkMid : tw.inkFaint }}>{value || '—'}</div>
    </div>
  )
}

function FieldLabel({ children }) {
  return <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: tw.inkFaint, marginBottom: 6 }}>{children}</div>
}

function Chip({ children }) {
  return <span style={chipStyle}>{children}</span>
}

function Empty({ children }) {
  return <div style={{ fontFamily: ui, fontSize: 13, color: tw.inkFaint, fontStyle: 'italic' }}>{children || '—'}</div>
}

function selectStyle() {
  return {
    fontFamily: ui, fontSize: 13, padding: '8px 10px',
    background: tw.white, color: tw.ink, border: `1px solid ${tw.rule}`,
    outline: 'none', width: '100%', boxSizing: 'border-box',
  }
}

const chipStyle = {
  fontFamily: mono, fontSize: 11, padding: '3px 8px',
  background: tw.greenTint, color: tw.inkMid, border: `1px solid ${tw.green}`,
  display: 'inline-flex', alignItems: 'center', gap: 4,
}

function btnSecondary(disabled) {
  return {
    fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
    background: tw.white, color: tw.inkMid, border: `1px solid ${tw.rule}`, padding: '8px 14px',
    cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.6 : 1,
  }
}
