'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

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

// Mapa para mostrar nombres legibles en lugar de IDs
const TOOL_LABELS = {
  'assistant':         'Asistente de Informes',
  'ats':               'Bondy ATS',
  'job-board':         'Job Board',
  'lead-analyzer':     'Lead Analyzer',
  'interview-hub':     'Interview Hub',
  'intelligence':      'Bondy Intelligence',
  'market-signals':    'Market Signals',
  'proposals':         'Service Proposals',
  'seguimiento-pagos': 'Seguimiento de Pagos',
  'chrome':            'Extensión Chrome',
  'biblioteca':        'Biblioteca de Recursos',
}
const labelFor = (id) => TOOL_LABELS[id] || id

function formatRel(iso) {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const min = Math.round((Date.now() - t) / 60000)
  if (min < 1)   return 'recién'
  if (min < 60)  return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24)    return `hace ${h} h`
  const d = Math.round(h / 24)
  if (d === 1)   return 'ayer'
  if (d < 7)     return `hace ${d} días`
  if (d < 14)    return 'la semana pasada'
  if (d < 30)    return `hace ${Math.round(d / 7)} sem`
  return `hace ${Math.round(d / 30)} mes`
}

const userShort = (email) => {
  if (!email) return '—'
  const local = email.split('@')[0]
  return local.replace(/\./g, ' ').replace(/(^|\s)\S/g, c => c.toUpperCase())
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
      {count != null && (
        <span style={{ fontFamily: mono, fontSize: '11px', color: tw.inkFaint }}>
          {count}
        </span>
      )}
    </div>
  )
}

/**
 * Bar inline (sin libs). Recibe value y max, devuelve un bloque verde con ancho %.
 */
function Bar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ position: 'relative', height: '18px', background: tw.greenTint, border: `1px solid ${tw.greenEdge}` }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: `${pct}%`,
        background: tw.green,
        opacity: 0.55,
      }} />
      <span style={{
        position: 'relative',
        display: 'inline-block',
        padding: '2px 8px',
        fontFamily: mono, fontSize: '10px',
        color: tw.ink, letterSpacing: '0.04em',
      }}>{value}</span>
    </div>
  )
}

/**
 * Sparkline: array de {day, click_count} → SVG de 30 días.
 */
function Sparkline({ daily }) {
  // Normalizar a 30 días (relleno con 0)
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const found = daily.find(x => x.day === key)
    days.push({ day: key, count: found?.click_count || 0 })
  }
  const max = Math.max(1, ...days.map(d => d.count))
  const W = 600, H = 80, P = 8
  const stepX = (W - P * 2) / (days.length - 1)
  const points = days.map((d, i) => {
    const x = P + i * stepX
    const y = H - P - ((d.count / max) * (H - P * 2))
    return [x, y]
  })
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${path} L${points[points.length - 1][0].toFixed(1)},${H - P} L${points[0][0].toFixed(1)},${H - P} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '80px', display: 'block' }}>
      <path d={area} fill={tw.greenTint} />
      <path d={path} fill="none" stroke={tw.green} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map(([x, y], i) => (
        days[i].count > 0 ? <circle key={i} cx={x} cy={y} r="2" fill={tw.green} /> : null
      ))}
    </svg>
  )
}

export default function UsageAdminPage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email)
  const [data, setData] = useState({ by_tool: [], by_user: [], matrix: [], daily: [] })
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  // Redirect si no es admin
  useEffect(() => {
    if (sessionStatus === 'authenticated' && !isAdmin) {
      router.replace('/internal')
    }
  }, [sessionStatus, isAdmin, router])

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !isAdmin) return
    setLoading(true)
    fetch('/api/internal/usage-admin', { cache: 'no-store' })
      .then(async r => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then(d => { setData(d); setErr(null) })
      .catch(e => { console.error(e); setErr(String(e)) })
      .finally(() => setLoading(false))
  }, [sessionStatus, isAdmin])

  const totals = useMemo(() => {
    const totalClicks  = data.by_tool.reduce((a, b) => a + (b.click_count || 0), 0)
    const totalUsers   = data.by_user.length
    const totalTools   = data.by_tool.length
    return { totalClicks, totalUsers, totalTools }
  }, [data])

  const toolMax = useMemo(
    () => Math.max(1, ...data.by_tool.map(t => t.click_count || 0)),
    [data]
  )
  const userMax = useMemo(
    () => Math.max(1, ...data.by_user.map(u => u.click_count || 0)),
    [data]
  )

  // Matrix → grid: rows=users, cols=tools (ordenados por click_count desc global)
  const matrixGrid = useMemo(() => {
    const tools = data.by_tool.map(t => t.tool_id)
    const users = data.by_user.map(u => u.user_email)
    const mx = new Map()
    for (const m of data.matrix) mx.set(`${m.user_email}::${m.tool_id}`, m)
    return { tools, users, get: (u, t) => mx.get(`${u}::${t}`) }
  }, [data])

  if (sessionStatus !== 'authenticated' || !isAdmin) {
    return null
  }

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
          Admin · Uso del equipo
        </span>
        <div style={{ flex: 1 }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: '20px',
          fontSize: '11px', color: tw.inkFaint, letterSpacing: '0.04em',
          fontFamily: ui,
        }}>
          {sessionStatus === 'authenticated' && (
            <span style={{ opacity: session?.user?.name ? 1 : 0.4 }}>
              {session?.user?.name ?? '…'}
            </span>
          )}
          <Link href="/internal" style={{
            fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em',
            textTransform: 'uppercase', color: tw.inkFaint,
            textDecoration: 'none', border: `1px solid ${tw.rule}`,
            padding: '5px 12px',
          }}>
            ← Centro
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em',
              textTransform: 'uppercase', color: tw.inkFaint,
              background: 'none', border: `1px solid ${tw.rule}`,
              padding: '5px 12px', cursor: 'pointer',
            }}
          >
            Salir
          </button>
        </div>
      </header>

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
          <span>— Vista de admin · últimos 30 días</span>
        </div>
        <h1 style={{
          fontFamily: serif,
          fontSize: 'clamp(2.4rem, 5vw, 3.4rem)',
          lineHeight: 0.96,
          color: tw.inkMid, opacity: 0.95,
          textShadow: '0.5px 0.5px 0 rgba(0,0,0,0.22)',
          margin: 0, letterSpacing: '-0.005em',
        }}>
          Uso del equipo.
        </h1>
        <p style={{
          fontFamily: ui, fontSize: '14px', lineHeight: 1.7,
          color: tw.inkSub, maxWidth: '560px', margin: 0,
        }}>
          Qué tools usa el equipo, quién las usa más, y cuándo. Datos del último mes.
        </p>
      </section>

      {/* Totals */}
      <div style={{
        padding: '0 clamp(1.25rem,5vw,4rem)',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          border: `1px solid ${tw.rule}`, background: tw.white,
        }}>
          {[
            { val: totals.totalClicks, lbl: 'aperturas totales' },
            { val: totals.totalUsers,  lbl: 'usuarios activos' },
            { val: totals.totalTools,  lbl: 'tools usadas' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '24px 28px',
              borderRight: i < 2 ? `1px solid ${tw.rule}` : 'none',
            }}>
              <div style={{
                fontFamily: serif, fontSize: '38px',
                color: tw.inkMid, opacity: 0.95,
                textShadow: '0.4px 0.4px 0 rgba(0,0,0,0.2)',
                lineHeight: 1,
              }}>
                {loading ? '…' : (s.val || 0)}
              </div>
              <div style={{
                fontFamily: ui, fontSize: '10px', letterSpacing: '0.18em',
                textTransform: 'uppercase', color: tw.inkFaint,
                marginTop: '8px',
              }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {err && (
        <div style={{
          margin: '24px clamp(1.25rem,5vw,4rem)',
          padding: '12px 16px',
          border: `1px solid ${tw.rule}`,
          fontFamily: mono, fontSize: '11px', color: '#a33',
        }}>
          Error: {err}
        </div>
      )}

      {/* 01 · Actividad diaria */}
      <SectionHeader num="01" label="Actividad diaria" count="30 días" />
      <div style={{ padding: '0 clamp(1.25rem,5vw,4rem)' }}>
        <div style={{
          border: `1px solid ${tw.rule}`,
          background: tw.white, padding: '20px',
        }}>
          <Sparkline daily={data.daily || []} />
        </div>
      </div>

      {/* 02 · Tools por uso */}
      <SectionHeader num="02" label="Tools — más usadas por el equipo" count={`${data.by_tool.length} tools`} />
      <div style={{ padding: '0 clamp(1.25rem,5vw,4rem) 8px' }}>
        <div style={{ border: `1px solid ${tw.rule}`, background: tw.white }}>
          {data.by_tool.length === 0 ? (
            <div style={{ padding: '24px', fontFamily: ui, fontSize: '13px', color: tw.inkFaint, textAlign: 'center' }}>
              Sin uso en los últimos 30 días.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ui, fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tw.rule}` }}>
                  <th style={thStyle}>Tool</th>
                  <th style={{ ...thStyle, width: '40%' }}>Aperturas</th>
                  <th style={{ ...thStyle, width: '90px', textAlign: 'right' }}>Usuarios</th>
                  <th style={{ ...thStyle, width: '140px', textAlign: 'right' }}>Último uso</th>
                </tr>
              </thead>
              <tbody>
                {data.by_tool.map(t => (
                  <tr key={t.tool_id} style={{ borderTop: `1px solid ${tw.rule}` }}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: tw.ink }}>{labelFor(t.tool_id)}</td>
                    <td style={tdStyle}><Bar value={t.click_count} max={toolMax} /></td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: mono, fontSize: '12px', color: tw.inkSub }}>
                      {t.distinct_users}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: mono, fontSize: '11px', color: tw.inkFaint }}>
                      {formatRel(t.last_used_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 03 · Leaderboard */}
      <SectionHeader num="03" label="Equipo — quién más activo" count={`${data.by_user.length} usuarios`} />
      <div style={{ padding: '0 clamp(1.25rem,5vw,4rem) 8px' }}>
        <div style={{ border: `1px solid ${tw.rule}`, background: tw.white }}>
          {data.by_user.length === 0 ? (
            <div style={{ padding: '24px', fontFamily: ui, fontSize: '13px', color: tw.inkFaint, textAlign: 'center' }}>
              Sin actividad registrada.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ui, fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tw.rule}` }}>
                  <th style={thStyle}>Usuario</th>
                  <th style={{ ...thStyle, width: '40%' }}>Aperturas</th>
                  <th style={{ ...thStyle, width: '90px', textAlign: 'right' }}>Tools</th>
                  <th style={{ ...thStyle, width: '140px', textAlign: 'right' }}>Última</th>
                </tr>
              </thead>
              <tbody>
                {data.by_user.map(u => (
                  <tr key={u.user_email} style={{ borderTop: `1px solid ${tw.rule}` }}>
                    <td style={{ ...tdStyle, color: tw.ink }}>
                      <div style={{ fontWeight: 600 }}>{userShort(u.user_email)}</div>
                      <div style={{ fontFamily: mono, fontSize: '10px', color: tw.inkFaint, marginTop: '2px' }}>
                        {u.user_email}
                      </div>
                    </td>
                    <td style={tdStyle}><Bar value={u.click_count} max={userMax} /></td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: mono, fontSize: '12px', color: tw.inkSub }}>
                      {u.distinct_tools}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: mono, fontSize: '11px', color: tw.inkFaint }}>
                      {formatRel(u.last_used_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 04 · Matrix */}
      <SectionHeader num="04" label="Matriz · usuarios × tools" />
      <div style={{ padding: '0 clamp(1.25rem,5vw,4rem) 48px' }}>
        <div style={{
          border: `1px solid ${tw.rule}`, background: tw.white,
          overflowX: 'auto',
        }}>
          {matrixGrid.users.length === 0 ? (
            <div style={{ padding: '24px', fontFamily: ui, fontSize: '13px', color: tw.inkFaint, textAlign: 'center' }}>
              Sin datos suficientes.
            </div>
          ) : (
            <table style={{ borderCollapse: 'collapse', fontFamily: mono, fontSize: '11px' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, position: 'sticky', left: 0, background: tw.white, zIndex: 1, minWidth: '180px' }}>
                    Usuario \ Tool
                  </th>
                  {matrixGrid.tools.map(t => (
                    <th key={t} style={{
                      ...thStyle,
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      whiteSpace: 'nowrap',
                      minWidth: '32px', maxWidth: '32px',
                      verticalAlign: 'bottom',
                      padding: '12px 4px',
                      fontSize: '10px',
                    }}>
                      {labelFor(t)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixGrid.users.map(u => (
                  <tr key={u} style={{ borderTop: `1px solid ${tw.rule}` }}>
                    <td style={{
                      ...tdStyle, position: 'sticky', left: 0, background: tw.white,
                      fontFamily: ui, fontSize: '12px', fontWeight: 600, color: tw.ink,
                    }}>
                      {userShort(u)}
                    </td>
                    {matrixGrid.tools.map(t => {
                      const cell = matrixGrid.get(u, t)
                      const count = cell?.click_count || 0
                      // intensity 0..1 sobre el max del usuario
                      const userRow = data.by_user.find(x => x.user_email === u)
                      const intensity = count && userRow ? count / Math.max(1, userRow.click_count) : 0
                      return (
                        <td key={t} style={{
                          ...tdStyle, padding: 0, textAlign: 'center',
                          minWidth: '32px', maxWidth: '32px',
                          background: count
                            ? `rgba(74,140,64,${0.08 + intensity * 0.55})`
                            : 'transparent',
                          color: count ? tw.ink : tw.inkFaint,
                          fontFamily: mono, fontSize: '11px',
                          height: '28px',
                          borderLeft: `1px solid ${tw.rule}`,
                        }}
                          title={cell ? `${labelFor(t)} · ${count} aperturas · ${formatRel(cell.last_used_at)}` : 'sin uso'}
                        >
                          {count || '·'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '1.25rem clamp(1.25rem,5vw,4rem)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: `1px solid ${tw.rule}`,
      }}>
        <span style={{ fontFamily: ui, fontSize: '11px', color: tw.inkFaint }}>
          Datos: tabla tool_usage · ventana 30 días
        </span>
        <Link href="/internal" style={{
          fontFamily: mono, fontSize: '11px', letterSpacing: '0.10em',
          color: tw.green, textDecoration: 'none',
        }}>
          ← centro de recursos
        </Link>
      </div>
    </main>
  )
}

const thStyle = {
  textAlign: 'left',
  padding: '12px 16px',
  fontFamily: ui, fontSize: '9px', letterSpacing: '0.18em',
  textTransform: 'uppercase', color: tw.inkFaint, fontWeight: 600,
}
const tdStyle = {
  padding: '12px 16px',
  verticalAlign: 'middle',
}
