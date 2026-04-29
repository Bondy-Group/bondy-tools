'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import InterviewTab from '@/components/InterviewTab'
import CulturalFitTab from '@/components/CulturalFitTab'
import ScorecardAdminPage from '@/app/internal/scorecard-admin/page'

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

const tw = {
  bg: '#FEFCF9',
  white: '#FFFFFF',
  ink: '#1A1A1A',
  inkMid: '#3A3530',
  inkSub: '#5A5550',
  inkFaint: '#7A7874',
  rule: '#E8E4DE',
  green: '#4A8C40',
  greenTint: 'rgba(74,140,64,0.08)',
  greenEdge: 'rgba(74,140,64,0.35)',
}
const serif = "'Special Elite', Georgia, serif"
const mono  = "'Courier Prime', Courier, monospace"
const ui    = "'Plus Jakarta Sans', system-ui, sans-serif"

const BondyLogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="4"  y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" />
    <rect x="22" y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".18" />
    <rect x="4"  y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".42" />
    <rect x="22" y="22" width="14" height="12" rx="2.5" fill="#4A8C40" />
  </svg>
)

/* RESOURCES — sorted by usageRank, top 3 = pinned */
/**
 * RESOURCES — metadata estable.
 * - `staticRank`: orden default cuando el usuario aún no tiene clicks registrados.
 *   Una vez que hay tracking real, el rank dinámico (click_count desc) lo reemplaza.
 * - `lastUsed` y `usage` NO se setean acá: se calculan desde tool_usage_30d.
 */
const resources = [
  {
    id: 'assistant',
    name: 'Asistente de Informes',
    cat: 'AI / Reportes', catKey: 'ai',
    desc: 'Screening reports y cultural fit con IA. Scorecard ponderado por posición. El motor que arma los informes que mandás a clientes.',
    descShort: 'Screening + cultural fit con IA. Scorecards.',
    glyph: 'AI',
    shortcut: '⌘1', staticRank: 1, status: 'live',
    href: 'https://interview-report-gen1.vercel.app',
    external: true,
  },
  {
    id: 'ats',
    name: 'Bondy ATS',
    cat: 'Pipeline', catKey: 'pipeline',
    desc: 'Pipeline por búsqueda con vistas lista y kanban, quick actions y scorecard integrado.',
    descShort: 'Pipeline por búsqueda. Lista, kanban, scorecard.',
    glyph: 'AT',
    shortcut: '⌘2', staticRank: 2, status: 'live',
    href: '/internal/ats',
  },
  {
    id: 'job-board',
    name: 'Job Board',
    cat: 'Pipeline', catKey: 'pipeline',
    desc: 'CRUD de búsquedas en wearebondy.com/roles + inbox de aplicaciones con CV.',
    descShort: 'CRUD de roles públicos + inbox de aplicaciones.',
    glyph: 'JB',
    shortcut: '⌘3', staticRank: 3, status: 'live',
    href: '/internal/job-board',
    adminOnly: true,
  },
  {
    id: 'lead-analyzer',
    name: 'Lead Analyzer',
    cat: 'AI / Reportes', catKey: 'ai',
    descShort: 'Scoring ICP, contacto verificado y draft de email.',
    desc: 'Scoring ICP, contacto verificado y draft de email personalizado en segundos.',
    glyph: 'LA',
    shortcut: '⌘4', staticRank: 4, status: 'live',
    href: '/internal/lead-analyzer',
  },
  {
    id: 'interview-hub',
    name: 'Interview Hub',
    cat: 'Pipeline', catKey: 'pipeline',
    descShort: 'Agenda, preguntas por competencia y notas estructuradas.',
    desc: 'Agendá entrevistas, generá preguntas por competencia y tomá notas estructuradas.',
    glyph: 'IH',
    shortcut: '⌘5', staticRank: 5, status: 'live',
    href: '/interview-hub',
  },
  {
    id: 'intelligence',
    name: 'Bondy Intelligence',
    cat: 'Datos', catKey: 'datos',
    descShort: 'Master DB en vivo: candidatos, clientes, performance.',
    desc: 'Historial de candidatos y clientes, performance del equipo, campañas. Master DB en vivo.',
    glyph: 'BI',
    shortcut: '⌘6', staticRank: 6, status: 'live',
    href: '/internal/intelligence',
  },
  {
    id: 'market-signals',
    name: 'Market Signals',
    cat: 'Datos', catKey: 'datos',
    descShort: 'Qué tecnologías y perfiles contratan en LATAM.',
    desc: 'Señales del mercado tech: qué tecnologías y perfiles están contratando en LATAM.',
    glyph: 'MS',
    shortcut: '⌘7', staticRank: 7, status: 'live',
    href: '/internal/market-signals',
  },
  {
    id: 'proposals',
    name: 'Service Proposals',
    cat: 'Admin', catKey: 'admin',
    descShort: 'Generador de acuerdos. Form + preview + PDF.',
    desc: 'Generador de acuerdos de servicio. Form + preview live + export PDF. Persistido en Supabase con agreement ID.',
    glyph: 'SP',
    shortcut: '⌘8', staticRank: 8, status: 'live',
    href: '/internal/proposals',
    adminOnly: true,
  },
  {
    id: 'seguimiento-pagos',
    name: 'Seguimiento de Pagos',
    cat: 'Admin', catKey: 'admin',
    descShort: 'Comisiones, cobros y envío de invoices.',
    desc: 'Comisiones por búsqueda, estado de cobros y envío de invoices para recruiters y sourcers.',
    glyph: 'PG',
    shortcut: '⌘9', staticRank: 9, status: 'live',
    href: '/internal/seguimiento-pagos',
    adminOnly: true,
  },
  {
    id: 'chrome',
    name: 'Extensión Chrome',
    cat: 'Extras', catKey: 'extras',
    descShort: 'Capturá perfiles de LinkedIn directo en tu flujo.',
    desc: 'Capturá perfiles de LinkedIn directo en tu flujo. Descargá e instalá.',
    glyph: 'CR',
    shortcut: '⌘0', staticRank: 10, status: 'live',
    href: '/internal/chrome-extension',
  },
  {
    id: 'biblioteca',
    name: 'Biblioteca de Recursos',
    cat: 'Extras', catKey: 'extras',
    descShort: 'Libros, guías y materiales del equipo.',
    desc: 'Libros, guías y materiales del equipo. Descargables y organizados por categoría.',
    glyph: 'BL',
    shortcut: '', staticRank: 99, status: 'soon',
    href: null,
  },
  {
    id: 'usage-admin',
    name: 'Uso del equipo',
    cat: 'Admin', catKey: 'admin',
    descShort: 'Cómo usa el equipo cada tool. Vista de admin.',
    desc: 'Métricas de uso por tool y por usuario. Quién usa qué, cuándo, y con qué frecuencia. Vista exclusiva de admin.',
    glyph: 'UA',
    shortcut: '', staticRank: 50, status: 'live',
    href: '/internal/usage-admin',
    adminOnly: true,
  },
]

const categories = [
  { key: 'ai',       label: 'AI / Reportes' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'datos',    label: 'Datos' },
  { key: 'admin',    label: 'Admin' },
  { key: 'extras',   label: 'Extras' },
]

/* ── Usage formatting ── */

function formatLastUsed(iso) {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  const diffMs = Date.now() - t
  const min = Math.round(diffMs / 60000)
  if (min < 1)        return 'recién'
  if (min < 60)       return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24)         return `hace ${h} h`
  const d = Math.round(h / 24)
  if (d === 1)        return 'ayer'
  if (d < 7)          return `hace ${d} días`
  if (d < 14)         return 'la semana pasada'
  if (d < 30)         return `hace ${Math.round(d / 7)} sem`
  return `hace ${Math.round(d / 30)} mes`
}

/**
 * Heurística para mostrar "Diaria" / "Semanal" / "Mensual"
 * a partir del count de los últimos 30 días.
 *  - >= 15 clicks/30d  → Diaria  (~todos los días hábiles)
 *  - >=  4 clicks/30d  → Semanal (~1/sem)
 *  - >=  1            → Mensual
 *  -  0               → Sin uso
 */
function inferUsage(count) {
  if (!count)        return 'Sin uso'
  if (count >= 15)   return 'Diaria'
  if (count >= 4)    return 'Semanal'
  return 'Mensual'
}

/**
 * Merge de la metadata estática con el usage real del user.
 * Devuelve resources enriquecidos + ordenados por uso real (rank dinámico).
 *
 * - Si el user nunca clickeó nada de un tool, lastUsed = null y count = 0.
 * - Tools con clicks van primero (ordenados por count desc, ties por last_used desc).
 * - Tools sin clicks caen al final, ordenados por staticRank.
 * - Status 'soon' siempre va al final.
 */
function enrichWithUsage(staticResources, usageByToolId) {
  return [...staticResources]
    .map(r => {
      const u = usageByToolId.get(r.id)
      return {
        ...r,
        clickCount:    u?.click_count || 0,
        lastUsedAt:    u?.last_used_at || null,
        lastUsedLabel: formatLastUsed(u?.last_used_at),
        usageLabel:    r.status === 'soon' ? 'Pronto' : inferUsage(u?.click_count || 0),
      }
    })
    .sort((a, b) => {
      // soon al final
      if (a.status === 'soon' && b.status !== 'soon') return  1
      if (b.status === 'soon' && a.status !== 'soon') return -1
      // ambos con uso → por count desc, ties por last_used desc
      if (a.clickCount && b.clickCount) {
        if (a.clickCount !== b.clickCount) return b.clickCount - a.clickCount
        return new Date(b.lastUsedAt) - new Date(a.lastUsedAt)
      }
      // sólo uno con uso → ese va primero
      if (a.clickCount && !b.clickCount) return -1
      if (b.clickCount && !a.clickCount) return  1
      // ninguno con uso → staticRank
      return a.staticRank - b.staticRank
    })
}

/* ── small bits ── */

function StatusPip({ status }) {
  return (
    <span
      aria-label={status === 'live' ? 'activo' : 'próximamente'}
      style={{
        display: 'inline-block',
        width: '6px', height: '6px',
        borderRadius: '50%',
        background: status === 'soon' ? tw.inkFaint : tw.green,
        marginRight: '8px',
        verticalAlign: 'middle',
        flexShrink: 0,
      }}
    />
  )
}

function Kbd({ children }) {
  if (!children) return <span />
  return (
    <span style={{
      fontFamily: mono, fontSize: '10px',
      color: tw.inkFaint,
      border: `1px solid ${tw.rule}`,
      padding: '2px 7px',
      background: tw.white,
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

function SectionHeader({ num, label, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: '14px',
      padding: '28px clamp(1.25rem,5vw,4rem) 12px',
    }}>
      <span style={{
        fontFamily: mono, fontSize: '11px', letterSpacing: '0.18em',
        color: tw.green, fontWeight: 700,
      }}>{num}</span>
      <span style={{
        fontFamily: ui, fontSize: '13px', fontWeight: 600,
        letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.ink,
      }}>{label}</span>
      <span style={{ flex: 1, height: '1px', background: tw.rule }} />
      {count && (
        <span style={{ fontFamily: mono, fontSize: '11px', color: tw.inkFaint }}>
          {count}
        </span>
      )}
    </div>
  )
}

function PinHero({ r, stats, onOpen }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={() => onOpen(r)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '24px 28px 22px',
        borderRight: `1px solid ${tw.rule}`,
        background: hover ? 'rgba(74,140,64,0.12)' : tw.greenTint,
        display: 'flex', flexDirection: 'column', gap: '10px',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      <span style={{
        fontFamily: ui, fontSize: '9px', letterSpacing: '0.2em',
        textTransform: 'uppercase', color: tw.green, fontWeight: 700,
      }}>
        ★ Más usado · {r.cat.toUpperCase()}
      </span>
      <h2 style={{
        fontFamily: serif, fontSize: 'clamp(1.75rem, 3.2vw, 2.4rem)',
        color: tw.inkMid, opacity: 0.95,
        textShadow: '0.4px 0.4px 0 rgba(0,0,0,0.2)',
        lineHeight: 1, letterSpacing: '-0.01em',
        margin: '4px 0 0',
      }}>
        {r.name}.
      </h2>
      <p style={{
        fontFamily: ui, fontSize: '13px', color: tw.inkSub,
        lineHeight: 1.55, maxWidth: '460px', margin: 0,
      }}>
        {r.desc}
      </p>
      <div style={{ display: 'flex', gap: '28px', marginTop: '10px' }}>
        {stats.map((s, i) => (
          <div key={i}>
            <div style={{
              fontFamily: serif, fontSize: '22px',
              color: tw.inkMid, opacity: 0.95,
              textShadow: '0.4px 0.4px 0 rgba(0,0,0,0.2)',
              lineHeight: 1,
            }}>
              {s.val}
              {s.sup && <span style={{ fontSize: '0.5em', color: tw.green, marginLeft: '1px' }}>{s.sup}</span>}
            </div>
            <div style={{
              fontFamily: ui, fontSize: '9px', letterSpacing: '0.16em',
              textTransform: 'uppercase', color: tw.inkFaint, marginTop: '5px',
            }}>{s.lbl}</div>
          </div>
        ))}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '8px',
        fontFamily: mono, fontSize: '10px', letterSpacing: '0.1em',
        color: tw.inkFaint,
      }}>
        <span>último: {r.lastUsedLabel ?? 'sin uso aún'} · {r.shortcut}</span>
        <span style={{
          fontFamily: mono, fontSize: '10px', letterSpacing: '0.14em',
          textTransform: 'uppercase', color: tw.green, fontWeight: 700,
        }}>
          Abrir →
        </span>
      </div>
    </div>
  )
}

function PinCard({ r, isLast, onOpen }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={() => onOpen(r)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '20px 22px',
        borderRight: isLast ? 'none' : `1px solid ${tw.rule}`,
        display: 'flex', flexDirection: 'column', gap: '8px',
        cursor: 'pointer',
        background: hover ? 'rgba(74,140,64,0.04)' : 'transparent',
        transition: 'background 0.15s',
        minHeight: '180px',
      }}
    >
      <span style={{
        fontFamily: ui, fontSize: '9px', letterSpacing: '0.18em',
        textTransform: 'uppercase', color: tw.inkFaint, fontWeight: 600,
      }}>
        {r.cat}
      </span>
      <h3 style={{
        fontFamily: ui, fontWeight: 600, fontSize: '17px',
        color: tw.ink, letterSpacing: '-0.005em', lineHeight: 1.2,
        margin: '2px 0 0',
      }}>
        {r.name}
      </h3>
      <p style={{
        fontFamily: ui, fontSize: '12.5px', color: tw.inkSub,
        lineHeight: 1.5, margin: 0,
      }}>
        {r.descShort}
      </p>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-end', marginTop: 'auto', paddingTop: '8px',
      }}>
        <div>
          <div style={{
            fontFamily: serif, fontSize: '15px',
            color: tw.inkMid, lineHeight: 1,
          }}>{r.lastUsedLabel ?? '—'}</div>
          <div style={{
            fontFamily: ui, fontSize: '9px', letterSpacing: '0.14em',
            textTransform: 'uppercase', color: tw.inkFaint, marginTop: '5px',
          }}>último uso</div>
        </div>
        <Kbd>{r.shortcut}</Kbd>
      </div>
    </div>
  )
}

function DenseRow({ r, onOpen }) {
  const [hover, setHover] = useState(false)
  const interactive = r.status === 'live' && r.href
  return (
    <div
      onClick={() => interactive && onOpen(r)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 240px 1fr 80px 70px',
        gap: '16px',
        padding: '11px 4px',
        alignItems: 'center',
        cursor: interactive ? 'pointer' : 'default',
        background: hover && interactive ? tw.greenTint : 'transparent',
        borderTop: `1px solid ${tw.rule}`,
        transition: 'background 0.1s',
        opacity: r.status === 'soon' ? 0.55 : 1,
      }}
    >
      <span style={{
        fontFamily: mono, fontWeight: 700, fontSize: '9px',
        width: '22px', height: '22px',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${tw.greenEdge}`,
        background: tw.greenTint,
        color: tw.green,
        flexShrink: 0,
      }}>{r.glyph}</span>
      <div style={{
        display: 'flex', alignItems: 'center',
        fontFamily: ui, fontWeight: 600, fontSize: '14px',
        color: tw.ink, letterSpacing: '-0.005em',
      }}>
        <StatusPip status={r.status} />
        {r.name}
      </div>
      <div style={{
        fontFamily: ui, fontSize: '12.5px', color: tw.inkSub,
        lineHeight: 1.45,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {r.descShort}
      </div>
      <div style={{
        fontFamily: mono, fontSize: '10px', letterSpacing: '0.06em',
        color: tw.inkFaint,
      }}>
        {r.usageLabel}
      </div>
      <div style={{ textAlign: 'center' }}>
        <Kbd>{r.shortcut || '—'}</Kbd>
      </div>
    </div>
  )
}

/* ── Page ── */
export default function InternalPage() {
  const [activeResource, setActiveResource] = useState(null)
  const [query, setQuery] = useState('')
  const [usageMap, setUsageMap] = useState(new Map())
  const { data: session, status: sessionStatus } = useSession()
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email)

  // Fetch usage del user actual al montar (y cada vez que cambia el email)
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return
    let cancelled = false
    fetch('/api/internal/tool-usage', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { usage: [] })
      .then(data => {
        if (cancelled) return
        const m = new Map()
        for (const u of (data.usage || [])) m.set(u.tool_id, u)
        setUsageMap(m)
      })
      .catch(err => console.error('[tool-usage fetch]', err))
    return () => { cancelled = true }
  }, [sessionStatus, session?.user?.email])

  const visible = useMemo(
    () => resources.filter(r => !r.adminOnly || isAdmin),
    [isAdmin]
  )

  // Enriched + sorted by real usage (falls back to staticRank if no clicks)
  const sorted = useMemo(
    () => enrichWithUsage(visible, usageMap),
    [visible, usageMap]
  )

  // Pinned = top-3 EXCLUYENDO 'soon'
  const pinnedCandidates = sorted.filter(r => r.status !== 'soon').slice(0, 3)
  const [hero, pinB, pinC] = pinnedCandidates
  const pinnedIds = useMemo(
    () => new Set(pinnedCandidates.map(r => r.id)),
    [pinnedCandidates]
  )

  const filteredRest = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sorted.filter(r => {
      if (pinnedIds.has(r.id)) return false
      if (!q) return true
      return (
        r.name.toLowerCase().includes(q) ||
        r.descShort.toLowerCase().includes(q) ||
        r.cat.toLowerCase().includes(q) ||
        r.shortcut.toLowerCase().includes(q)
      )
    })
  }, [sorted, query, pinnedIds])

  const groups = useMemo(
    () => categories
      .map(c => ({
        ...c,
        // dentro de cada grupo, mantener el orden global ya calculado
        items: filteredRest.filter(r => r.catKey === c.key),
      }))
      .filter(g => g.items.length > 0),
    [filteredRest]
  )

  // Hero stats (placeholder hasta que decidamos qué métricas mostrar)
  const heroStats = useMemo(() => {
    if (!hero) return []
    const total = Array.from(usageMap.values()).reduce((a, b) => a + (b.click_count || 0), 0)
    return [
      { val: hero.clickCount || '—',                            lbl: 'aperturas 30d' },
      { val: total ? Math.round((hero.clickCount / total) * 100) : '—', sup: total ? '%' : null, lbl: 'de tu uso' },
      { val: total || '—',                                      lbl: 'total tools' },
    ]
  }, [hero, usageMap])

  /**
   * Track + navegar.
   * - sendBeacon para que no bloquee la navegación (especialmente para externos).
   * - Fallback a fetch keepalive si sendBeacon no está.
   */
  const trackClick = (toolId) => {
    if (typeof window === 'undefined') return
    const url = '/api/internal/track-tool-click'
    const payload = JSON.stringify({ toolId })
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon(url, blob)
        return
      }
    } catch (_) {}
    // Fallback
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  }

  const openResource = (r) => {
    if (!r.href) return
    trackClick(r.id)
    if (r.external) {
      window.open(r.href, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = r.href
    }
  }

  // Hotkeys ⌘1-⌘9, ⌘0. Match contra el `shortcut` literal de cada resource.
  // Se ignoran si el foco está en un input/textarea (no chocar con search).
  useEffect(() => {
    if (sessionStatus !== 'authenticated' || activeResource) return
    const handler = (e) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const tag = (e.target?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return
      if (!/^[0-9]$/.test(e.key)) return
      const wanted = `⌘${e.key}`
      const match = visible.find(r => r.shortcut === wanted && r.status === 'live' && r.href)
      if (!match) return
      e.preventDefault()
      openResource(match)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, sessionStatus, activeResource])


  return (
    <main style={{ backgroundColor: tw.bg, minHeight: '100vh' }}>

      {/* Top bar */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '16px clamp(1.25rem,5vw,4rem)',
        borderBottom: `1px solid ${tw.rule}`,
        background: 'rgba(255,255,255,0.55)',
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <BondyLogo size={22} />
          <span style={{ fontFamily: serif, fontSize: '17px', color: tw.ink, letterSpacing: '0.04em' }}>BONDY</span>
        </div>
        <span style={{
          fontFamily: ui, fontSize: '9px', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: tw.green,
          border: `1px solid ${tw.greenEdge}`,
          padding: '3px 8px', background: tw.greenTint,
        }}>
          Internal
        </span>
        <div style={{ flex: 1 }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: '20px',
          fontSize: '11px', color: tw.inkFaint, letterSpacing: '0.04em',
          fontFamily: ui,
        }}>
          {session?.user?.name && <span>{session.user.name}</span>}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em',
              textTransform: 'uppercase', color: tw.inkFaint,
              background: 'none', border: `1px solid ${tw.rule}`,
              padding: '5px 12px', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = tw.green; e.currentTarget.style.color = tw.green }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = tw.rule; e.currentTarget.style.color = tw.inkFaint }}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {!activeResource ? (
        <>
          {/* Hero */}
          <section style={{
            padding: '36px clamp(1.25rem,5vw,4rem) 24px',
            display: 'flex', flexDirection: 'column', gap: '14px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              fontFamily: ui, fontSize: '10px', letterSpacing: '0.2em',
              textTransform: 'uppercase', color: tw.green, fontWeight: 500,
            }}>
              <span style={{ width: '22px', height: '1px', background: tw.green }} />
              <span>— Buenos días, {session?.user?.name?.split(' ')[0] ?? 'equipo'}</span>
            </div>
            <h1 style={{
              fontFamily: serif,
              fontSize: 'clamp(2.4rem, 5vw, 3.4rem)',
              lineHeight: 0.96,
              color: tw.inkMid, opacity: 0.95,
              textShadow: '0.5px 0.5px 0 rgba(0,0,0,0.22)',
              margin: 0, letterSpacing: '-0.005em',
            }}>
              Centro de recursos.
            </h1>
            <p style={{
              fontFamily: ui, fontSize: '14px', lineHeight: 1.7,
              color: tw.inkSub, maxWidth: '560px', margin: 0,
            }}>
              Lo que más usás, fijado arriba. El resto, en lista densa con atajos.
            </p>
          </section>

          {/* 01 Pinned */}
          <SectionHeader num="01" label="Fijado para vos" />
          <div style={{ padding: '0 clamp(1.25rem,5vw,4rem)' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 1fr 1fr',
              border: `1px solid ${tw.rule}`,
              background: tw.white,
            }}>
              {hero && <PinHero r={hero} stats={heroStats} onOpen={openResource} />}
              {pinB && <PinCard r={pinB} isLast={false} onOpen={openResource} />}
              {pinC && <PinCard r={pinC} isLast={true} onOpen={openResource} />}
            </div>
          </div>

          {/* 02 Dense list */}
          <SectionHeader
            num="02"
            label="Todo lo demás"
            count={`${visible.length - pinnedIds.size} herramientas`}
          />

          <div style={{ padding: '0 clamp(1.25rem,5vw,4rem)' }}>
            <div role="search" style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              borderTop: `1px solid ${tw.rule}`,
              borderBottom: `1px solid ${tw.rule}`,
              padding: '12px 4px',
              background: 'rgba(255,255,255,0.4)',
            }}>
              <span aria-hidden="true" style={{
                fontFamily: mono, color: tw.green, fontSize: '14px', fontWeight: 700,
              }}>⌕</span>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar herramienta, categoría o atajo…"
                aria-label="Buscar"
                style={{
                  flex: 1,
                  fontFamily: ui, fontSize: '14px',
                  color: tw.ink,
                  background: 'transparent',
                  border: 'none', outline: 'none',
                }}
              />
              <Kbd>⌘K</Kbd>
            </div>
          </div>

          <div style={{ padding: '0 clamp(1.25rem,5vw,4rem) 32px' }}>
            {groups.length === 0 ? (
              <div style={{
                padding: '32px 4px',
                fontFamily: ui, fontSize: '13px', color: tw.inkFaint,
                textAlign: 'center',
              }}>
                Sin resultados para "{query}".
              </div>
            ) : groups.map(g => (
              <div key={g.key}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '20px 4px 10px',
                  fontFamily: ui, fontSize: '9px', letterSpacing: '0.2em',
                  textTransform: 'uppercase', color: tw.inkFaint, fontWeight: 600,
                  borderBottom: `1px solid ${tw.rule}`,
                }}>
                  <span>{g.label}</span>
                  <span style={{ fontFamily: mono, letterSpacing: '0.06em' }}>
                    · {g.items.length}
                  </span>
                </div>
                {g.items.map(r => (
                  <DenseRow key={r.id} r={r} onOpen={openResource} />
                ))}
              </div>
            ))}
          </div>

          {/* Asistente embebido (legacy entry, abajo y discreto) */}
          <div style={{
            padding: '0 clamp(1.25rem,5vw,4rem) 48px',
            display: 'flex', justifyContent: 'flex-start',
          }}>
            <button
              onClick={() => setActiveResource('assistant-embed')}
              style={{
                fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em',
                textTransform: 'uppercase', color: tw.inkFaint,
                background: 'none', border: `1px solid ${tw.rule}`,
                padding: '8px 14px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = tw.green; e.currentTarget.style.color = tw.green }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = tw.rule; e.currentTarget.style.color = tw.inkFaint }}
            >
              Abrir asistente embebido →
            </button>
          </div>
        </>
      ) : (
        <section>
          <div style={{
            padding: '14px clamp(1.25rem,5vw,4rem)',
            borderBottom: `1px solid ${tw.rule}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '16px', height: '1px', background: tw.green }} />
              <span style={{
                fontFamily: mono, fontSize: '10px', letterSpacing: '0.16em',
                textTransform: 'uppercase', color: tw.green,
              }}>
                Asistente de Informes
              </span>
            </div>
            <button
              onClick={() => setActiveResource(null)}
              style={{
                fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em',
                textTransform: 'uppercase', color: tw.inkFaint,
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              ← Volver
            </button>
          </div>
          <div style={{ padding: '2.5rem clamp(1.25rem,5vw,4rem)' }}>
            <AssistantTabs isAdmin={isAdmin} />
          </div>
        </section>
      )}

      {/* Footer */}
      <div style={{
        padding: '1.25rem clamp(1.25rem,5vw,4rem)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: `1px solid ${tw.rule}`,
      }}>
        <span style={{ fontFamily: ui, fontSize: '11px', color: tw.inkFaint }}>
          Uso exclusivo equipo Bondy
        </span>
        <a
          href="https://wearebondy.com" target="_blank" rel="noopener noreferrer"
          style={{
            fontFamily: mono, fontSize: '11px', letterSpacing: '0.10em',
            color: tw.green, textDecoration: 'none',
          }}
        >
          wearebondy.com ↗
        </a>
      </div>
    </main>
  )
}

function AssistantTabs({ isAdmin }) {
  const [activeTab, setActiveTab] = useState('interview')

  const tabs = [
    { id: 'interview', label: 'Screening Report' },
    { id: 'cultural', label: 'Cultural Fit' },
    ...(isAdmin ? [{ id: 'scorecards', label: 'Client Management', admin: true }] : []),
  ]

  return (
    <div>
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '2rem',
        borderBottom: `1px solid ${tw.rule}`, paddingBottom: '0',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em',
              textTransform: 'uppercase',
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.id ? tw.ink : tw.inkFaint,
              borderBottom: activeTab === tab.id ? `2px solid ${tw.green}` : '2px solid transparent',
              transition: 'all 0.2s', marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'interview'  && <InterviewTab />}
      {activeTab === 'cultural'   && <CulturalFitTab />}
      {activeTab === 'scorecards' && isAdmin && <ScorecardAdminPage embedded />}
    </div>
  )
}
