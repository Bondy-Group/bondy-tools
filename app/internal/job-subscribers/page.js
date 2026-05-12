'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const tw = {
  bg: '#FEFCF9', white: '#FFFFFF', ink: '#1A1A1A', inkMid: '#3A3530',
  inkSub: '#5A5550', inkFaint: '#7A7874', rule: '#E8E4DE', green: '#4A8C40',
  greenTint: 'rgba(74,140,64,0.06)', orange: '#C06A2D',
}
const serif = "'Special Elite', Georgia, serif"
const mono = "'Courier Prime', Courier, monospace"
const ui = "'Plus Jakarta Sans', system-ui, sans-serif"

const STATUS_OPTS = ['', 'active', 'unsubscribed']
const SOURCE_OPTS = ['', 'busco-trabajo', 'busco-trabajo-candidates', 'busco-trabajo-recruiters']

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtPrefs(p) {
  if (!p || typeof p !== 'object') return '—'
  const parts = []
  if (Array.isArray(p.areas) && p.areas.length) parts.push(p.areas.join(', '))
  if (Array.isArray(p.seniorities) && p.seniorities.length) parts.push(p.seniorities.join('/'))
  if (Array.isArray(p.modalities) && p.modalities.length) parts.push(p.modalities.join('/'))
  return parts.length ? parts.join(' · ') : 'sin filtros'
}

export default function JobSubscribersPage() {
  const { status: authStatus } = useSession()
  const [subs, setSubs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ status: '', source: '' })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      for (const [k, v] of Object.entries(filters)) if (v) qs.append(k, v)
      const res = await fetch(`/api/job-subscribers?${qs.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setSubs(data.subscribers || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authStatus === 'authenticated') load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, filters.status, filters.source])

  async function unsubscribe(id, email) {
    if (!confirm(`Forzar unsubscribe de ${email}?`)) return
    const res = await fetch(`/api/job-subscribers/${id}/unsubscribe`, { method: 'POST' })
    if (res.ok) load()
    else alert('Failed')
  }

  function exportCsv() {
    const headers = ['email', 'status', 'source', 'preferences', 'subscribed_at', 'last_sent_at', 'send_count']
    const rows = [headers.join(',')]
    for (const s of subs) {
      rows.push([
        s.email,
        s.status,
        s.source,
        `"${fmtPrefs(s.preferences).replace(/"/g, '""')}"`,
        s.subscribed_at || '',
        s.last_sent_at || '',
        s.send_count || 0,
      ].join(','))
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `job-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (authStatus === 'loading') return null

  return (
    <div style={{ background: tw.bg, minHeight: '100vh', fontFamily: ui, color: tw.ink }}>
      <div style={{ borderBottom: `1px solid ${tw.rule}`, background: tw.white }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <Link href="/internal" style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: tw.inkFaint, textDecoration: 'none' }}>
              ← Internal
            </Link>
            <h1 style={{ margin: '6px 0 0 0', fontFamily: serif, fontSize: 26, fontWeight: 400, color: tw.inkMid }}>
              Job Board Subscribers
            </h1>
            <p style={{ margin: '6px 0 0 0', fontFamily: ui, fontSize: 13, color: tw.inkFaint }}>
              Suscriptores del digest semanal de /busco-trabajo. Lunes 10am ART.
            </p>
          </div>
          <button onClick={exportCsv} style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', background: tw.white, color: tw.inkMid, border: `1px solid ${tw.rule}`, padding: '8px 14px', cursor: 'pointer' }}>
            Export CSV
          </button>
        </div>
      </div>

      {stats && (
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px 0 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Activos" value={stats.active} highlight />
            <StatCard label="Cancelados" value={stats.unsubscribed} muted />
            <StatCard label="Candidatos" value={stats.candidates} />
            <StatCard label="Recruiters" value={stats.recruiters} />
          </div>
          {stats.never_sent > 0 && (
            <div style={{ marginTop: 12, fontFamily: mono, fontSize: 11, color: tw.orange }}>
              ⚠ {stats.never_sent} suscriptores activos nunca recibieron un digest (suscriptos después del último lunes, o cron sin correr).
            </div>
          )}
        </div>
      )}

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px 0 32px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Select label="Status" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={STATUS_OPTS} />
        <Select label="Source" value={filters.source} onChange={(v) => setFilters({ ...filters, source: v })} options={SOURCE_OPTS} />
        <span style={{ fontFamily: mono, fontSize: 10, color: tw.inkFaint, marginLeft: 'auto', alignSelf: 'flex-end', paddingBottom: 8 }}>{subs.length} resultados</span>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px 60px' }}>
        {error && (
          <div style={{ padding: 16, background: '#FFF4F0', border: `1px solid ${tw.orange}`, color: tw.orange, marginBottom: 24, fontFamily: mono, fontSize: 13 }}>{error}</div>
        )}
        {loading ? (
          <div style={{ fontFamily: mono, fontSize: 13, color: tw.inkFaint, padding: 24 }}>Cargando…</div>
        ) : subs.length === 0 ? (
          <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, padding: 40, textAlign: 'center', fontFamily: ui, fontSize: 14, color: tw.inkFaint }}>
            No hay suscriptores con esos filtros.
          </div>
        ) : (
          <div style={{ background: tw.rule, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1.6fr 90px 100px 110px 90px', gap: 14, padding: '10px 22px', background: tw.bg, fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.inkFaint }}>
              <div>Email</div>
              <div>Source</div>
              <div>Filtros</div>
              <div>Status</div>
              <div style={{ textAlign: 'right' }}>Envíos</div>
              <div style={{ textAlign: 'right' }}>Último envío</div>
              <div></div>
            </div>
            {subs.map((s) => (
              <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1.6fr 90px 100px 110px 90px', gap: 14, padding: '14px 22px', background: tw.white, alignItems: 'center' }}>
                <div style={{ fontFamily: ui, fontSize: 13, color: tw.inkMid, wordBreak: 'break-all' }}>
                  {s.email}
                  <div style={{ fontFamily: mono, fontSize: 10, color: tw.inkFaint, marginTop: 2 }}>{fmt(s.subscribed_at)}</div>
                </div>
                <div style={{ fontFamily: mono, fontSize: 10, color: tw.inkSub }}>{s.source || '—'}</div>
                <div style={{ fontFamily: ui, fontSize: 12, color: tw.inkSub }}>{fmtPrefs(s.preferences)}</div>
                <div>
                  <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: s.status === 'active' ? tw.green : tw.inkFaint, padding: '3px 7px', border: `1px solid ${s.status === 'active' ? tw.green : tw.rule}` }}>
                    {s.status}
                  </span>
                </div>
                <div style={{ fontFamily: mono, fontSize: 11, color: tw.inkSub, textAlign: 'right' }}>{s.send_count || 0}</div>
                <div style={{ fontFamily: mono, fontSize: 10, color: tw.inkFaint, textAlign: 'right' }}>{fmt(s.last_sent_at)}</div>
                <div style={{ textAlign: 'right' }}>
                  {s.status === 'active' && (
                    <button onClick={() => unsubscribe(s.id, s.email)} style={{ fontFamily: mono, fontSize: 9, color: tw.orange, background: 'transparent', border: `1px solid ${tw.rule}`, padding: '4px 8px', cursor: 'pointer' }}>
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, muted, highlight }) {
  return (
    <div style={{ background: tw.white, border: `1px solid ${highlight ? tw.green : tw.rule}`, padding: '14px 16px' }}>
      <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: highlight ? tw.green : (muted ? tw.inkFaint : tw.inkSub), marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: serif, fontSize: 24, color: tw.inkMid, lineHeight: 1 }}>{value}</div>
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.inkFaint }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ fontFamily: ui, fontSize: 13, padding: '7px 10px', background: tw.white, color: tw.ink, border: `1px solid ${tw.rule}`, outline: 'none' }}>
        {options.map((o) => <option key={o} value={o}>{o || '— todos —'}</option>)}
      </select>
    </label>
  )
}
