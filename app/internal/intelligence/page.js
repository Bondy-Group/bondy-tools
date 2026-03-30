'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const SUPABASE_URL = 'https://tchppyxhapxtjemxrbqm.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw'

const notebookBg = [
  'linear-gradient(90deg, transparent 68px, rgba(210,100,80,0.10) 68px, rgba(210,100,80,0.10) 69.5px, transparent 69.5px)',
  'repeating-linear-gradient(180deg, transparent 0px, transparent 31px, rgba(100,140,200,0.09) 31px, rgba(100,140,200,0.09) 32px)',
].join(',')

const tw = {
  bg: '#FEFCF9', inkMid: '#3A3530', inkSub: '#5A5550',
  inkFaint: '#7A7874', rule: '#E8E4DE', white: '#FFFFFF', green: '#4A8C40',
}
const serif = "'Special Elite', Georgia, serif"
const mono  = "'Courier Prime', Courier, monospace"

const BondyLogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="4"  y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" />
    <rect x="22" y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".18" />
    <rect x="4"  y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".42" />
    <rect x="22" y="22" width="14" height="12" rx="2.5" fill="#4A8C40" />
  </svg>
)

async function query(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_query`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// Fetch via REST API usando los endpoints estándar de Supabase
async function fetchStat(table, select = 'count', filter = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}${filter}&limit=1000`
  const res = await fetch(url, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Prefer': 'count=exact',
    },
  })
  const count = res.headers.get('content-range')?.split('/')[1]
  const data = await res.json()
  return { data, count: count ? parseInt(count) : data.length }
}

// ── Stat card ──
function StatCard({ label, value, sub }) {
  return (
    <div style={{
      padding: '2rem 1.75rem',
      borderRight: `1px solid ${tw.rule}`,
      borderBottom: `1px solid ${tw.rule}`,
      background: tw.white,
    }}>
      <div style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green, marginBottom: '1rem' }}>
        {label}
      </div>
      <div style={{ fontFamily: serif, fontSize: '2.8rem', color: tw.inkMid, lineHeight: 1, marginBottom: '0.5rem' }}>
        {value ?? '—'}
      </div>
      {sub && (
        <div style={{ fontFamily: mono, fontSize: '11px', color: tw.inkFaint }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Bar horizontal ──
function Bar({ label, value, max, sub }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontFamily: mono, fontSize: '12px', color: tw.inkSub }}>{label}</span>
        <span style={{ fontFamily: mono, fontSize: '12px', color: tw.green }}>{value}{sub ? ` ${sub}` : ''}</span>
      </div>
      <div style={{ height: '3px', background: tw.rule, borderRadius: '2px' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: tw.green, borderRadius: '2px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

// ── Pill de status ──
function StatusPill({ s }) {
  const map = {
    'activo':               { bg: 'rgba(74,140,64,0.1)',  color: '#2d6b24' },
    'reactivation_target':  { bg: 'rgba(180,130,0,0.1)',  color: '#7a5800' },
    'inactivo':             { bg: 'rgba(90,85,80,0.1)',   color: '#3A3530' },
  }
  const st = map[s] || map['inactivo']
  return (
    <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 8px', background: st.bg, color: st.color }}>
      {s?.replace('_', ' ') ?? '—'}
    </span>
  )
}

// ── Tabla genérica ──
function SimpleTable({ cols, rows, emptyMsg = 'Sin datos' }) {
  if (!rows?.length) return (
    <div style={{ fontFamily: mono, fontSize: '12px', color: tw.inkFaint, padding: '2rem 0', textAlign: 'center' }}>
      {emptyMsg}
    </div>
  )
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: mono, fontSize: '12px' }}>
      <thead>
        <tr>
          {cols.map(c => (
            <th key={c.key} style={{ textAlign: c.right ? 'right' : 'left', padding: '6px 0', borderBottom: `1px solid ${tw.rule}`, fontWeight: 400, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.inkFaint, paddingRight: '1rem' }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${tw.rule}` }}>
            {cols.map(c => (
              <td key={c.key} style={{ padding: '10px 0', paddingRight: '1rem', color: tw.inkSub, textAlign: c.right ? 'right' : 'left', verticalAlign: 'top' }}>
                {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Mini tag de skill ──
function SkillTag({ s }) {
  return (
    <span style={{ display: 'inline-block', fontFamily: mono, fontSize: '10px', padding: '2px 7px', border: `1px solid ${tw.rule}`, color: tw.inkFaint, marginRight: '4px', marginBottom: '4px' }}>
      {s}
    </span>
  )
}

export default function IntelligencePage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState('resumen')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({})
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [skillFilter, setSkillFilter] = useState('')
  const [seniorityFilter, setSeniorityFilter] = useState('')

  // ── Carga de datos ──
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const headers = {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'Prefer': 'count=exact',
        }

        const [
          candRes, clientRes, searchRes, timelineRes,
          recruiterRes, topClientRes, hotRes,
        ] = await Promise.all([
          // totales
          fetch(`${SUPABASE_URL}/rest/v1/bondy_candidates?select=id&limit=1`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/bondy_clients?select=id&limit=1`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/bondy_searches?select=id&limit=1`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/bondy_timeline?select=id&limit=1`, { headers }),
          // recruiters
          fetch(`${SUPABASE_URL}/rest/v1/bondy_searches?select=recruiter_nombre,salary_usd&status=eq.won&limit=1000`, { headers }),
          // top clientes
          fetch(`${SUPABASE_URL}/rest/v1/bondy_clients?select=nombre_display,hires_total,status&hires_total=gt.0&order=hires_total.desc&limit=15`, { headers }),
          // candidatos calientes
          fetch(`${SUPABASE_URL}/rest/v1/bondy_candidates?select=nombre_completo,seniority,skills,pipeline_status,pais,ultima_interaccion&pipeline_status=in.(Client Interview,Offer,Offer rejection,Shortlist)&ultima_interaccion=gte.2023-01-01&order=ultima_interaccion.desc&limit=30`, { headers }),
        ])

        const totalCand = parseInt(candRes.headers.get('content-range')?.split('/')[1] || 0)
        const totalCli  = parseInt(clientRes.headers.get('content-range')?.split('/')[1] || 0)
        const totalSrch = parseInt(searchRes.headers.get('content-range')?.split('/')[1] || 0)
        const totalEvts = parseInt(timelineRes.headers.get('content-range')?.split('/')[1] || 0)

        const recruiterRows = await recruiterRes.json()
        const topClients    = await topClientRes.json()
        const hotCandidates = await hotRes.json()

        // Agrupar recruiters
        const recMap = {}
        recruiterRows.forEach(r => {
          if (!r.recruiter_nombre) return
          if (!recMap[r.recruiter_nombre]) recMap[r.recruiter_nombre] = { hires: 0, salaries: [] }
          recMap[r.recruiter_nombre].hires++
          if (r.salary_usd) recMap[r.recruiter_nombre].salaries.push(parseFloat(r.salary_usd))
        })
        const recruiters = Object.entries(recMap)
          .map(([name, d]) => ({
            name,
            hires: d.hires,
            avgSalary: d.salaries.length ? Math.round(d.salaries.reduce((a,b)=>a+b,0)/d.salaries.length) : null,
          }))
          .sort((a,b) => b.hires - a.hires)

        // Top skills desde candidatos
        const skillsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/bondy_candidates?select=skills&skills=not.is.null&limit=5000`,
          { headers }
        )
        const skillsData = await skillsRes.json()
        const skillCount = {}
        skillsData.forEach(r => {
          if (Array.isArray(r.skills)) {
            r.skills.forEach(s => { skillCount[s] = (skillCount[s]||0)+1 })
          }
        })
        const topSkills = Object.entries(skillCount)
          .sort((a,b)=>b[1]-a[1])
          .slice(0,20)
          .map(([skill,count])=>({ skill, count }))

        setData({ totalCand, totalCli, totalSrch, totalEvts, recruiters, topClients, hotCandidates, topSkills })
      } catch(e) {
        console.error(e)
      }
      setLoading(false)
    }
    load()
  }, [])

  // ── Búsqueda de candidatos ──
  async function searchCandidates() {
    if (!searchQ.trim() && !skillFilter && !seniorityFilter) return
    setSearching(true)
    try {
      let url = `${SUPABASE_URL}/rest/v1/bondy_candidates?select=nombre_completo,email,linkedin_url,seniority,skills,pais,pipeline_status,ultima_interaccion&limit=50`
      if (searchQ.trim()) url += `&nombre_completo=ilike.*${encodeURIComponent(searchQ.trim())}*`
      if (skillFilter)   url += `&skills=cs.{${encodeURIComponent(skillFilter)}}`
      if (seniorityFilter) url += `&seniority=eq.${encodeURIComponent(seniorityFilter)}`
      url += '&order=ultima_interaccion.desc.nullslast'
      const res = await fetch(url, {
        headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
      })
      const rows = await res.json()
      setSearchResults(rows)
    } catch(e) { console.error(e) }
    setSearching(false)
  }

  const tabs = [
    { id: 'resumen',    label: 'Resumen' },
    { id: 'clientes',   label: 'Clientes' },
    { id: 'candidatos', label: 'Candidatos' },
    { id: 'equipo',     label: 'Equipo' },
  ]

  const maxHires = data.topClients?.[0]?.hires_total || 1
  const maxRec   = data.recruiters?.[0]?.hires || 1

  return (
    <main style={{ backgroundColor: tw.bg, backgroundImage: notebookBg, minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{
        borderBottom: `1px solid ${tw.rule}`,
        padding: '0 clamp(1.25rem,5vw,3rem)',
        height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(254,252,249,0.97)',
        backgroundImage: notebookBg,
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <BondyLogo size={22} />
          <span style={{ fontFamily: serif, fontSize: '17px', color: '#1A1A1A', letterSpacing: '0.04em' }}>BONDY</span>
          <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tw.green, border: `1px solid rgba(74,140,64,0.3)`, padding: '3px 8px' }}>
            Intelligence
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {session?.user?.email && (
            <span style={{ fontFamily: mono, fontSize: '10px', color: tw.inkFaint, letterSpacing: '0.06em' }}>
              {session.user.email}
            </span>
          )}
          <Link href="/internal" style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.inkFaint, textDecoration: 'none' }}>
            ← Herramientas
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section style={{ padding: '3rem clamp(1.25rem,5vw,3rem) 2rem', borderBottom: `1px solid ${tw.rule}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          <div style={{ width: '20px', height: '1px', background: tw.green }} />
          <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green }}>
            Master DB — Airtable + Drive + Mercury
          </span>
        </div>
        <h1 style={{ fontFamily: serif, fontSize: 'clamp(2rem,4vw,3rem)', lineHeight: 1.0, color: tw.inkMid, marginBottom: '0.4rem' }}>
          Bondy Intelligence
        </h1>
        <svg width="180" height="7" viewBox="0 0 180 7" fill="none" style={{ display: 'block', marginBottom: '0.75rem' }}>
          <path d="M0 3.5 Q45 1 90 3.5 Q135 6 180 3.5" stroke="#4A8C40" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        </svg>
        <p style={{ fontFamily: mono, fontSize: '13px', color: tw.inkFaint, lineHeight: 1.7 }}>
          Historial unificado de candidatos, clientes y búsquedas.
        </p>
      </section>

      {/* Tabs */}
      <div style={{ padding: '0 clamp(1.25rem,5vw,3rem)', borderBottom: `1px solid ${tw.rule}`, display: 'flex', gap: '0' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
              color: tab === t.id ? tw.inkMid : tw.inkFaint,
              borderBottom: tab === t.id ? `2px solid ${tw.green}` : '2px solid transparent',
              marginBottom: '-1px', transition: 'all 0.15s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', fontFamily: mono, fontSize: '12px', color: tw.inkFaint, letterSpacing: '0.1em' }}>
          Cargando datos…
        </div>
      ) : (
        <div style={{ padding: 'clamp(1.25rem,5vw,3rem)' }}>

          {/* ── TAB: RESUMEN ── */}
          {tab === 'resumen' && (
            <div>
              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', border: `1px solid ${tw.rule}`, marginBottom: '2rem' }}>
                <StatCard label="Candidatos activos" value={data.totalCand?.toLocaleString('es-AR')} sub="con interacción real en Airtable" />
                <StatCard label="Clientes históricos" value={data.totalCli} sub="Airtable + Drive + Mercury" />
                <StatCard label="Búsquedas won" value={data.totalSrch} sub="hires confirmados 2022–2026" />
                <StatCard label="Eventos en timeline" value={data.totalEvts} sub="hired, screened, submitted…" />
              </div>

              {/* 2 columnas: top clientes + top skills */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Top clientes */}
                <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, padding: '1.75rem' }}>
                  <div style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green, marginBottom: '1.5rem' }}>
                    Clientes por hires totales
                  </div>
                  {data.topClients?.slice(0,8).map(c => (
                    <Bar key={c.nombre_display} label={c.nombre_display} value={c.hires_total} max={maxHires} sub="hires" />
                  ))}
                </div>

                {/* Top skills */}
                <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, padding: '1.75rem' }}>
                  <div style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green, marginBottom: '1.5rem' }}>
                    Skills más frecuentes en la base
                  </div>
                  {data.topSkills?.slice(0,8).map(s => (
                    <Bar key={s.skill} label={s.skill} value={s.count} max={data.topSkills[0]?.count || 1} sub="candidatos" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: CLIENTES ── */}
          {tab === 'clientes' && (
            <div>
              <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, padding: '1.75rem', marginBottom: '2rem' }}>
                <div style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green, marginBottom: '1.5rem' }}>
                  Todos los clientes con historial de hires
                </div>
                <SimpleTable
                  cols={[
                    { key: 'nombre_display', label: 'Cliente' },
                    { key: 'hires_total', label: 'Hires', right: true },
                    { key: 'status', label: 'Estado', render: v => <StatusPill s={v} /> },
                    { key: 'fecha_ultima_actividad', label: 'Última actividad', render: v => v ? new Date(v).toLocaleDateString('es-AR') : '—' },
                  ]}
                  rows={data.topClients}
                />
              </div>

              {/* Reactivación highlight */}
              <div style={{ background: 'rgba(74,140,64,0.04)', border: `1px solid rgba(74,140,64,0.2)`, padding: '1.5rem 1.75rem' }}>
                <div style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green, marginBottom: '0.75rem' }}>
                  Prioridad reactivación — clientes inactivos con más historia
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {data.topClients?.filter(c => c.status === 'reactivation_target').map(c => (
                    <span key={c.nombre_display} style={{ fontFamily: mono, fontSize: '11px', padding: '4px 12px', border: `1px solid rgba(74,140,64,0.3)`, color: tw.inkSub }}>
                      {c.nombre_display} — {c.hires_total} hires
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: CANDIDATOS ── */}
          {tab === 'candidatos' && (
            <div>
              {/* Buscador */}
              <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, padding: '1.75rem', marginBottom: '2rem' }}>
                <div style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green, marginBottom: '1.25rem' }}>
                  Buscar candidatos
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <input
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchCandidates()}
                    placeholder="Nombre…"
                    style={{ fontFamily: mono, fontSize: '12px', padding: '8px 12px', border: `1px solid ${tw.rule}`, background: tw.bg, color: tw.inkSub, flex: '1', minWidth: '180px', outline: 'none' }}
                  />
                  <input
                    value={skillFilter}
                    onChange={e => setSkillFilter(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchCandidates()}
                    placeholder="Skill (ej: React.js)"
                    style={{ fontFamily: mono, fontSize: '12px', padding: '8px 12px', border: `1px solid ${tw.rule}`, background: tw.bg, color: tw.inkSub, flex: '1', minWidth: '160px', outline: 'none' }}
                  />
                  <select
                    value={seniorityFilter}
                    onChange={e => setSeniorityFilter(e.target.value)}
                    style={{ fontFamily: mono, fontSize: '12px', padding: '8px 12px', border: `1px solid ${tw.rule}`, background: tw.bg, color: tw.inkSub, outline: 'none' }}>
                    <option value="">Seniority — todos</option>
                    {['Junior','Semi-Senior','Senior','Lead','Staff','Principal','Manager'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={searchCandidates}
                    style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '8px 18px', background: tw.green, color: tw.white, border: 'none', cursor: 'pointer' }}>
                    {searching ? 'Buscando…' : 'Buscar →'}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div>
                    <div style={{ fontFamily: mono, fontSize: '10px', color: tw.inkFaint, marginBottom: '0.75rem' }}>
                      {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
                    </div>
                    <SimpleTable
                      cols={[
                        { key: 'nombre_completo', label: 'Nombre' },
                        { key: 'seniority', label: 'Seniority' },
                        { key: 'skills', label: 'Skills', render: v => Array.isArray(v) ? v.slice(0,4).map(s => <SkillTag key={s} s={s} />) : '—' },
                        { key: 'pais', label: 'País' },
                        { key: 'pipeline_status', label: 'Status' },
                        { key: 'ultima_interaccion', label: 'Última int.', render: v => v ? new Date(v).toLocaleDateString('es-AR') : '—', right: true },
                      ]}
                      rows={searchResults}
                    />
                  </div>
                )}
              </div>

              {/* Candidatos calientes */}
              <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, padding: '1.75rem' }}>
                <div style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green, marginBottom: '0.5rem' }}>
                  Candidatos calientes — llegaron a entrevista de cliente u oferta
                </div>
                <div style={{ fontFamily: mono, fontSize: '11px', color: tw.inkFaint, marginBottom: '1.25rem' }}>
                  Ya pasaron el filtro de Bondy. Los más fáciles de reubicar en una nueva búsqueda.
                </div>
                <SimpleTable
                  cols={[
                    { key: 'nombre_completo', label: 'Nombre' },
                    { key: 'seniority', label: 'Seniority' },
                    { key: 'skills', label: 'Skills', render: v => Array.isArray(v) ? v.slice(0,3).map(s => <SkillTag key={s} s={s} />) : '—' },
                    { key: 'pipeline_status', label: 'Status' },
                    { key: 'ultima_interaccion', label: 'Última int.', right: true, render: v => v ? new Date(v).toLocaleDateString('es-AR') : '—' },
                  ]}
                  rows={data.hotCandidates}
                />
              </div>
            </div>
          )}

          {/* ── TAB: EQUIPO ── */}
          {tab === 'equipo' && (
            <div>
              <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, padding: '1.75rem', marginBottom: '2rem' }}>
                <div style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green, marginBottom: '1.5rem' }}>
                  Performance por recruiter — hires won 2022–2026
                </div>
                {data.recruiters?.map(r => (
                  <Bar key={r.name} label={r.name} value={r.hires} max={maxRec}
                    sub={r.avgSalary ? `hires · salary prom. $${r.avgSalary.toLocaleString('es-AR')}` : 'hires'} />
                ))}
              </div>

              <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, padding: '1.75rem' }}>
                <div style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green, marginBottom: '1.5rem' }}>
                  Detalle por recruiter
                </div>
                <SimpleTable
                  cols={[
                    { key: 'name', label: 'Recruiter' },
                    { key: 'hires', label: 'Hires totales', right: true },
                    { key: 'avgSalary', label: 'Salary prom. (USD)', right: true, render: v => v ? `$${v.toLocaleString('es-AR')}` : '—' },
                  ]}
                  rows={data.recruiters}
                />
              </div>
            </div>
          )}

        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '1.25rem clamp(1.25rem,5vw,3rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${tw.rule}`, marginTop: '2rem' }}>
        <span style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '0.10em', color: tw.inkFaint }}>
          Bondy Intelligence · Uso interno
        </span>
        <a href="https://wearebondy.com" target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '0.10em', color: tw.green, textDecoration: 'none' }}>
          wearebondy.com ↗
        </a>
      </div>

    </main>
  )
}
