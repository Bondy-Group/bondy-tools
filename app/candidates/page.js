'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'

// ── Design tokens (igual que /internal y hub) ──────────────────────────────
const tw = {
  bg: '#FEFCF9', inkMid: '#3A3530', inkSub: '#5A5550',
  inkFaint: '#7A7874', rule: '#E8E4DE', white: '#FFFFFF', green: '#4A8C40',
}
const serif = "'Special Elite', Georgia, serif"
const mono  = "'Courier Prime', Courier, monospace"
const notebookBg = [
  'linear-gradient(90deg, transparent 68px, rgba(210,100,80,0.10) 68px, rgba(210,100,80,0.10) 69.5px, transparent 69.5px)',
  'repeating-linear-gradient(180deg, transparent 0px, transparent 31px, rgba(100,140,200,0.09) 31px, rgba(100,140,200,0.09) 32px)',
].join(',')

// ── Supabase (jobs en tchppyxhapxtjemxrbqm — el proyecto principal de Bondy) ─
const SB_URL = 'https://tchppyxhapxtjemxrbqm.supabase.co'
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw'

// ── Helpers ────────────────────────────────────────────────────────────────
const MODALITY_LABEL = { remote: 'Remote', hybrid: 'Híbrido', onsite: 'Presencial' }
const MODALITY_COLOR = {
  remote:  { bg: '#e8f5e9', color: '#1b5e20' },
  hybrid:  { bg: '#fff3e0', color: '#bf360c' },
  onsite:  { bg: '#e3f2fd', color: '#0d47a1' },
}
const SOURCE_LABEL = {
  getonboard: 'GetOnBoard', remotive: 'Remotive', himalayas: 'Himalayas',
  wwr: 'WeWorkRemotely', greenhouse: 'Greenhouse', lever: 'Lever', yc: 'YC',
}

function daysAgo(d) {
  if (!d) return ''
  const n = Math.floor((Date.now() - new Date(d)) / 86400000)
  if (n === 0) return 'hoy'
  if (n === 1) return 'ayer'
  if (n < 7)  return `hace ${n}d`
  if (n < 30) return `hace ${Math.floor(n/7)}sem`
  return `hace ${Math.floor(n/30)}m`
}

function salary(job) {
  if (!job.min_salary && !job.max_salary) return ''
  const c = job.currency || 'USD'
  const f = n => `${c} ${Number(n).toLocaleString()}`
  if (job.min_salary && job.max_salary) return `${f(job.min_salary)} – ${f(job.max_salary)}`
  return f(job.min_salary || job.max_salary)
}

// ── Sub-components ─────────────────────────────────────────────────────────
const BondyLogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="4"  y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" />
    <rect x="22" y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".18" />
    <rect x="4"  y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".42" />
    <rect x="22" y="22" width="14" height="12" rx="2.5" fill="#4A8C40" />
  </svg>
)

function Tag({ children, style }) {
  return (
    <span style={{
      fontFamily: mono, fontSize: '10px', letterSpacing: '0.08em',
      padding: '2px 8px', border: `1px solid ${tw.rule}`,
      color: tw.inkSub, background: tw.bg,
      ...style,
    }}>{children}</span>
  )
}

function Select({ value, onChange, children }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      fontFamily: mono, fontSize: '11px', letterSpacing: '0.08em',
      padding: '6px 28px 6px 10px', border: `1px solid ${tw.rule}`,
      background: tw.white, color: tw.inkMid, cursor: 'pointer',
      outline: 'none', appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%237A7874'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
    }}>{children}</select>
  )
}

function JobCard({ job }) {
  const techs = (job.tech_stack || []).slice(0, 5)
  const mod = job.modality || ''
  const sal = salary(job)
  const modStyle = MODALITY_COLOR[mod] || MODALITY_COLOR.remote

  return (
    <article style={{
      background: tw.white,
      border: `1px solid ${tw.rule}`,
      borderLeft: job.is_featured ? `3px solid ${tw.green}` : `1px solid ${tw.rule}`,
      padding: '16px 20px',
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: '16px',
      alignItems: 'start',
      transition: 'border-color 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = tw.green }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = job.is_featured ? tw.green : tw.rule }}
    >
      <div>
        {/* Meta top */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
          {job.source && (
            <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tw.inkFaint }}>
              {SOURCE_LABEL[job.source] || job.source}
            </span>
          )}
          {job.published_at && (
            <span style={{ fontFamily: mono, fontSize: '10px', color: tw.inkFaint }}>{daysAgo(job.published_at)}</span>
          )}
        </div>

        {/* Title */}
        <h2 style={{ fontFamily: serif, fontSize: '17px', color: tw.inkMid, lineHeight: 1.2, marginBottom: '4px', opacity: 0.9 }}>
          {job.title || 'Sin título'}
        </h2>
        <p style={{ fontFamily: mono, fontSize: '13px', color: tw.inkSub, marginBottom: '12px' }}>
          {job.company_name || ''}
        </p>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {mod && (
            <Tag style={{ background: modStyle.bg, color: modStyle.color, border: 'none' }}>
              {MODALITY_LABEL[mod] || mod}
            </Tag>
          )}
          {job.seniority && job.seniority !== 'Not specified' && (
            <Tag style={{ background: '#f3e5f5', color: '#6a1b9a', border: 'none' }}>{job.seniority}</Tag>
          )}
          {techs.map(t => <Tag key={t}>{t}</Tag>)}
          {sal && (
            <Tag style={{ background: '#e8f5e9', color: '#1b5e20', border: 'none', fontWeight: 700 }}>{sal}</Tag>
          )}
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
        {job.location && (
          <span style={{ fontFamily: mono, fontSize: '11px', color: tw.inkFaint, textAlign: 'right', maxWidth: '140px' }}>
            {job.location}
          </span>
        )}
        {job.source_url && (
          <a href={job.source_url} target="_blank" rel="noopener noreferrer" style={{
            fontFamily: mono, fontSize: '11px', letterSpacing: '0.10em', textTransform: 'uppercase',
            padding: '7px 14px', background: tw.inkMid, color: '#fff',
            textDecoration: 'none', whiteSpace: 'nowrap',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = tw.green }}
          onMouseLeave={e => { e.currentTarget.style.background = tw.inkMid }}
          >Aplicar →</a>
        )}
      </div>
    </article>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function CandidatesPage() {
  const [jobs, setJobs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [category, setCategory] = useState('')
  const [modality, setModality] = useState('')
  const [seniority, setSeniority] = useState('')
  const [source, setSource]   = useState('')

  useEffect(() => {
    fetch(`${SB_URL}/rest/v1/jobs?select=id,title,company_name,location,modality,seniority,category,tech_stack,source,source_url,is_featured,min_salary,max_salary,currency,published_at&order=published_at.desc&limit=400`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    })
      .then(r => r.json())
      .then(data => { setJobs(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return jobs.filter(j => {
      if (category && j.category !== category) return false
      if (modality && j.modality !== modality) return false
      if (seniority && j.seniority !== seniority) return false
      if (source && j.source !== source) return false
      if (q) {
        const hay = `${j.title} ${j.company_name} ${(j.tech_stack||[]).join(' ')} ${j.location}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [jobs, search, category, modality, seniority, source])

  return (
    <main style={{ backgroundColor: tw.bg, backgroundImage: notebookBg, minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{
        borderBottom: `1px solid ${tw.rule}`,
        padding: '0 clamp(1.25rem,5vw,4rem)',
        height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(254,252,249,0.97)',
        backgroundImage: notebookBg,
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none' }}>
            <BondyLogo size={22} />
            <span style={{ fontFamily: serif, fontSize: '17px', color: '#1A1A1A', letterSpacing: '0.04em' }}>BONDY</span>
          </Link>
          <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tw.inkFaint, border: `1px solid ${tw.rule}`, padding: '3px 8px' }}>
            / Busco Trabajo
          </span>
        </div>
        <a href="https://wearebondy.com/contact" style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.green, textDecoration: 'none' }}>
          Sumar mi perfil →
        </a>
      </nav>

      {/* Hero */}
      <section style={{ padding: '3.5rem clamp(1.25rem,5vw,4rem) 2.5rem', borderBottom: `1px solid ${tw.rule}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <div style={{ width: '22px', height: '1px', background: tw.green }} />
          <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: tw.green }}>
            Bondy · Roles abiertos
          </span>
        </div>
        <h1 style={{ fontFamily: serif, fontSize: 'clamp(2rem, 5vw, 3.4rem)', color: tw.inkMid, lineHeight: 1.05, marginBottom: '12px', opacity: 0.88 }}>
          Roles tech en LATAM,<br />actualizados a diario
        </h1>
        <p style={{ fontFamily: mono, fontSize: '14px', color: tw.inkFaint, maxWidth: '480px', lineHeight: 1.7, marginBottom: '20px' }}>
          Agregamos posiciones de 8 fuentes todos los días. Sin login, sin fricción.
        </p>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {[
            ['Roles', loading ? '—' : jobs.length],
            ['Fuentes', '8'],
            ['Actualización', 'Diaria'],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontFamily: serif, fontSize: '22px', color: tw.green }}>{val}</div>
              <div style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tw.inkFaint }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Filters — sticky */}
      <div style={{
        position: 'sticky', top: '60px', zIndex: 40,
        backgroundColor: 'rgba(254,252,249,0.97)',
        backgroundImage: notebookBg,
        backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${tw.rule}`,
        padding: '10px clamp(1.25rem,5vw,4rem)',
        display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por título, empresa, tecnología…"
          style={{
            flex: 1, minWidth: '180px',
            fontFamily: mono, fontSize: '12px', letterSpacing: '0.04em',
            padding: '6px 12px', border: `1px solid ${tw.rule}`,
            background: tw.white, color: tw.inkMid, outline: 'none',
          }}
        />
        <Select value={category} onChange={setCategory}>
          <option value="">Todas las áreas</option>
          <option value="programming">Backend / Full Stack</option>
          <option value="data-science-analytics">Data & Analytics</option>
          <option value="machine-learning-ai">ML / AI</option>
          <option value="sysadmin-devops-qa">DevOps / QA</option>
          <option value="design">Design</option>
          <option value="product">Product</option>
          <option value="recruiting">Talent & Recruiting</option>
        </Select>
        <Select value={modality} onChange={setModality}>
          <option value="">Modalidad</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Híbrido</option>
          <option value="onsite">Presencial</option>
        </Select>
        <Select value={seniority} onChange={setSeniority}>
          <option value="">Seniority</option>
          <option value="Junior">Junior</option>
          <option value="Mid-Senior">Mid-Senior</option>
          <option value="Senior">Senior</option>
          <option value="Lead / Staff">Lead / Staff</option>
        </Select>
        <Select value={source} onChange={setSource}>
          <option value="">Fuente</option>
          <option value="getonboard">GetOnBoard</option>
          <option value="remotive">Remotive</option>
          <option value="himalayas">Himalayas</option>
          <option value="wwr">WeWorkRemotely</option>
          <option value="greenhouse">Greenhouse</option>
          <option value="lever">Lever</option>
          <option value="yc">YC</option>
        </Select>
        <span style={{ fontFamily: mono, fontSize: '11px', color: tw.inkFaint, marginLeft: 'auto' }}>
          <span style={{ color: tw.green, fontWeight: 700 }}>{filtered.length}</span> roles
        </span>
      </div>

      {/* Jobs */}
      <section style={{ padding: '24px clamp(1.25rem,5vw,4rem)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontFamily: mono, fontSize: '12px', color: tw.inkFaint, letterSpacing: '0.12em' }}>
              Cargando roles…
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            border: `1px dashed ${tw.rule}`, background: tw.white,
          }}>
            <div style={{ fontFamily: serif, fontSize: '20px', color: tw.inkMid, marginBottom: '8px' }}>
              Sin resultados
            </div>
            <p style={{ fontFamily: mono, fontSize: '13px', color: tw.inkFaint }}>
              Probá ajustando los filtros. Se agregan roles todos los días.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(j => <JobCard key={j.id} job={j} />)}
          </div>
        )}

        {/* Lead Magnet */}
        {!loading && (
          <div style={{
            marginTop: '48px',
            border: `1px solid ${tw.green}`,
            background: tw.white,
            padding: '32px clamp(1.5rem,4vw,3rem)',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '24px',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green, marginBottom: '10px' }}>
                Talent Network · Bondy
              </div>
              <h2 style={{ fontFamily: serif, fontSize: '22px', color: tw.inkMid, marginBottom: '8px', opacity: 0.9 }}>
                Buscás trabajo en tech?
              </h2>
              <p style={{ fontFamily: mono, fontSize: '13px', color: tw.inkSub, lineHeight: 1.7 }}>
                Sumá tu perfil al pool de Bondy. Más de 40.000 perfiles tech en LATAM. Solo te contactamos cuando hay un match real — sin spam, sin postulaciones genéricas.
              </p>
            </div>
            <a href="https://wearebondy.com/contact" style={{
              fontFamily: mono, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '12px 24px', background: tw.green, color: '#fff',
              textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-block',
            }}>
              Sumar mi perfil →
            </a>
          </div>
        )}
      </section>

      {/* Footer */}
      <div style={{ padding: '1.25rem clamp(1.25rem,5vw,4rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${tw.rule}` }}>
        <span style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '0.10em', color: tw.inkFaint }}>
          © {new Date().getFullYear()} Bondy Group
        </span>
        <a href="https://wearebondy.com" target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '0.10em', color: tw.green, textDecoration: 'none' }}>
          wearebondy.com ↗
        </a>
      </div>
    </main>
  )
}
