'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import ProposalDocument from '../ProposalDocument'
import { rowToRenderData } from './_helpers'
import TranscriptExtract from './TranscriptExtract'

const tw = {
  bg: '#FEFCF9', ink: '#1A1A1A', inkMid: '#3A3530', inkSub: '#5A5550',
  inkFaint: '#7A7874', rule: '#E8E4DE', white: '#FFFFFF', green: '#4A8C40',
}
const ui = "'Plus Jakarta Sans', system-ui, sans-serif"
const mono = "'Courier Prime', Courier, monospace"

export default function ProposalEditorPage() {
  const { id } = useParams()
  const router = useRouter()
  const [row, setRow] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  useEffect(() => { load() }, [id])

  async function load() {
    try {
      const res = await fetch(`/api/proposals/${id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Could not load proposal')
      const json = await res.json()
      setRow(json.proposal)
    } catch (err) {
      setError(String(err.message || err))
    }
  }

  // Debounced autosave
  const persist = useCallback(async (patch) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Save failed')
      setSavedAt(new Date())
    } catch (err) {
      setError(String(err.message || err))
    } finally {
      setSaving(false)
    }
  }, [id])

  function update(field, value) {
    setRow((prev) => ({ ...prev, [field]: value }))
  }

  // Autosave 700ms después del último cambio
  useEffect(() => {
    if (!row) return
    const handler = setTimeout(() => {
      const { id: _id, created_at, updated_at, agreement_id, ...patch } = row
      persist(patch)
    }, 700)
    return () => clearTimeout(handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row && JSON.stringify(row)])

  async function deleteSelf() {
    if (!confirm('¿Borrar esta propuesta? No se puede deshacer.')) return
    const res = await fetch(`/api/proposals/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/internal/proposals')
  }

  if (error && !row) {
    return <div style={{ padding: 32, fontFamily: ui }}>Error: {error}</div>
  }
  if (!row) {
    return <div style={{ padding: 32, fontFamily: ui, color: tw.inkFaint }}>Cargando…</div>
  }

  const renderData = rowToRenderData(row)

  return (
    <div style={{ minHeight: '100vh', background: tw.bg, fontFamily: ui, color: tw.ink, display: 'flex' }}>
      {/* ── FORM PANEL ── */}
      <aside style={{
        width: 420, minWidth: 420, height: '100vh', overflowY: 'auto',
        background: tw.white, borderRight: `1px solid ${tw.rule}`,
        padding: '24px 24px 80px',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${tw.rule}` }}>
          <Link href="/internal/proposals" style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: tw.inkFaint, textDecoration: 'none' }}>
            ← Proposals
          </Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontFamily: mono, fontSize: 11, color: tw.green, letterSpacing: '0.1em' }}>{row.agreement_id}</span>
            <span style={{ fontSize: 11, color: tw.inkFaint }}>
              {saving ? 'Guardando…' : savedAt ? `Guardado · ${savedAt.toLocaleTimeString('es-AR')}` : ''}
            </span>
          </div>
          <h1 style={{ margin: '8px 0 0', fontSize: 18, fontWeight: 600 }}>{row.client_name || 'Untitled'}</h1>
        </div>

        {/* Transcript extractor */}
        <TranscriptExtract
          row={row}
          onApply={(patch) => setRow((prev) => ({ ...prev, ...patch }))}
        />

        {/* Status */}
        <Section title="Estado">
          <Select
            value={row.status}
            onChange={(v) => update('status', v)}
            options={[
              ['draft', 'Borrador'],
              ['sent', 'Enviada'],
              ['signed', 'Firmada'],
              ['archived', 'Archivada'],
            ]}
          />
        </Section>

        {/* Idioma + Variante */}
        <Section title="Configuración">
          <Field label="Idioma">
            <Radio value={row.language} onChange={(v) => update('language', v)} options={[['en', 'EN'], ['es', 'ES']]} />
          </Field>
          <Field label="Variante">
            <Radio value={row.variant} onChange={(v) => update('variant', v)} options={[['a', 'A'], ['b', 'B'], ['c', 'C']]} />
          </Field>
          <Field label="Fee %">
            <Input type="number" value={row.fee_pct} onChange={(v) => update('fee_pct', Number(v))} step="0.5" />
          </Field>
          <Field label="Moneda">
            <Radio value={row.salary_currency} onChange={(v) => update('salary_currency', v)} options={[['ARS', 'ARS'], ['USD', 'USD']]} />
          </Field>
          <Field label="Fecha (texto)">
            <Input value={row.date_long || ''} onChange={(v) => update('date_long', v)} placeholder="April 28, 2026" />
          </Field>
          <Field label="Fecha (date)">
            <Input type="date" value={row.proposal_date || ''} onChange={(v) => update('proposal_date', v)} />
          </Field>
          <Field label="Año">
            <Input value={row.year || ''} onChange={(v) => update('year', v)} />
          </Field>
          <Field label="Timeline visible">
            <Radio value={row.show_timeline ? '1' : '0'} onChange={(v) => update('show_timeline', v === '1')} options={[['1', 'Sí'], ['0', 'No']]} />
          </Field>
        </Section>

        {/* Cliente */}
        <Section title="Cliente">
          <Field label="Nombre comercial">
            <Input value={row.client_name || ''} onChange={(v) => update('client_name', v)} />
          </Field>
          <Field label="Razón social">
            <Input value={row.client_legal_name || ''} onChange={(v) => update('client_legal_name', v)} />
          </Field>
          <Field label="Nombre corto">
            <Input value={row.client_short_name || ''} onChange={(v) => update('client_short_name', v)} />
          </Field>
          <Field label="Contacto">
            <Input value={row.client_contact || ''} onChange={(v) => update('client_contact', v)} />
          </Field>
          <Field label="Cargo del contacto">
            <Input value={row.client_contact_role || ''} onChange={(v) => update('client_contact_role', v)} />
          </Field>
          <Field label="Ubicación">
            <Input value={row.client_location || ''} onChange={(v) => update('client_location', v)} />
          </Field>
          <Field label="Modalidad de trabajo">
            <Input value={row.client_work_mode || ''} onChange={(v) => update('client_work_mode', v)} placeholder="hybrid · weekly Monday in-person" />
          </Field>
        </Section>

        {/* Roles */}
        <Section title={`Roles (${(row.roles || []).length})`}>
          {(row.roles || []).map((r, i) => (
            <div key={i} style={{ padding: 12, border: `1px solid ${tw.rule}`, marginBottom: 10, background: '#FAF8F4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.inkFaint, fontWeight: 600 }}>
                  Rol {String(i + 1).padStart(2, '0')}
                </span>
                <button
                  onClick={() => {
                    const next = [...row.roles]
                    next.splice(i, 1)
                    update('roles', next)
                  }}
                  style={{ fontSize: 11, color: '#A02020', background: 'none', border: 'none', cursor: 'pointer' }}
                >Borrar</button>
              </div>
              <Field label="Título">
                <Input value={r.title || ''} onChange={(v) => {
                  const next = [...row.roles]; next[i] = { ...r, title: v }; update('roles', next)
                }} />
              </Field>
              <Field label="Cantidad">
                <Input type="number" value={r.qty || 1} onChange={(v) => {
                  const next = [...row.roles]; next[i] = { ...r, qty: Number(v) }; update('roles', next)
                }} />
              </Field>
              <Field label="Foco / dominio">
                <Textarea value={r.focus || ''} onChange={(v) => {
                  const next = [...row.roles]; next[i] = { ...r, focus: v }; update('roles', next)
                }} />
              </Field>
            </div>
          ))}
          <button
            onClick={() => update('roles', [...(row.roles || []), { title: '', qty: 1, focus: '' }])}
            style={{
              width: '100%', padding: '10px', marginTop: 4,
              fontSize: 12, fontFamily: ui, fontWeight: 500,
              border: `1px dashed ${tw.rule}`, background: 'transparent',
              color: tw.green, cursor: 'pointer',
            }}
          >+ Agregar rol</button>
        </Section>

        {/* Approach / notes */}
        <Section title="Approach (bullets calibrados)">
          <Textarea
            value={row.approach_notes || ''}
            onChange={(v) => update('approach_notes', v)}
            placeholder={'Una línea por bullet, formato:\nTítulo. Texto del bullet.\n\nDejá vacío para usar los bullets default.'}
            rows={6}
          />
        </Section>

        <Section title="Notas internas (no se renderizan)">
          <Textarea
            value={row.internal_notes || ''}
            onChange={(v) => update('internal_notes', v)}
            placeholder="Contexto interno, tracking de la propuesta…"
            rows={4}
          />
        </Section>

        {/* Actions */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${tw.rule}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a
            href={`/internal/proposals/${id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', textAlign: 'center', padding: '12px 20px',
              background: tw.green, color: tw.white, fontSize: 13, fontWeight: 600,
              textDecoration: 'none', borderRadius: 2,
            }}
          >
            Abrir vista print →
          </a>
          <button
            onClick={deleteSelf}
            style={{
              padding: '10px', fontSize: 12, color: '#A02020',
              background: 'transparent', border: `1px solid ${tw.rule}`,
              cursor: 'pointer', fontFamily: ui,
            }}
          >Borrar propuesta</button>
        </div>
      </aside>

      {/* ── PREVIEW ── */}
      <main style={{ flex: 1, height: '100vh', overflowY: 'auto' }}>
        <ProposalDocument data={renderData} />
      </main>
    </div>
  )
}

// ── Form atoms ───────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{
        margin: '0 0 12px', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
        color: tw.green, fontWeight: 600,
      }}>{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 11, color: tw.inkFaint, marginBottom: 4, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  fontFamily: ui, color: tw.ink,
  border: `1px solid ${tw.rule}`, background: tw.white,
  borderRadius: 2, outline: 'none',
}

function Input({ value, onChange, type = 'text', placeholder = '', step }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      step={step}
      style={inputStyle}
    />
  )
}

function Textarea({ value, onChange, placeholder = '', rows = 3 }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
    />
  )
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
      {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
    </select>
  )
}

function Radio({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map(([v, label]) => {
        const active = String(value) === String(v)
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            style={{
              flex: 1, padding: '8px 10px', fontSize: 12,
              fontFamily: ui, cursor: 'pointer',
              border: `1px solid ${active ? tw.green : tw.rule}`,
              background: active ? 'rgba(74,140,64,0.08)' : tw.white,
              color: active ? tw.green : tw.ink, fontWeight: active ? 600 : 400,
              borderRadius: 2,
            }}
          >{label}</button>
        )
      })}
    </div>
  )
}
