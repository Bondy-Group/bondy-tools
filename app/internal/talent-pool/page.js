'use client'

import { useEffect, useMemo, useState } from 'react'
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

const STATUS_OPTS = ['', 'new', 'active', 'archived', 'spam', 'hired_elsewhere']
const AREA_OPTS = ['', 'Backend', 'Frontend', 'Fullstack', 'Mobile', 'Data', 'DevOps', 'QA', 'Hardware', 'Product', 'Design', 'Recruiting', 'Other']

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusColor(s) {
  if (s === 'new') return tw.green
  if (s === 'active') return tw.inkMid
  if (s === 'spam') return tw.orange
  if (s === 'archived') return tw.inkFaint
  return tw.inkSub
}

export default function TalentPoolPage() {
  const { status: authStatus } = useSession()
  const [talents, setTalents] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ status: '', area: '', q: '' })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      for (const [k, v] of Object.entries(filters)) if (v) qs.append(k, v)
      const res = await fetch(`/api/talent-pool?${qs.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setTalents(data.talents || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authStatus === 'authenticated') load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, filters.status, filters.area])

  useEffect(() => {
    if (authStatus !== 'authenticated') return
    const id = setTimeout(load, 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q])

  if (authStatus === 'loading') return null

  return (
    <div style={{ background: tw.bg, minHeight: '100vh', fontFamily: ui, color: tw.ink }}>
      <div style={{ borderBottom: `1px solid ${tw.rule}`, background: tw.white }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 32px' }}>
          <Link href="/internal" style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: tw.inkFaint, textDecoration: 'none' }}>
            ← Internal
          </Link>
          <h1 style={{ margin: '6px 0 0 0', fontFamily: serif, fontSize: 26, fontWeight: 400, color: tw.inkMid }}>
            Talent Pool
          </h1>
          <p style={{ margin: '6px 0 0 0', fontFamily: ui, fontSize: 13, color: tw.inkFaint }}>
            Candidatos que llegaron via /jobs y /referrals. Edita perfiles, asigna status, agrega notas y tags.
          </p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px 0 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Nuevos" value={stats.new} highlight />
            <StatCard label="Activos" value={stats.active} />
            <StatCard label="Archivados" value={stats.archived} muted />
            <StatCard label="Spam" value={stats.spam} muted />
            <StatCard label="Hired elsewhere" value={stats.hired_elsewhere} muted />
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px 0 32px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Select label="Status" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={STATUS_OPTS} />
          <Select label="Área" value={filters.area} onChange={(v) => setFilters({ ...filters, area: v })} options={AREA_OPTS} />
          <input
            type="text"
            placeholder="Buscar nombre, email, empresa, pitch…"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            style={{
              fontFamily: ui, fontSize: 13, padding: '8px 12px',
              background: tw.white, color: tw.ink, border: `1px solid ${tw.rule}`,
              outline: 'none', minWidth: 280, flex: 1,
            }}
          />
          <span style={{ fontFamily: mono, fontSize: 10, color: tw.inkFaint }}>{talents.length} resultados</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px 60px' }}>
        {error && (
          <div style={{ padding: 16, background: '#FFF4F0', border: `1px solid ${tw.orange}`, color: tw.orange, marginBottom: 24, fontFamily: mono, fontSize: 13 }}>
            {error}
          </div>
        )}
        {loading ? (
          <div style={{ fontFamily: mono, fontSize: 13, color: tw.inkFaint, padding: 24 }}>Cargando…</div>
        ) : talents.length === 0 ? (
          <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, padding: 40, textAlign: 'center', fontFamily: ui, fontSize: 14, color: tw.inkFaint }}>
            No hay candidatos con esos filtros.
          </div>
        ) : (
          <div style={{ background: tw.rule, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1.2fr 110px 110px 100px', gap: 16, padding: '10px 22px', background: tw.bg, fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.inkFaint }}>
              <div>Candidato</div>
              <div>Posición</div>
              <div>Área / Seniority</div>
              <div>Salario</div>
              <div>Status</div>
              <div style={{ textAlign: 'right' }}>Llegó</div>
            </div>
            {talents.map((t) => (
              <Link
                key={t.id}
                href={`/internal/talent-pool/${t.id}`}
                style={{ display: 'block', textDecoration: 'none', color: 'inherit', background: tw.white }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.4fr 1.2fr 110px 110px 100px', gap: 16, padding: '14px 22px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: serif, fontSize: 16, color: tw.inkMid, marginBottom: 3 }}>{t.name || '—'}</div>
                    <div style={{ fontFamily: ui, fontSize: 12, color: tw.inkFaint }}>{t.email}</div>
                  </div>
                  <div style={{ fontFamily: ui, fontSize: 13, color: tw.inkSub }}>
                    {t.current_position || '—'}
                    {t.current_company ? <div style={{ fontSize: 11, color: tw.inkFaint }}>{t.current_company}</div> : null}
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 11, color: tw.inkSub }}>
                    {t.primary_area || '—'}
                    {t.seniority ? ` · ${t.seniority}` : ''}
                    {t.years_experience ? <div style={{ fontSize: 10, color: tw.inkFaint }}>{t.years_experience}y exp</div> : null}
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 11, color: tw.inkSub }}>
                    {t.desired_salary_amount
                      ? `${t.desired_salary_currency || ''} ${Number(t.desired_salary_amount).toLocaleString()}${t.desired_salary_period === 'yearly' ? '/y' : t.desired_salary_period === 'monthly' ? '/mo' : ''}`
                      : '—'}
                  </div>
                  <div>
                    <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: statusColor(t.status), padding: '3px 8px', border: `1px solid ${statusColor(t.status)}`, background: tw.white }}>
                      {t.status || '—'}
                    </span>
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 10, color: tw.inkFaint, textAlign: 'right' }}>
                    {fmtDate(t.created_at)}
                  </div>
                </div>
              </Link>
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
