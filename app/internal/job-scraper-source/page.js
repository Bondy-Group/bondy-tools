'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

const tw = {
  bg: '#FEFCF9', white: '#FFFFFF',
  ink: '#1A1A1A', inkMid: '#3A3530', inkSub: '#5A5550',
  inkFaint: '#7A7874', rule: '#E8E4DE',
  green: '#4A8C40', greenTint: 'rgba(74,140,64,0.08)', greenEdge: 'rgba(74,140,64,0.35)',
  red: '#C62828', redTint: 'rgba(198,40,40,0.06)',
  amber: '#E65100', amberTint: 'rgba(230,81,0,0.06)',
}
const serif = "'Special Elite', Georgia, serif"
const mono  = "'Courier Prime', Courier, monospace"
const ui    = "'Plus Jakarta Sans', system-ui, sans-serif"

const SB_URL = 'https://tchppyxhapxtjemxrbqm.supabase.co'
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw'

// ── Sources catalog ────────────────────────────────────────────────────────
// target = jobs esperados por corrida (baseline). Alerta si cae >50%.
const SOURCES = [
  { key: 'getonboard', label: 'GetOnBoard',      method: 'API',  target: 150, region: 'LATAM' },
  { key: 'remotive',   label: 'Remotive',         method: 'API',  target: 80,  region: 'Global' },
  { key: 'himalayas',  label: 'Himalayas',        method: 'API',  target: 120, region: 'Global' },
  { key: 'wwr',        label: 'WeWorkRemotely',   method: 'RSS',  target: 25,  region: 'Global' },
  { key: 'greenhouse', label: 'Greenhouse',       method: 'API',  target: 60,  region: 'US/Global' },
  { key: 'lever',      label: 'Lever',            method: 'API',  target: 30,  region: 'LATAM' },
  { key: 'yc',         label: 'YC Companies',     method: 'API',  target: 40,  region: 'Global' },
  { key: 'recruiters', label: 'Recruiters',       method: 'API',  target: 20,  region: 'Global' },
]

function BondyLogo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="4"  y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" />
      <rect x="22" y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".18" />
      <rect x="4"  y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".42" />
      <rect x="22" y="22" width="14" height="12" rx="2.5" fill="#4A8C40" />
    </svg>
  )
}

function StatusDot({ status }) {
  const color = { ok: tw.green, warn: tw.amber, error: tw.red, empty: tw.inkFaint }[status] || tw.inkFaint
  const label = { ok: 'OK', warn: 'Alerta', error: 'Error', empty: 'Sin datos' }[status] || '—'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
        boxShadow: status === 'ok' ? `0 0 6px ${color}55` : 'none',
      }} />
      <span style={{ fontFamily: mono, fontSize: '10px', color, letterSpacing: '0.08em', fontWeight: 700 }}>
        {label}
      </span>
    </div>
  )
}

function MiniBar({ value, max, status }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0
  const color = { ok: tw.green, warn: tw.amber, error: tw.red, empty: tw.rule }[status]
  return (
    <div style={{ height: 4, background: tw.rule, borderRadius: 2, overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.4s' }} />
    </div>
  )
}

function Stat({ val, label }) {
  return (
    <div>
      <div style={{ fontFamily: serif, fontSize: '22px', color: tw.inkMid, lineHeight: 1, opacity: 0.9 }}>{val}</div>
      <div style={{ fontFamily: ui, fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tw.inkFaint, marginTop: 4 }}>{label}</div>
    </div>
  )
}

function daysAgo(iso) {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000)
  if (d === 0) return 'hoy'
  if (d === 1) return 'ayer'
  if (d < 7)  return `hace ${d}d`
  return `hace ${Math.floor(d / 7)}sem`
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function JobScraperSourcePage() {
  const router = useRouter()
  const { status: sessionStatus } = useSession()

  const [stats, setStats]     = useState({}) // { [sourceKey]: { total, last7d, lastRun, newest, oldest } }
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login')
  }, [sessionStatus, router])

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return
    fetch('/api/internal/track-tool-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId: 'job-scraper-source' }),
      keepalive: true,
    }).catch(() => {})
  }, [sessionStatus])

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Total por fuente
      const totals = await fetch(
        `${SB_URL}/rest/v1/jobs?select=source&order=source`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Prefer': 'count=exact' } }
      ).then(r => r.json())

      // 2. Jobs últimos 7 días por fuente
      const cutoff7d = new Date(Date.now() - 7 * 86400000).toISOString()
      const recent = await fetch(
        `${SB_URL}/rest/v1/jobs?select=source,collected_at,published_at&collected_at=gte.${cutoff7d}&order=collected_at.desc&limit=2000`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
      ).then(r => r.json())

      // 3. Newest + oldest por fuente (para detectar stale)
      const bounds = await fetch(
        `${SB_URL}/rest/v1/jobs?select=source,collected_at&order=collected_at.desc&limit=1000`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
      ).then(r => r.json())

      // Build stats map
      const map = {}
      for (const s of SOURCES) {
        const totalRows  = Array.isArray(totals) ? totals.filter(j => j.source === s.key).length : 0
        const recentRows = Array.isArray(recent) ? recent.filter(j => j.source === s.key) : []
        const last7d     = recentRows.length
        const lastRun    = recentRows[0]?.collected_at || null
        const boundsRows = Array.isArray(bounds) ? bounds.filter(j => j.source === s.key) : []
        const newestCollected = boundsRows[0]?.collected_at || null

        // Determine status
        let status = 'empty'
        if (last7d === 0) {
          status = 'error'
        } else if (last7d < s.target * 0.5) {
          status = 'warn'
        } else {
          status = 'ok'
        }

        map[s.key] = { total: totalRows, last7d, lastRun, newestCollected, status }
      }

      setStats(map)
      setLastRefresh(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [sessionStatus])

  useEffect(() => { if (sessionStatus === 'authenticated') loadStats() }, [sessionStatus])

  if (sessionStatus === 'loading' || sessionStatus === 'unauthenticated') return null

  const totalJobs    = Object.values(stats).reduce((a, s) => a + (s.total || 0), 0)
  const totalLast7d  = Object.values(stats).reduce((a, s) => a + (s.last7d || 0), 0)
  const sourcesOk    = SOURCES.filter(s => stats[s.key]?.status === 'ok').length
  const sourcesWarn  = SOURCES.filter(s => stats[s.key]?.status === 'warn').length
  const sourcesError = SOURCES.filter(s => stats[s.key]?.status === 'error').length

  return (
    <main style={{ backgroundColor: tw.bg, minHeight: '100vh' }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '16px clamp(1.25rem,5vw,4rem)',
        borderBottom: `1px solid ${tw.rule}`,
        background: 'rgba(255,255,255,0.55)',
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(12px)',
      }}>
        <Link href="/internal" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none', color: 'inherit' }}>
          <BondyLogo size={22} />
          <span style={{ fontFamily: serif, fontSize: '17px', color: tw.ink, letterSpacing: '0.04em' }}>BONDY</span>
        </Link>
        <span style={{ fontFamily: ui, fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: tw.green, border: `1px solid ${tw.greenEdge}`, padding: '3px 8px', background: tw.greenTint }}>Internal</span>
        <span style={{ fontFamily: mono, fontSize: '11px', color: tw.inkFaint }}>/</span>
        <span style={{ fontFamily: mono, fontSize: '11px', color: tw.inkFaint, letterSpacing: '0.06em' }}>Job Scraper Sources</span>
        <div style={{ flex: 1 }} />
        <button onClick={loadStats} disabled={loading} style={{
          fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
          color: loading ? tw.inkFaint : tw.green,
          background: 'none', border: `1px solid ${loading ? tw.rule : tw.greenEdge}`,
          padding: '5px 12px', cursor: loading ? 'default' : 'pointer', transition: 'all 0.15s',
        }}>
          {loading ? 'Cargando…' : '↻ Actualizar'}
        </button>
        <Link href="/internal" style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.inkFaint, textDecoration: 'none' }}>
          ← Volver
        </Link>
      </header>

      {/* Hero + resumen global */}
      <section style={{ padding: '32px clamp(1.25rem,5vw,4rem) 24px', borderBottom: `1px solid ${tw.rule}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '22px', height: '1px', background: tw.green }} />
          <span style={{ fontFamily: ui, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: tw.green, fontWeight: 500 }}>
            Datos · Salud del scraper
          </span>
        </div>
        <h1 style={{ fontFamily: serif, fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: tw.inkMid, opacity: 0.95, textShadow: '0.4px 0.4px 0 rgba(0,0,0,0.18)', lineHeight: 1.05, margin: '0 0 20px' }}>
          Job Scraper Sources.
        </h1>

        {/* Stats globales */}
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <Stat val={loading ? '—' : totalJobs.toLocaleString()} label="Jobs en DB" />
          <Stat val={loading ? '—' : totalLast7d} label="Últimos 7 días" />
          <Stat val={`${SOURCES.length}`} label="Fuentes configuradas" />
          <Stat val={loading ? '—' : sourcesOk} label="Fuentes OK" />
          {sourcesWarn > 0  && <Stat val={sourcesWarn}  label="En alerta" />}
          {sourcesError > 0 && <Stat val={sourcesError} label="Sin datos recientes" />}
        </div>
        {lastRefresh && (
          <div style={{ fontFamily: mono, fontSize: '10px', color: tw.inkFaint, letterSpacing: '0.06em' }}>
            Actualizado a las {lastRefresh}
          </div>
        )}
      </section>

      {/* Source table */}
      <div style={{ padding: '0 clamp(1.25rem,5vw,4rem) 48px' }}>

        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '180px 70px 80px 90px 90px 1fr 80px',
          gap: '14px',
          padding: '12px 4px',
          borderBottom: `2px solid ${tw.rule}`,
          fontFamily: ui, fontSize: '9px', letterSpacing: '0.16em',
          textTransform: 'uppercase', color: tw.inkFaint, fontWeight: 600,
        }}>
          <span>Fuente</span>
          <span>Método</span>
          <span>Estado</span>
          <span>Total DB</span>
          <span>Últimos 7d</span>
          <span>Volumen vs target</span>
          <span>Última corrida</span>
        </div>

        {SOURCES.map(s => {
          const st = stats[s.key] || {}
          const status = loading ? 'empty' : (st.status || 'empty')
          const rowBg = { ok: 'transparent', warn: tw.amberTint, error: tw.redTint, empty: 'transparent' }[status]

          return (
            <div key={s.key} style={{
              display: 'grid',
              gridTemplateColumns: '180px 70px 80px 90px 90px 1fr 80px',
              gap: '14px',
              padding: '13px 4px',
              alignItems: 'center',
              borderTop: `1px solid ${tw.rule}`,
              background: rowBg,
              transition: 'background 0.15s',
            }}>
              {/* Nombre */}
              <div>
                <div style={{ fontFamily: ui, fontWeight: 600, fontSize: '13px', color: tw.ink }}>{s.label}</div>
                <div style={{ fontFamily: mono, fontSize: '10px', color: tw.inkFaint, marginTop: '2px' }}>{s.region}</div>
              </div>

              {/* Método */}
              <span style={{
                fontFamily: mono, fontSize: '10px', letterSpacing: '0.1em',
                padding: '2px 8px', border: `1px solid ${tw.rule}`,
                color: tw.inkSub, background: tw.bg, whiteSpace: 'nowrap',
                alignSelf: 'center',
              }}>{s.method}</span>

              {/* Estado */}
              <StatusDot status={status} />

              {/* Total en DB */}
              <span style={{ fontFamily: mono, fontSize: '12px', color: tw.inkMid }}>
                {loading ? '—' : (st.total ?? 0).toLocaleString()}
              </span>

              {/* Últimos 7d */}
              <span style={{ fontFamily: mono, fontSize: '12px', color: status === 'error' ? tw.red : tw.inkMid, fontWeight: status === 'error' ? 700 : 400 }}>
                {loading ? '—' : (st.last7d ?? 0)}
                {!loading && <span style={{ fontFamily: mono, fontSize: '10px', color: tw.inkFaint }}> / {s.target} exp</span>}
              </span>

              {/* Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <MiniBar value={st.last7d || 0} max={s.target} status={status} />
                <span style={{ fontFamily: mono, fontSize: '10px', color: tw.inkFaint }}>
                  {loading ? '—' : `${s.target > 0 ? Math.round(((st.last7d || 0) / s.target) * 100) : 0}% del target`}
                </span>
              </div>

              {/* Última corrida */}
              <span style={{ fontFamily: mono, fontSize: '10px', color: tw.inkFaint }}>
                {loading ? '—' : daysAgo(st.lastRun)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Notas / leyenda */}
      <div style={{ padding: '0 clamp(1.25rem,5vw,4rem) 48px' }}>
        <div style={{ border: `1px solid ${tw.rule}`, background: tw.white, padding: '20px 24px' }}>
          <div style={{ fontFamily: ui, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.inkFaint, fontWeight: 600, marginBottom: '12px' }}>
            Leyenda · Criterios de alerta
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { status: 'ok',    label: 'OK',            desc: '≥50% del target semanal. Fuente funcionando correctamente.' },
              { status: 'warn',  label: 'Alerta',        desc: 'Entre 1 y 50% del target. Revisar endpoint o rate limits.' },
              { status: 'error', label: 'Sin datos',     desc: 'Cero jobs en los últimos 7 días. La fuente probablemente falló o cambió su API.' },
            ].map(({ status, label, desc }) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <StatusDot status={status} />
                <span style={{ fontFamily: mono, fontSize: '11px', color: tw.inkSub }}>{desc}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${tw.rule}`, fontFamily: mono, fontSize: '11px', color: tw.inkFaint, lineHeight: 1.7 }}>
            El scraper corre L-V a las 7:00 AM Argentina. Si una fuente está en error más de 2 días seguidos, reemplazarla
            en el SKILL.md y actualizar la automatización en Cowork.<br />
            <strong style={{ color: tw.inkSub }}>Target semanal</strong> = baseline estimado por corrida (puede ajustarse en el código si el mercado cambia).
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '1.25rem clamp(1.25rem,5vw,4rem)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: `1px solid ${tw.rule}`,
      }}>
        <span style={{ fontFamily: ui, fontSize: '11px', color: tw.inkFaint }}>Uso exclusivo equipo Bondy</span>
        <a href="https://wearebondy.com" target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '0.10em', color: tw.green, textDecoration: 'none' }}>
          wearebondy.com ↗
        </a>
      </div>
    </main>
  )
}
