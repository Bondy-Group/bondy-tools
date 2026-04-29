'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const tw = {
  bg: '#FEFCF9', ink: '#1A1A1A', inkMid: '#3A3530', inkSub: '#5A5550',
  inkFaint: '#7A7874', rule: '#E8E4DE', white: '#FFFFFF', green: '#4A8C40',
}
const ui = "'Plus Jakarta Sans', system-ui, sans-serif"
const mono = "'Courier Prime', Courier, monospace"

const STATUS_LABELS = {
  draft: 'Borrador',
  sent: 'Enviada',
  signed: 'Firmada',
  archived: 'Archivada',
}

const STATUS_COLORS = {
  draft: '#7A7874',
  sent: '#4A8C40',
  signed: '#1A1A1A',
  archived: '#A09C97',
}

export default function ProposalsListPage() {
  const router = useRouter()
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await fetch('/api/proposals', { cache: 'no-store' })
      if (!res.ok) throw new Error('Could not load proposals')
      const json = await res.json()
      setItems(json.proposals || [])
    } catch (err) {
      setError(String(err.message || err))
    }
  }

  async function createNew() {
    setCreating(true)
    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_name: 'Untitled client' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not create')
      router.push(`/internal/proposals/${json.proposal.id}`)
    } catch (err) {
      alert(String(err.message || err))
      setCreating(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: tw.bg, fontFamily: ui, color: tw.ink }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
          <div>
            <Link href="/internal" style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: tw.inkFaint, textDecoration: 'none' }}>
              ← Internal
            </Link>
            <h1 style={{ margin: '12px 0 6px', fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', color: tw.inkMid }}>
              Service Proposals
            </h1>
            <p style={{ margin: 0, color: tw.inkSub, fontSize: 14, maxWidth: 540 }}>
              Generador de acuerdos de servicio. Cada propuesta es un draft persistido en Supabase con un agreement ID propio.
            </p>
          </div>
          <button
            onClick={createNew}
            disabled={creating}
            style={{
              fontFamily: ui, fontSize: 13, fontWeight: 600,
              padding: '12px 24px', cursor: creating ? 'not-allowed' : 'pointer',
              background: tw.green, color: tw.white,
              border: 'none', borderRadius: 2,
              opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? 'Creando…' : '+ Nueva propuesta'}
          </button>
        </div>

        {/* List */}
        {error && <div style={{ padding: 16, background: '#FEE', color: '#900', fontSize: 13 }}>{error}</div>}
        {!items && !error && <div style={{ color: tw.inkFaint, fontSize: 13 }}>Cargando…</div>}
        {items && items.length === 0 && (
          <div style={{
            padding: '48px 32px', textAlign: 'center',
            border: `1px dashed ${tw.rule}`, borderRadius: 2,
            color: tw.inkFaint, fontSize: 14,
          }}>
            No hay propuestas todavía. Creá la primera con el botón arriba.
          </div>
        )}

        {items && items.length > 0 && (
          <div style={{ border: `1px solid ${tw.rule}`, background: tw.white }}>
            {/* Header row */}
            <div style={{
              display: 'grid', gridTemplateColumns: '170px 1fr 110px 80px 100px 140px 100px',
              padding: '14px 20px', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
              color: tw.inkFaint, borderBottom: `1px solid ${tw.rule}`, fontWeight: 500,
            }}>
              <span>Agreement</span>
              <span>Cliente</span>
              <span>Estado</span>
              <span>Fee</span>
              <span>Idioma</span>
              <span>Actualizada</span>
              <span></span>
            </div>
            {items.map((p) => (
              <Link
                key={p.id}
                href={`/internal/proposals/${p.id}`}
                style={{
                  display: 'grid', gridTemplateColumns: '170px 1fr 110px 80px 100px 140px 100px',
                  padding: '16px 20px', borderBottom: `1px solid ${tw.rule}`,
                  fontSize: 14, color: tw.ink, textDecoration: 'none', alignItems: 'center',
                }}
              >
                <span style={{ fontFamily: mono, fontSize: 12, color: tw.inkSub }}>{p.agreement_id || '—'}</span>
                <span style={{ fontWeight: 500 }}>{p.client_name || 'Untitled'}</span>
                <span>
                  <span style={{
                    fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: STATUS_COLORS[p.status] || tw.inkFaint, fontWeight: 600,
                  }}>
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                </span>
                <span style={{ fontFamily: mono, fontSize: 13 }}>{p.fee_pct}%</span>
                <span style={{ textTransform: 'uppercase', fontSize: 11, color: tw.inkSub, letterSpacing: '0.1em' }}>{p.language}</span>
                <span style={{ fontSize: 12, color: tw.inkFaint }}>{formatDate(p.updated_at)}</span>
                <span style={{ fontSize: 12, color: tw.green, fontWeight: 600, textAlign: 'right' }}>Abrir →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}
