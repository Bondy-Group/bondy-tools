'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

/* ── Brand v4 typewriter tokens ── */
const tw = {
  bg: '#FEFCF9',
  white: '#FFFFFF',
  ink: '#1A1A1A',
  inkMid: '#3A3530',
  inkSub: '#5A5550',
  inkFaint: '#7A7874',
  rule: '#E8E4DE',
  ruleSoft: '#F0EDE6',
  green: '#4A8C40',
  greenTint: 'rgba(74,140,64,0.08)',
  amber: '#A87A2A',
  amberTint: 'rgba(168,122,42,0.10)',
  red: '#B7392B',
  redTint: 'rgba(183,57,43,0.08)',
}
const serif = "'Special Elite', Georgia, serif"
const mono  = "'Courier Prime', Courier, monospace"
const ui    = "'Plus Jakarta Sans', system-ui, sans-serif"

const SCRAPER_SUPABASE_URL = 'https://tchppyxhapxtjemxrbqm.supabase.co'
const SCRAPER_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw'

const BondyLogo = () => (
  <svg width="22" height="22" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="4" y="5" width="14" height="12" rx="2.5" fill="#1A1A1A" />
    <rect x="22" y="5" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".18" />
    <rect x="4" y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".42" />
    <rect x="22" y="22" width="14" height="12" rx="2.5" fill="#4A8C40" />
  </svg>
)

/* ── Boolean / X-Ray strings ── */
const BOOLEANS = [
  {
    categoria: 'X-Ray ATS — Greenhouse',
    descripcion: 'Roles tech abiertos en empresas con Greenhouse',
    strings: [
      { label: 'Backend/Python LATAM', q: `site:boards.greenhouse.io ("python" OR "backend" OR "django") ("latam" OR "latin america" OR "remote" OR "anywhere")` },
      { label: 'Data Engineer LATAM',  q: `site:boards.greenhouse.io ("data engineer" OR "data platform" OR "analytics engineer") ("latam" OR "remote")` },
      { label: 'Full Stack LATAM',     q: `site:boards.greenhouse.io ("full stack" OR "fullstack") ("latam" OR "remote" OR "latin america")` },
    ],
  },
  {
    categoria: 'X-Ray ATS — Lever',
    descripcion: 'Roles tech en empresas LATAM con Lever',
    strings: [
      { label: 'Backend Engineer LATAM', q: `site:jobs.lever.co ("backend" OR "python" OR "node") ("latam" OR "argentina" OR "colombia" OR "mexico" OR "remote")` },
      { label: 'Data/Analytics LATAM',   q: `site:jobs.lever.co ("data engineer" OR "data analyst" OR "analytics") ("latam" OR "remote")` },
    ],
  },
  {
    categoria: 'X-Ray ATS — Ashby',
    descripcion: 'Startups modernas con Ashby (Deel, Fintual, Lemon…)',
    strings: [
      { label: 'Engineers LATAM/Remote', q: `site:jobs.ashbyhq.com ("engineer" OR "developer") ("latam" OR "remote" OR "latin america")` },
      { label: 'Backend Python/Go',      q: `site:jobs.ashbyhq.com ("python" OR "golang" OR "backend") "remote"` },
    ],
  },
  {
    categoria: 'X-Ray ATS — SmartRecruiters',
    descripcion: 'Empresas LATAM en SmartRecruiters (Globant, MeLi…)',
    strings: [
      { label: 'Tech LATAM', q: `site:careers.smartrecruiters.com ("developer" OR "engineer" OR "data") ("latam" OR "argentina" OR "colombia" OR "mexico")` },
    ],
  },
  {
    categoria: 'X-Ray ATS — BambooHR',
    descripcion: 'Empresas medianas con BambooHR',
    strings: [
      { label: 'Engineers Remote', q: `site:*.bamboohr.com/careers ("engineer" OR "developer" OR "backend") "remote"` },
    ],
  },
  {
    categoria: 'X-Ray LinkedIn',
    descripcion: 'Postings públicos de LinkedIn (sin login)',
    strings: [
      { label: 'Backend Python LATAM',  q: `site:linkedin.com/jobs/view "python" ("latam" OR "latin america" OR "argentina" OR "colombia") "remote"` },
      { label: 'Data Engineer remoto',  q: `site:linkedin.com/jobs/view ("data engineer" OR "analytics engineer") "remote" ("latam" OR "americas")` },
      { label: 'Full Stack remoto',     q: `site:linkedin.com/jobs/view ("full stack" OR "fullstack") ("react" OR "vue" OR "angular") "remote"` },
    ],
  },
  {
    categoria: 'X-Ray Indeed',
    descripcion: 'Indeed LATAM (AR, CO, MX, CL)',
    strings: [
      { label: 'Backend Python Argentina', q: `site:ar.indeed.com ("python" OR "backend" OR "django") "remoto"` },
      { label: 'Data roles Argentina',     q: `site:ar.indeed.com ("data engineer" OR "analista de datos" OR "data analyst") ("remoto" OR "híbrido")` },
      { label: 'Tech Colombia',            q: `site:co.indeed.com ("desarrollador" OR "developer" OR "python" OR "backend") ("remoto" OR "bogotá" OR "medellín")` },
      { label: 'Tech México',              q: `site:mx.indeed.com ("desarrollador backend" OR "python developer" OR "fullstack") ("remoto" OR "home office")` },
    ],
  },
  {
    categoria: 'X-Ray General — Señales de hiring',
    descripcion: 'Detectar empresas que están contratando tech sin board conocido',
    strings: [
      { label: 'Empresas LATAM tech contratando (Greenhouse)', q: `"we're hiring" OR "join our team" site:boards.greenhouse.io ("latam" OR "latin america")` },
      { label: 'Startups LATAM abriendo roles Python',         q: `("we are hiring" OR "join us") "python" "engineer" ("latam" OR "remote" OR "latin america") -site:linkedin.com -site:indeed.com` },
      { label: 'Empresas con jobs.lever en LATAM',             q: `site:jobs.lever.co ("argentina" OR "colombia" OR "chile" OR "mexico" OR "peru") ("backend" OR "python" OR "data")` },
      { label: 'Tech roles remote con Ashby',                  q: `site:jobs.ashbyhq.com "remote" ("backend" OR "data engineer" OR "python" OR "golang")` },
    ],
  },
  {
    categoria: 'X-Ray Competencia',
    descripcion: 'Ver qué perfiles busca la competencia (inteligencia de mercado)',
    strings: [
      { label: 'Empresas recruiting LATAM buscando recruiters', q: `("technical recruiter" OR "tech recruiter" OR "it recruiter") ("latam" OR "latin america") "remote" site:linkedin.com/jobs/view` },
      { label: 'Roles Head of TA startups LATAM',               q: `("head of talent" OR "head of people" OR "director of talent") ("latam" OR "remote" OR "latin america") site:linkedin.com/jobs/view` },
    ],
  },
]

const sbHeaders = {
  apikey: SCRAPER_SUPABASE_KEY,
  Authorization: `Bearer ${SCRAPER_SUPABASE_KEY}`,
}

function relTime(iso) {
  if (!iso) return 'nunca'
  const d = (Date.now() - new Date(iso).getTime()) / 86400000
  if (d < 0.04) return 'recién'
  if (d < 1)    return `hace ${Math.round(d * 24)}h`
  if (d < 2)    return 'ayer'
  if (d < 7)    return `hace ${Math.floor(d)}d`
  return `hace ${Math.floor(d / 7)}sem`
}

function healthOf(s) {
  if (!s.in_scraper) return null
  const ageDays = s.last_run_at
    ? (Date.now() - new Date(s.last_run_at).getTime()) / 86400000
    : null
  if (s.last_run_status === 'error') return { tone: 'red',   label: 'Error' }
  if (ageDays === null)              return { tone: 'amber', label: 'Sin corridas' }
  if (ageDays > 2)                   return { tone: 'red',   label: 'Atrasada' }
  if (ageDays > 1.2)                 return { tone: 'amber', label: 'Demorada' }
  if (s.last_run_status === 'warn')  return { tone: 'amber', label: 'Alerta' }
  return { tone: 'green', label: 'OK' }
}

export default function JobScraperSourcePage() {
  const router = useRouter()
  const { status: sessionStatus } = useSession()

  const [tab, setTab] = useState('sources')
  const [sources, setSources] = useState([])
  const [counts, setCounts]   = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [savingId, setSavingId] = useState(null)

  // "+ Agregar" modal
  const [requestSource, setRequestSource] = useState(null)  // source row | null
  const [requestNotes, setRequestNotes] = useState('')
  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [requestError, setRequestError] = useState(null)
  const [requestDone, setRequestDone] = useState(null)       // {name, slackPosted} | null

  const [search, setSearch] = useState('')
  const [method, setMethod] = useState('Todos')
  const [latam,  setLatam]  = useState('Todos')
  const [tipo,   setTipo]   = useState('Todos')
  const [onlyNew, setOnlyNew] = useState(false)

  const [copied, setCopied] = useState(null)

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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [srcRes, jobsRes] = await Promise.all([
        fetch(`${SCRAPER_SUPABASE_URL}/rest/v1/job_sources?select=*&order=display_order.asc`, { headers: sbHeaders }),
        fetch(`${SCRAPER_SUPABASE_URL}/rest/v1/jobs?select=source&limit=10000`, { headers: sbHeaders }),
      ])
      if (!srcRes.ok) throw new Error(`job_sources HTTP ${srcRes.status}`)
      const rows = await srcRes.json()
      const jobs = jobsRes.ok ? await jobsRes.json() : []
      const c = {}
      for (const j of jobs) c[j.source] = (c[j.source] || 0) + 1
      setSources(rows)
      setCounts(c)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (sessionStatus === 'authenticated') load() }, [sessionStatus, load])

  const toggleActive = async (s) => {
    setSavingId(s.id)
    const next = !s.active
    setSources(prev => prev.map(x => x.id === s.id ? { ...x, active: next } : x))
    try {
      const r = await fetch(`${SCRAPER_SUPABASE_URL}/rest/v1/job_sources?id=eq.${s.id}`, {
        method: 'PATCH',
        headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ active: next }),
      })
      if (!r.ok) throw new Error(`PATCH ${r.status}`)
    } catch (e) {
      setSources(prev => prev.map(x => x.id === s.id ? { ...x, active: !next } : x))
      setError(`No se pudo guardar el toggle de ${s.name}: ${e.message}`)
    } finally {
      setSavingId(null)
    }
  }

  const filtered = useMemo(() => sources.filter(s =>
    (method === 'Todos' || s.method === method) &&
    (latam  === 'Todos' || s.latam_coverage === latam) &&
    (tipo   === 'Todos' || s.tipo === tipo) &&
    (!onlyNew || !s.in_scraper) &&
    (!search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      (s.notes || '').toLowerCase().includes(search.toLowerCase()))
  ), [sources, method, latam, tipo, onlyNew, search])

  const integrated = sources.filter(s => s.in_scraper)
  const pending = sources.filter(s => !s.in_scraper)

  const copy = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  const openRequest = (s) => {
    setRequestSource(s)
    setRequestNotes('')
    setRequestError(null)
    setRequestDone(null)
  }
  const closeRequest = () => {
    if (requestSubmitting) return
    setRequestSource(null)
  }
  const submitRequest = async () => {
    if (!requestSource) return
    setRequestSubmitting(true)
    setRequestError(null)
    try {
      const r = await fetch('/api/internal/job-sources/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: requestSource.id, notes: requestNotes }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      // Refresh source row in place so the badge updates immediately.
      setSources(prev => prev.map(x => x.id === requestSource.id
        ? { ...x, integration_requested_at: j.source.integration_requested_at, integration_request_notes: requestNotes || null }
        : x
      ))
      setRequestDone({ name: requestSource.name, slackPosted: j.slackPosted })
    } catch (e) {
      setRequestError(String(e.message || e))
    } finally {
      setRequestSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: tw.bg, fontFamily: ui, color: tw.ink }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 28px', borderBottom: `1px solid ${tw.rule}` }}>
        <Link href="/internal" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: tw.ink }}>
          <BondyLogo />
          <span style={{ fontFamily: serif, fontSize: 18, letterSpacing: 1 }}>BONDY</span>
        </Link>
        <span style={{ color: tw.inkFaint, fontFamily: mono, fontSize: 12 }}>/ job scraper sources</span>
        <div style={{ flex: 1 }} />
        <button onClick={load} disabled={loading} style={{
          fontFamily: mono, fontSize: 11, padding: '5px 12px',
          background: tw.white, border: `1px solid ${tw.rule}`, borderRadius: 6,
          color: tw.inkSub, cursor: loading ? 'wait' : 'pointer',
        }}>{loading ? '· Cargando' : 'Refrescar'}</button>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 28px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 6, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, margin: 0, letterSpacing: '-0.5px' }}>
            Job Scraper Sources
          </h1>
          <span style={{ fontFamily: mono, fontSize: 11, color: tw.inkFaint }}>
            {sources.length} fuentes · {integrated.length} integradas · {pending.length} por agregar
          </span>
        </div>
        <p style={{ fontFamily: ui, fontSize: 13, color: tw.inkSub, margin: '0 0 22px', maxWidth: 720, lineHeight: 1.55 }}>
          Catálogo único de fuentes de jobs. El toggle on/off afecta al scraper y a /busco-trabajo en simultáneo.
          La salud de cada integrada se actualiza con cada corrida.
        </p>

        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${tw.rule}`, marginBottom: 20 }}>
          {[['sources', 'Fuentes'], ['booleans', 'Boolean / X-Ray']].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 18px', fontFamily: mono, fontSize: 12,
              color: tab === k ? tw.green : tw.inkSub,
              borderBottom: tab === k ? `2px solid ${tw.green}` : '2px solid transparent',
              fontWeight: tab === k ? 600 : 400,
              marginBottom: -1,
            }}>{label}</button>
          ))}
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', marginBottom: 14, borderRadius: 6,
            background: tw.redTint, color: tw.red, border: `1px solid ${tw.red}`,
            fontFamily: mono, fontSize: 12,
          }}>{error}</div>
        )}

        {tab === 'sources' && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar fuente…" style={{
                padding: '6px 12px', borderRadius: 18, border: `1px solid ${tw.rule}`,
                background: tw.white, fontFamily: mono, fontSize: 12, color: tw.ink,
                outline: 'none', minWidth: 180,
              }} />
              <FilterPills value={method} onChange={setMethod} options={['Todos', 'API', 'RSS', 'HTML']} />
              <Sep />
              <FilterPills value={latam} onChange={setLatam} options={['Todos', 'Alta', 'Media', 'Baja']} prefix="LATAM:" />
              <Sep />
              <FilterPills value={tipo} onChange={setTipo} options={['Todos', 'ATS', 'Board', 'Board LATAM']} />
              <Sep />
              <button onClick={() => setOnlyNew(v => !v)} style={{
                padding: '4px 12px', borderRadius: 18, fontFamily: mono, fontSize: 11, cursor: 'pointer',
                border: `1px solid ${onlyNew ? tw.amber : tw.rule}`,
                background: onlyNew ? tw.amberTint : tw.white,
                color: onlyNew ? tw.amber : tw.inkSub, fontWeight: 500,
              }}>⚡ Solo por agregar</button>
            </div>

            <div style={{ fontFamily: mono, fontSize: 11, color: tw.inkFaint, marginBottom: 8 }}>
              {filtered.length} fuente{filtered.length === 1 ? '' : 's'}
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: tw.inkFaint, fontFamily: mono, fontSize: 12 }}>cargando…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filtered.map(s => (
                  <SourceRow
                    key={s.id}
                    s={s}
                    count={counts[s.id] || 0}
                    saving={savingId === s.id}
                    onToggle={() => toggleActive(s)}
                    onRequest={() => openRequest(s)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'booleans' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {BOOLEANS.map((cat, ci) => (
              <div key={ci} style={{
                background: tw.white, borderRadius: 10, border: `1px solid ${tw.rule}`,
                overflow: 'hidden',
              }}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${tw.ruleSoft}` }}>
                  <div style={{ fontFamily: mono, fontSize: 12, color: tw.green, fontWeight: 600 }}>{cat.categoria}</div>
                  <div style={{ fontFamily: ui, fontSize: 12, color: tw.inkSub, marginTop: 2 }}>{cat.descripcion}</div>
                </div>
                <div>
                  {cat.strings.map((s, si) => {
                    const id = `${ci}-${si}`
                    return (
                      <div key={si} style={{
                        padding: '10px 16px',
                        borderBottom: si < cat.strings.length - 1 ? `1px solid ${tw.ruleSoft}` : 'none',
                        display: 'flex', gap: 12, alignItems: 'flex-start',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: ui, fontSize: 12, fontWeight: 600, color: tw.inkMid, marginBottom: 4 }}>{s.label}</div>
                          <code style={{
                            fontFamily: mono, fontSize: 11, background: tw.bg,
                            padding: '6px 10px', borderRadius: 4, display: 'block',
                            color: tw.ink, lineHeight: 1.5, wordBreak: 'break-all',
                            border: `1px solid ${tw.ruleSoft}`,
                          }}>{s.q}</code>
                        </div>
                        <button onClick={() => copy(s.q, id)} style={{
                          padding: '5px 10px', borderRadius: 6, border: `1px solid ${tw.rule}`,
                          background: copied === id ? tw.greenTint : tw.white,
                          color: copied === id ? tw.green : tw.inkSub,
                          fontFamily: mono, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}>{copied === id ? '✓ Copiado' : 'Copiar'}</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <div style={{ fontFamily: mono, fontSize: 11, color: tw.inkFaint, padding: '4px 8px' }}>
              Tip: pegá las strings directamente en Google. Para LinkedIn, agregá <code style={{ background: tw.ruleSoft, padding: '1px 5px', borderRadius: 3 }}>-intitle:profiles</code> para excluir perfiles y ver solo jobs.
            </div>
          </div>
        )}
      </div>

      {requestSource && (
        <RequestModal
          source={requestSource}
          notes={requestNotes}
          setNotes={setRequestNotes}
          submitting={requestSubmitting}
          error={requestError}
          done={requestDone}
          onClose={closeRequest}
          onSubmit={submitRequest}
        />
      )}
    </div>
  )
}

function Sep() {
  return <span style={{ color: tw.inkFaint, fontFamily: mono, fontSize: 11, padding: '0 2px' }}>·</span>
}

function FilterPills({ value, onChange, options, prefix }) {
  return options.map(opt => {
    const sel = value === opt
    return (
      <button key={opt} onClick={() => onChange(opt)} style={{
        padding: '4px 12px', borderRadius: 18, cursor: 'pointer',
        border: `1px solid ${sel ? tw.green : tw.rule}`,
        background: sel ? tw.green : tw.white,
        color: sel ? tw.white : tw.inkSub,
        fontFamily: mono, fontSize: 11, fontWeight: sel ? 600 : 400,
        transition: 'all .12s',
      }}>{prefix ? `${prefix} ${opt}` : opt}</button>
    )
  })
}

function MethodBadge({ method }) {
  const map = {
    API:  { bg: tw.greenTint,  fg: tw.green },
    RSS:  { bg: tw.amberTint,  fg: tw.amber },
    HTML: { bg: 'rgba(58,53,48,0.06)', fg: tw.inkMid },
  }
  const c = map[method] || map.HTML
  return (
    <span style={{
      background: c.bg, color: c.fg,
      padding: '2px 8px', borderRadius: 4,
      fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
      textAlign: 'center', display: 'inline-block', minWidth: 36,
    }}>{method}</span>
  )
}

function LatamBadge({ value }) {
  const map = {
    Alta:  { bg: tw.greenTint, fg: tw.green },
    Media: { bg: tw.amberTint, fg: tw.amber },
    Baja:  { bg: 'rgba(183,57,43,0.06)', fg: tw.red },
  }
  const c = map[value] || { bg: tw.ruleSoft, fg: tw.inkSub }
  return (
    <span style={{
      background: c.bg, color: c.fg,
      padding: '2px 8px', borderRadius: 4,
      fontFamily: mono, fontSize: 10, fontWeight: 600,
      textAlign: 'center', display: 'inline-block', minWidth: 42,
    }}>{value}</span>
  )
}

function HealthDot({ tone }) {
  const c = { green: tw.green, amber: tw.amber, red: tw.red }[tone] || tw.inkFaint
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c }} />
}

function Toggle({ on, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={on} style={{
      width: 38, height: 22, borderRadius: 999, position: 'relative',
      background: on ? tw.green : tw.rule,
      border: 'none', cursor: disabled ? 'wait' : 'pointer',
      transition: 'background .15s',
      flexShrink: 0,
    }}>
      <span style={{
        position: 'absolute', top: 2, left: on ? 18 : 2,
        width: 18, height: 18, borderRadius: '50%', background: tw.white,
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        transition: 'left .15s',
      }} />
    </button>
  )
}

function SourceRow({ s, count, saving, onToggle, onRequest }) {
  const health = healthOf(s)
  const target = s.target_per_run
  const last = s.last_run_count
  const volPct = (target && last != null) ? Math.min(100, Math.round((last / target) * 100)) : null
  const requested = !s.in_scraper && !!s.integration_requested_at

  return (
    <div style={{
      background: tw.white, borderRadius: 8, padding: '12px 14px',
      border: `1px solid ${s.in_scraper ? tw.rule : tw.ruleSoft}`,
      opacity: s.active ? 1 : 0.55,
      display: 'grid',
      gridTemplateColumns: 'minmax(180px, 1.5fr) 64px 60px 90px 1fr 110px',
      gap: 14, alignItems: 'center',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: ui, fontSize: 13, fontWeight: 600, color: tw.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
          {s.name}
          {s.in_scraper && <span style={{
            fontFamily: mono, fontSize: 9, color: tw.green, fontWeight: 700,
            border: `1px solid ${tw.green}`, padding: '1px 5px', borderRadius: 3,
          }}>SCRAPER</span>}
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, color: tw.inkFaint, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {s.url}
        </div>
      </div>

      <MethodBadge method={s.method} />
      <LatamBadge value={s.latam_coverage} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: mono, fontSize: 10, color: tw.inkSub }}>{s.tipo}</span>
        <span style={{ fontFamily: mono, fontSize: 10, color: s.auth_required ? tw.red : tw.green }}>
          {s.auth_required ? '🔒 Auth' : '✓ Público'}
        </span>
      </div>

      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {s.in_scraper ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: mono, fontSize: 11, color: tw.inkMid, flexWrap: 'wrap' }}>
              {health && <HealthDot tone={health.tone} />}
              <span>{health?.label}</span>
              <span style={{ color: tw.inkFaint }}>·</span>
              <span style={{ color: tw.inkSub }}>{count.toLocaleString('es-AR')} en DB</span>
              <span style={{ color: tw.inkFaint }}>·</span>
              <span style={{ color: tw.inkFaint }}>{relTime(s.last_run_at)}</span>
            </div>
            {volPct != null && (
              <div style={{ width: '100%', height: 4, background: tw.ruleSoft, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  width: `${volPct}%`, height: '100%',
                  background: volPct < 30 ? tw.red : volPct < 70 ? tw.amber : tw.green,
                }} />
              </div>
            )}
            {s.last_run_error && (
              <div style={{ fontFamily: mono, fontSize: 10, color: tw.red, marginTop: 2 }} title={s.last_run_error}>
                {s.last_run_error.slice(0, 80)}{s.last_run_error.length > 80 ? '…' : ''}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontFamily: ui, fontSize: 11, color: tw.inkSub, lineHeight: 1.4 }}>
            {s.notes}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
        {s.in_scraper ? (
          <>
            <span style={{ fontFamily: mono, fontSize: 10, color: tw.inkFaint }}>{s.active ? 'on' : 'off'}</span>
            <Toggle on={s.active} onClick={onToggle} disabled={saving} />
          </>
        ) : requested ? (
          <span title={s.integration_request_notes || ''} style={{
            padding: '5px 10px', borderRadius: 6, border: `1px solid #2563eb`,
            background: 'rgba(37,99,235,0.08)', color: '#2563eb',
            fontFamily: mono, fontSize: 10, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            whiteSpace: 'nowrap',
          }}>🔵 Pedido · {relTime(s.integration_requested_at)}</span>
        ) : (
          <button onClick={onRequest} style={{
            padding: '5px 10px', borderRadius: 6, border: `1px solid ${tw.amber}`,
            background: tw.amberTint, color: tw.amber,
            fontFamily: mono, fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>+ Agregar</button>
        )}
      </div>
    </div>
  )
}

function RequestModal({ source, notes, setNotes, submitting, error, done, onClose, onSubmit }) {
  const isDone = !!done
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(26,26,26,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20, fontFamily: ui,
      }}>
      <div style={{
        background: tw.bg, borderRadius: 12, maxWidth: 520, width: '100%',
        border: `1px solid ${tw.rule}`, boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}>
        {!isDone ? (
          <>
            <div style={{ padding: '18px 22px 12px', borderBottom: `1px solid ${tw.rule}` }}>
              <div style={{ fontFamily: mono, fontSize: 11, color: tw.inkFaint, letterSpacing: 1, textTransform: 'uppercase' }}>
                Pedir integración al scraper
              </div>
              <div style={{ fontFamily: serif, fontSize: 22, color: tw.ink, marginTop: 4 }}>
                {source.name}
              </div>
              <div style={{ fontFamily: mono, fontSize: 11, color: tw.inkFaint, marginTop: 4 }}>
                {source.url} · {source.method} · LATAM {source.latam_coverage} · {source.tipo}
              </div>
            </div>

            <div style={{ padding: '16px 22px' }}>
              <div style={{ fontFamily: ui, fontSize: 13, color: tw.inkSub, lineHeight: 1.55, marginBottom: 14 }}>
                Esto marca la fuente como pedida en el catálogo y avisa a Mateo Dev en
                <code style={{ background: tw.ruleSoft, padding: '1px 5px', borderRadius: 3, margin: '0 4px' }}>#agentes-bondy</code>.
                En la próxima sesión Mateo escribe el módulo, lo prueba y la integra.
              </div>

              <label style={{ display: 'block', marginBottom: 6, fontFamily: mono, fontSize: 11, color: tw.inkSub }}>
                Contexto opcional (prioridad, qué query querés priorizar, etc.)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: priorizá Ashby porque queremos las búsquedas de Deel y Lemon"
                rows={4}
                disabled={submitting}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                  fontFamily: ui, fontSize: 13, color: tw.ink, background: tw.white,
                  border: `1px solid ${tw.rule}`, borderRadius: 6,
                  outline: 'none', resize: 'vertical', minHeight: 80,
                }}
              />

              {error && (
                <div style={{
                  marginTop: 12, padding: '8px 12px', borderRadius: 6,
                  background: tw.redTint, color: tw.red, border: `1px solid ${tw.red}`,
                  fontFamily: mono, fontSize: 11,
                }}>{error}</div>
              )}
            </div>

            <div style={{
              padding: '12px 22px 18px', display: 'flex', justifyContent: 'flex-end', gap: 8,
              borderTop: `1px solid ${tw.ruleSoft}`,
            }}>
              <button onClick={onClose} disabled={submitting} style={{
                padding: '7px 14px', borderRadius: 6, border: `1px solid ${tw.rule}`,
                background: tw.white, color: tw.inkSub,
                fontFamily: mono, fontSize: 12, cursor: submitting ? 'wait' : 'pointer',
              }}>Cancelar</button>
              <button onClick={onSubmit} disabled={submitting} style={{
                padding: '7px 14px', borderRadius: 6, border: `1px solid ${tw.green}`,
                background: tw.green, color: tw.white,
                fontFamily: mono, fontSize: 12, fontWeight: 600,
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.65 : 1,
              }}>{submitting ? '· Enviando' : 'Pedir integración'}</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '24px 22px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔵</div>
              <div style={{ fontFamily: serif, fontSize: 22, color: tw.ink, marginBottom: 6 }}>
                Pedido enviado
              </div>
              <div style={{ fontFamily: ui, fontSize: 13, color: tw.inkSub, lineHeight: 1.55 }}>
                <strong>{done.name}</strong> quedó marcada como pedida.{' '}
                {done.slackPosted
                  ? <>Avisé a Mateo Dev en <code style={{ background: tw.ruleSoft, padding: '1px 5px', borderRadius: 3 }}>#agentes-bondy</code>.</>
                  : <span style={{ color: tw.amber }}>(Slack no respondió, pero el pedido quedó guardado.)</span>}
              </div>
            </div>
            <div style={{ padding: '16px 22px 18px', display: 'flex', justifyContent: 'center' }}>
              <button onClick={onClose} style={{
                padding: '7px 14px', borderRadius: 6, border: `1px solid ${tw.green}`,
                background: tw.green, color: tw.white,
                fontFamily: mono, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>Listo</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
