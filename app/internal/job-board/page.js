'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

/* ── Brand v4 typewriter tokens ── */
const tw = {
  bg: '#FEFCF9',
  ink: '#1A1A1A',
  inkMid: '#3A3530',
  inkSub: '#5A5550',
  inkFaint: '#7A7874',
  rule: '#E8E4DE',
  white: '#FFFFFF',
  green: '#4A8C40',
}
const serif = "'Special Elite', Georgia, serif"
const mono = "'Courier Prime', Courier, monospace"
const notebookBg = [
  'linear-gradient(90deg, transparent 68px, rgba(210,100,80,0.10) 68px, rgba(210,100,80,0.10) 69.5px, transparent 69.5px)',
  'repeating-linear-gradient(180deg, transparent 0px, transparent 31px, rgba(100,140,200,0.09) 31px, rgba(100,140,200,0.09) 32px)',
].join(',')

const SENIORITY_OPTIONS = ['Junior', 'SSR', 'Senior', 'Lead', 'Staff', 'Principal']
const CATEGORY_OPTIONS = ['Backend', 'Frontend', 'Fullstack', 'Mobile', 'Data', 'DevOps', 'QA', 'Hardware', 'Product', 'Design', 'Recruiting', 'Other']
const MODALITY_OPTIONS = ['Remote', 'Hybrid', 'On-site']
const STATUS_OPTIONS = ['draft', 'published', 'closed']

export default function JobBoardPage() {
  const { status: authStatus, data: session } = useSession()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ status: '', seniority: '', role_category: '', modality: '', q: '' })
  const [editing, setEditing] = useState(null) // null | 'new' | Role

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      for (const [k, v] of Object.entries(filters)) if (v) qs.append(k, v)
      const res = await fetch('/api/bondy-roles?' + qs.toString(), { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setRoles(data.roles || [])
    } catch (err) {
      setError(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authStatus === 'authenticated') load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, filters.status, filters.seniority, filters.role_category, filters.modality])

  // Debounce text search
  useEffect(() => {
    if (authStatus !== 'authenticated') return
    const id = setTimeout(load, 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q])

  async function handleSave(payload, id) {
    const url = id ? `/api/bondy-roles/${id}` : '/api/bondy-roles'
    const method = id ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Save failed')
    }
    setEditing(null)
    await load()
  }

  async function handleSoftDelete(id) {
    if (!confirm('¿Cerrar esta búsqueda? Queda en status=closed (no se borra).')) return
    const res = await fetch(`/api/bondy-roles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed' }),
    })
    if (!res.ok) {
      alert('Error cerrando la búsqueda')
      return
    }
    setEditing(null)
    await load()
  }

  async function handleTogglePublish(role) {
    const newStatus = role.status === 'published' ? 'draft' : 'published'
    const res = await fetch(`/api/bondy-roles/${role.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      alert('Error cambiando estado')
      return
    }
    await load()
  }

  if (authStatus === 'loading') {
    return <CenteredMsg>Cargando sesión…</CenteredMsg>
  }

  return (
    <div style={{ minHeight: '100vh', background: tw.bg, backgroundImage: notebookBg, fontFamily: mono, color: tw.ink }}>
      <Header session={session} />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'clamp(1.5rem,3vw,2rem) clamp(1rem,3vw,2.5rem)' }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: tw.green, marginBottom: '0.5rem' }}>
              — Admin · Job Board
            </div>
            <h1 style={{ fontFamily: serif, fontSize: 'clamp(2rem,4.5vw,3rem)', lineHeight: 1.05, color: tw.inkMid, margin: 0, opacity: 0.93 }}>
              Búsquedas abiertas.
            </h1>
            <p style={{ fontSize: '13px', color: tw.inkFaint, marginTop: '0.6rem', maxWidth: '560px' }}>
              Cada búsqueda publicada aparece en wearebondy.com/roles al toque (ISR 60s).
            </p>
          </div>
          <button onClick={() => setEditing('new')} style={btnGreen}>
            + Nueva búsqueda
          </button>
        </div>

        {/* Filters */}
        <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Buscar título o cliente…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            style={{ ...inputBase, flex: '1 1 220px', minWidth: '200px' }}
          />
          <Select label="Status" value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} options={STATUS_OPTIONS} />
          <Select label="Seniority" value={filters.seniority} onChange={(v) => setFilters((f) => ({ ...f, seniority: v }))} options={SENIORITY_OPTIONS} />
          <Select label="Categoría" value={filters.role_category} onChange={(v) => setFilters((f) => ({ ...f, role_category: v }))} options={CATEGORY_OPTIONS} />
          <Select label="Modalidad" value={filters.modality} onChange={(v) => setFilters((f) => ({ ...f, modality: v }))} options={MODALITY_OPTIONS} />
          <button onClick={() => setFilters({ status: '', seniority: '', role_category: '', modality: '', q: '' })} style={btnGhost}>
            Limpiar
          </button>
          <Link href="/internal/applications" style={{ ...btnGhost, textDecoration: 'none', display: 'inline-block' }}>
            Ver aplicaciones →
          </Link>
        </div>

        {/* Table */}
        {loading ? (
          <CenteredMsg>Cargando búsquedas…</CenteredMsg>
        ) : error ? (
          <CenteredMsg error>{error}</CenteredMsg>
        ) : roles.length === 0 ? (
          <CenteredMsg>Sin resultados para estos filtros.</CenteredMsg>
        ) : (
          <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8F5F0', borderBottom: `1px solid ${tw.rule}` }}>
                  <Th>#</Th>
                  <Th>Título</Th>
                  <Th>Cliente</Th>
                  <Th>Status</Th>
                  <Th>Seniority</Th>
                  <Th>Categoría</Th>
                  <Th>Modalidad</Th>
                  <Th style={{ textAlign: 'right' }}>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${tw.rule}` }}>
                    <Td muted>{r.position_number}</Td>
                    <Td>
                      <div style={{ fontFamily: serif, fontSize: '15px', color: tw.inkMid }}>{r.title}</div>
                      <div style={{ fontSize: '11px', color: tw.inkFaint }}>/{r.slug}</div>
                    </Td>
                    <Td>
                      {r.client_name || <span style={{ color: tw.inkFaint }}>—</span>}
                      {r.client_visible ? (
                        <span style={{ marginLeft: 6, fontSize: '9px', color: tw.green, border: `1px solid ${tw.green}`, padding: '1px 5px' }}>público</span>
                      ) : null}
                    </Td>
                    <Td>
                      <StatusBadge status={r.status} />
                    </Td>
                    <Td>{r.seniority || <span style={{ color: tw.inkFaint }}>—</span>}</Td>
                    <Td>{r.role_category || <span style={{ color: tw.inkFaint }}>—</span>}</Td>
                    <Td>{r.modality || <span style={{ color: tw.inkFaint }}>—</span>}</Td>
                    <Td style={{ textAlign: 'right' }}>
                      {r.status !== 'closed' && (
                        <button onClick={() => handleTogglePublish(r)} style={{ ...btnMini, marginRight: 6 }}>
                          {r.status === 'published' ? 'Despublicar' : 'Publicar'}
                        </button>
                      )}
                      <button onClick={() => setEditing(r)} style={btnMini}>
                        Editar
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {editing && (
        <EditDrawer
          role={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onSoftDelete={handleSoftDelete}
        />
      )}
    </div>
  )
}

/* ────────────────────────────────────────────
   Drawer with full edit form
──────────────────────────────────────────── */
function EditDrawer({ role, onClose, onSave, onSoftDelete }) {
  const isNew = !role
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(() => ({
    title: role?.title || '',
    status: role?.status || 'draft',
    seniority: role?.seniority || '',
    role_category: role?.role_category || '',
    client_name: role?.client_name || '',
    client_blurb: role?.client_blurb || '',
    client_visible: role?.client_visible || false,
    about_client: role?.about_client || '',
    tech_stack: role?.tech_stack?.join(', ') || '',
    modality: role?.modality || '',
    location: role?.location || '',
    countries: role?.countries?.join(', ') || '',
    english_level: role?.english_level || '',
    description_role: role?.description_role || '',
    description_requirements: role?.description_requirements || '',
    description_process: role?.description_process || '',
    benefits: role?.benefits?.join('\n') || '',
    min_salary_usd: role?.min_salary_usd ?? '',
    max_salary_usd: role?.max_salary_usd ?? '',
    salary_currency: role?.salary_currency || 'USD',
    salary_visible: role?.salary_visible || false,
    salary_note: role?.salary_note || '',
    is_featured: role?.is_featured || false,
  }))

  function up(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit() {
    setError(null)
    const payload = {
      ...form,
      tech_stack: form.tech_stack.split(',').map((s) => s.trim()).filter(Boolean),
      countries: form.countries.split(',').map((s) => s.trim()).filter(Boolean),
      benefits: form.benefits.split('\n').map((s) => s.trim()).filter(Boolean),
      min_salary_usd: form.min_salary_usd === '' ? null : Number(form.min_salary_usd),
      max_salary_usd: form.max_salary_usd === '' ? null : Number(form.max_salary_usd),
    }

    // Validate required fields for publishing
    if (payload.status === 'published') {
      const required = { title: 'Título', seniority: 'Seniority', role_category: 'Categoría', modality: 'Modalidad', description_role: 'Descripción del rol' }
      const missing = Object.entries(required).filter(([k]) => !payload[k])
      if (missing.length) {
        setError(`Para publicar faltan: ${missing.map(([, v]) => v).join(', ')}`)
        return
      }
    } else if (!payload.title) {
      setError('El título es obligatorio')
      return
    }

    setSaving(true)
    try {
      await onSave(payload, role?.id)
    } catch (err) {
      setError(err.message || 'Error al guardar')
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,26,26,0.28)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(720px, 95vw)',
          height: '100%',
          background: tw.bg,
          backgroundImage: notebookBg,
          borderLeft: `1px solid ${tw.rule}`,
          overflowY: 'auto',
          padding: 'clamp(1.5rem,3vw,2rem)',
          boxShadow: '-12px 0 32px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: `1px solid ${tw.rule}` }}>
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green, marginBottom: '0.3rem' }}>
              {isNew ? '○ Nueva búsqueda' : `● #${role.position_number}`}
            </div>
            <h2 style={{ fontFamily: serif, fontSize: '1.75rem', color: tw.inkMid, margin: 0, opacity: 0.93 }}>
              {isNew ? 'Crear búsqueda' : role.title}
            </h2>
          </div>
          <button onClick={onClose} style={{ ...btnGhost, padding: '6px 12px' }}>✕</button>
        </div>

        {/* Form grid */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          <Field label="Título *">
            <input value={form.title} onChange={(e) => up('title', e.target.value)} style={inputBase} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Status">
              <select value={form.status} onChange={(e) => up('status', e.target.value)} style={inputBase}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="¿Destacada?">
              <label style={checkboxRow}>
                <input type="checkbox" checked={form.is_featured} onChange={(e) => up('is_featured', e.target.checked)} />
                <span>Mostrar como featured en la lista pública</span>
              </label>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <Field label="Seniority *">
              <select value={form.seniority} onChange={(e) => up('seniority', e.target.value)} style={inputBase}>
                <option value="">—</option>
                {SENIORITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Categoría *">
              <select value={form.role_category} onChange={(e) => up('role_category', e.target.value)} style={inputBase}>
                <option value="">—</option>
                {CATEGORY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Modalidad *">
              <select value={form.modality} onChange={(e) => up('modality', e.target.value)} style={inputBase}>
                <option value="">—</option>
                {MODALITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Ubicación">
              <input value={form.location} onChange={(e) => up('location', e.target.value)} placeholder="Buenos Aires, Remote LATAM, ..." style={inputBase} />
            </Field>
            <Field label="Países (separados por coma)">
              <input value={form.countries} onChange={(e) => up('countries', e.target.value)} placeholder="AR, UY, CL" style={inputBase} />
            </Field>
          </div>

          <Field label="Nivel de inglés">
            <input value={form.english_level} onChange={(e) => up('english_level', e.target.value)} placeholder="B2, C1, conversacional..." style={inputBase} />
          </Field>

          {/* Cliente */}
          <div style={{ borderTop: `1px solid ${tw.rule}`, paddingTop: '1rem', marginTop: '0.5rem' }}>
            <SectionLabel>Cliente</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Cliente (nombre real)">
                <input value={form.client_name} onChange={(e) => up('client_name', e.target.value)} style={inputBase} />
              </Field>
              <Field label="¿Mostrar nombre públicamente?">
                <label style={checkboxRow}>
                  <input type="checkbox" checked={form.client_visible} onChange={(e) => up('client_visible', e.target.checked)} />
                  <span>Sí, revelar cliente en wearebondy.com/roles</span>
                </label>
              </Field>
            </div>
            <Field label='Blurb público (si cliente oculto — ej: "Fintech Series B LATAM")'>
              <input value={form.client_blurb} onChange={(e) => up('client_blurb', e.target.value)} style={inputBase} />
            </Field>
            <Field label="About client (párrafo descriptivo)">
              <textarea value={form.about_client} onChange={(e) => up('about_client', e.target.value)} rows={3} style={inputBase} />
            </Field>
          </div>

          {/* Contenido */}
          <div style={{ borderTop: `1px solid ${tw.rule}`, paddingTop: '1rem', marginTop: '0.5rem' }}>
            <SectionLabel>Contenido del rol</SectionLabel>
            <Field label="Descripción del rol *">
              <textarea value={form.description_role} onChange={(e) => up('description_role', e.target.value)} rows={4} style={inputBase} />
            </Field>
            <Field label="Requisitos">
              <textarea value={form.description_requirements} onChange={(e) => up('description_requirements', e.target.value)} rows={4} style={inputBase} />
            </Field>
            <Field label="Proceso (etapas)">
              <textarea value={form.description_process} onChange={(e) => up('description_process', e.target.value)} rows={3} style={inputBase} />
            </Field>
            <Field label="Tech stack (separado por coma)">
              <input value={form.tech_stack} onChange={(e) => up('tech_stack', e.target.value)} placeholder="React, Node.js, PostgreSQL" style={inputBase} />
            </Field>
            <Field label="Beneficios (uno por línea)">
              <textarea value={form.benefits} onChange={(e) => up('benefits', e.target.value)} rows={4} style={inputBase} />
            </Field>
          </div>

          {/* Salary */}
          <div style={{ borderTop: `1px solid ${tw.rule}`, paddingTop: '1rem', marginTop: '0.5rem' }}>
            <SectionLabel>Compensación</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <Field label="Mínimo (USD)">
                <input type="number" value={form.min_salary_usd} onChange={(e) => up('min_salary_usd', e.target.value)} style={inputBase} />
              </Field>
              <Field label="Máximo (USD)">
                <input type="number" value={form.max_salary_usd} onChange={(e) => up('max_salary_usd', e.target.value)} style={inputBase} />
              </Field>
              <Field label="Moneda">
                <input value={form.salary_currency} onChange={(e) => up('salary_currency', e.target.value)} style={inputBase} />
              </Field>
            </div>
            <Field label="¿Mostrar salario públicamente?">
              <label style={checkboxRow}>
                <input type="checkbox" checked={form.salary_visible} onChange={(e) => up('salary_visible', e.target.checked)} />
                <span>Sí, mostrar rango en la página pública</span>
              </label>
            </Field>
            <Field label="Nota de salario (si oculto, ej: 'Competitive USD')">
              <input value={form.salary_note} onChange={(e) => up('salary_note', e.target.value)} style={inputBase} />
            </Field>
          </div>

          {error && (
            <div style={{ background: 'rgba(184,74,58,0.06)', border: '1px solid rgba(184,74,58,0.2)', color: '#B84A3A', padding: '10px 14px', fontSize: '12px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${tw.rule}`, paddingTop: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <div>
              {!isNew && role.status !== 'closed' && (
                <button onClick={() => onSoftDelete(role.id)} style={{ ...btnGhost, color: '#B84A3A', borderColor: 'rgba(184,74,58,0.3)' }}>
                  Cerrar búsqueda
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={onClose} disabled={saving} style={btnGhost}>Cancelar</button>
              <button onClick={handleSubmit} disabled={saving} style={btnGreen}>
                {saving ? 'Guardando…' : isNew ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────
   Small presentational components
──────────────────────────────────────────── */
function Header({ session }) {
  return (
    <div style={{ borderBottom: `1px solid ${tw.rule}`, background: 'rgba(254,252,249,0.95)', backdropFilter: 'blur(6px)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0.9rem clamp(1rem,3vw,2.5rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/internal" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
          <svg width="22" height="22" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <rect x="4" y="5" width="14" height="12" rx="2.5" fill="#1A1A1A"/>
            <rect x="22" y="5" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".18"/>
            <rect x="4" y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".42"/>
            <rect x="22" y="22" width="14" height="12" rx="2.5" fill="#4A8C40"/>
          </svg>
          <span style={{ fontFamily: serif, fontSize: 15, letterSpacing: '0.04em' }}>BONDY · Tools</span>
        </Link>
        <span style={{ fontSize: '11px', letterSpacing: '0.1em', color: tw.inkFaint }}>
          {session?.user?.email}
        </span>
      </div>
    </div>
  )
}

function Th({ children, style }) {
  return (
    <th style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tw.inkFaint, textAlign: 'left', padding: '12px 14px', fontWeight: 400, ...style }}>
      {children}
    </th>
  )
}
function Td({ children, muted, style }) {
  return (
    <td style={{ padding: '12px 14px', color: muted ? tw.inkFaint : tw.inkSub, fontSize: '13px', verticalAlign: 'top', ...style }}>
      {children}
    </td>
  )
}

function StatusBadge({ status }) {
  const map = {
    draft: { bg: 'rgba(122,120,116,0.08)', color: tw.inkSub, border: 'rgba(122,120,116,0.2)' },
    published: { bg: 'rgba(74,140,64,0.08)', color: tw.green, border: 'rgba(74,140,64,0.25)' },
    closed: { bg: 'rgba(184,74,58,0.05)', color: '#B84A3A', border: 'rgba(184,74,58,0.2)' },
  }
  const s = map[status] || map.draft
  return (
    <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: s.color, background: s.bg, border: `1px solid ${s.border}`, padding: '2px 8px', display: 'inline-block' }}>
      {status}
    </span>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputBase, width: 'auto', flex: '0 0 auto' }}>
      <option value="">{label} (todos)</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tw.inkFaint, display: 'block', marginBottom: '0.3rem' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green, marginBottom: '0.75rem' }}>
      — {children}
    </div>
  )
}

function CenteredMsg({ children, error }) {
  return (
    <div style={{ padding: '3rem 1rem', textAlign: 'center', color: error ? '#B84A3A' : tw.inkFaint, fontSize: '13px' }}>
      {children}
    </div>
  )
}

/* ── Style primitives ── */
const inputBase = {
  width: '100%',
  fontFamily: mono,
  fontSize: '13px',
  color: tw.ink,
  background: tw.white,
  border: `1px solid ${tw.rule}`,
  padding: '8px 12px',
  outline: 'none',
  boxSizing: 'border-box',
}
const btnGreen = {
  fontFamily: mono,
  fontSize: '11px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  background: tw.green,
  color: '#fff',
  border: 'none',
  padding: '10px 18px',
  cursor: 'pointer',
}
const btnGhost = {
  fontFamily: mono,
  fontSize: '11px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  background: 'transparent',
  color: tw.inkSub,
  border: `1px solid ${tw.rule}`,
  padding: '10px 16px',
  cursor: 'pointer',
}
const btnMini = {
  fontFamily: mono,
  fontSize: '10px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  background: 'transparent',
  color: tw.inkSub,
  border: `1px solid ${tw.rule}`,
  padding: '5px 10px',
  cursor: 'pointer',
}
const checkboxRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '12px',
  color: tw.inkSub,
  padding: '8px 0',
}
