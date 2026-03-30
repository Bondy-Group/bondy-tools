'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

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

const TYPE_OPTIONS = [
  { id: 'new',         label: 'Nueva empresa',    icon: '🆕' },
  { id: 'reactivation',label: 'Reactivación',      icon: '🔄' },
  { id: 'secondary',   label: 'Lead secundario',   icon: '🔗' },
  { id: 'contact',     label: 'Nuevo contacto',    icon: '👤' },
]

const HIST_KEY = 'bondy_lead_analyzer_history'

function parseResult(text) {
  const decisionMatch = text.match(/—\s*(GO|HOLD|NO)\b/i)
  const decision = decisionMatch ? decisionMatch[1].toUpperCase() : undefined
  const scoreMatch = text.match(/\*\*TOTAL\*\*\s*\|\s*\*\*([\d.]+)\/10\*\*/i)
  const score = scoreMatch ? parseFloat(scoreMatch[1]) : undefined
  return { score, decision }
}

function DecisionPill({ decision }) {
  if (!decision) return null
  const styles = {
    GO:   { bg: '#eef5ec', color: '#4a8c40', border: '#c8e2c3', label: 'GO ✓' },
    HOLD: { bg: '#fdf3ec', color: '#c06a2d', border: '#f0cba8', label: 'HOLD ⏸' },
    NO:   { bg: '#fdf0f0', color: '#b84040', border: '#f0b8b8', label: 'NO ✕' },
  }
  const s = styles[decision]
  if (!s) return null
  return (
    <span style={{
      display: 'inline-block',
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: '3px', padding: '2px 8px',
      fontFamily: mono, fontSize: '11px', fontWeight: 700,
      letterSpacing: '0.06em',
    }}>
      {s.label}
    </span>
  )
}

function ScoreBadge({ score, decision }) {
  if (!score || !decision) {
    return (
      <div style={{
        width: '30px', height: '30px', borderRadius: '3px',
        background: '#f5f2ec', color: tw.inkFaint,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: serif, fontSize: '11px', flexShrink: 0,
      }}>—</div>
    )
  }
  const colors = {
    GO:   { bg: '#eef5ec', color: '#4a8c40' },
    HOLD: { bg: '#fdf3ec', color: '#c06a2d' },
    NO:   { bg: '#fdf0f0', color: '#b84040' },
  }
  const c = colors[decision] || { bg: '#f5f2ec', color: tw.inkFaint }
  return (
    <div style={{
      width: '30px', height: '30px', borderRadius: '3px',
      background: c.bg, color: c.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: serif, fontSize: '11px', flexShrink: 0, fontWeight: 700,
    }}>
      {score.toFixed(1)}
    </div>
  )
}

function renderMarkdown(md) {
  let h = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // Restore allowed HTML tags from the email signature
  h = h.replace(/&lt;(\/?(table|tr|td|th|img|span|a|strong|em|br|p)[^>]*?)&gt;/gi, '<$1>')

  // Tables
  h = h.replace(/(\|.+\|\n\|[-| :]+\|\n(?:\|.+\|\n?)+)/gm, (t) => {
    const rows = t.trim().split('\n')
    const heads = rows[0].split('|').filter(Boolean).map(c => `<th>${c.trim()}</th>`).join('')
    const body = rows.slice(2).map(r =>
      `<tr>${r.split('|').filter(Boolean).map(c => `<td>${c.trim()}</td>`).join('')}</tr>`
    ).join('')
    return `<table><thead><tr>${heads}</tr></thead><tbody>${body}</tbody></table>`
  })

  h = h
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/—\s*GO\b/g, '— <span class="pill-go">GO ✓</span>')
    .replace(/—\s*HOLD\b/g, '— <span class="pill-hold">HOLD ⏸</span>')
    .replace(/—\s*NO\b/g, '— <span class="pill-no">NO ✕</span>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')

  h = h.replace(/(<li>.*?<\/li>\n?)+/gs, m => `<ul>${m}</ul>`)

  return h.split(/\n\n+/).map(b => {
    b = b.trim()
    if (!b) return ''
    if (/^<(h[2-4]|ul|table|hr)/.test(b)) return b
    return `<p>${b.replace(/\n/g, '<br>')}</p>`
  }).join('\n')
}

export default function LeadAnalyzerPage() {
  const { data: session } = useSession()
  const [input, setInput]     = useState('')
  const [context, setContext] = useState('')
  const [type, setType]       = useState('new')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState('')
  const [history, setHistory] = useState([])
  const resultRef  = useRef(null)
  const abortRef   = useRef(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HIST_KEY)
      if (stored) setHistory(JSON.parse(stored))
    } catch {}
  }, [])

  const saveHistory = (item) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.name !== item.name).slice(0, 7)
      const next = [item, ...filtered]
      try { localStorage.setItem(HIST_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const formatTime = (ts) => {
    const diff = Date.now() - ts
    if (diff < 3600000) return `Hace ${Math.round(diff / 60000)}m`
    const d = new Date(ts)
    if (d.toDateString() === new Date().toDateString()) return `Hoy ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  }

  const handleAnalyze = async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    setResult('')

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/analyze-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim(), context: context.trim(), type }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        setResult(`**Error:** ${err.error || 'No se pudo conectar.'}`)
        setLoading(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) { setLoading(false); return }

      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) accumulated += `\n\n**Error:** ${parsed.error}`
            else if (parsed.text) accumulated += parsed.text
          } catch {}
        }
        setResult(accumulated)
        if (resultRef.current) resultRef.current.scrollTop = resultRef.current.scrollHeight
      }

      const { score, decision } = parseResult(accumulated)
      const name = input.trim().split('\n')[0].slice(0, 40)
      saveHistory({ name, type, score, decision, timestamp: Date.now() })
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setResult('**Error de conexión.** Verificá que `ANTHROPIC_API_KEY` esté configurada en Vercel.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStop = () => { abortRef.current?.abort(); setLoading(false) }

  const mdStyles = `
    .la-md h2 { font-family: ${serif}; font-size: 1.3rem; color: ${tw.inkMid}; margin: 0 0 6px; }
    .la-md h3 { font-family: ${serif}; font-size: 1rem; color: ${tw.inkMid}; margin: 20px 0 8px; }
    .la-md p  { font-family: ${mono}; font-size: 13px; color: ${tw.inkSub}; margin-bottom: 10px; line-height: 1.7; }
    .la-md ul { padding-left: 18px; margin-bottom: 10px; }
    .la-md li { font-family: ${mono}; font-size: 13px; color: ${tw.inkSub}; margin-bottom: 4px; line-height: 1.6; }
    .la-md table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    .la-md th, .la-md td { border: 1px solid ${tw.rule}; padding: 6px 10px; font-family: ${mono}; font-size: 12px; text-align: left; }
    .la-md th { background: #f5f2ec; font-weight: 700; font-size: 11px; letter-spacing: 0.04em; }
    .la-md code { background: #f5f2ec; border: 1px solid ${tw.rule}; border-radius: 2px; padding: 1px 5px; font-size: 11px; }
    .la-md hr { border: none; border-top: 1px solid ${tw.rule}; margin: 20px 0; }
    .la-md strong { font-weight: 700; }
    .la-md em { font-style: italic; }
    .pill-go   { display:inline-block; background:#eef5ec; color:#4a8c40; border:1px solid #c8e2c3; border-radius:3px; padding:2px 8px; font-size:11px; font-weight:700; letter-spacing:0.06em; }
    .pill-hold { display:inline-block; background:#fdf3ec; color:#c06a2d; border:1px solid #f0cba8; border-radius:3px; padding:2px 8px; font-size:11px; font-weight:700; letter-spacing:0.06em; }
    .pill-no   { display:inline-block; background:#fdf0f0; color:#b84040; border:1px solid #f0b8b8; border-radius:3px; padding:2px 8px; font-size:11px; font-weight:700; letter-spacing:0.06em; }
    .cursor-blink { display:inline-block; width:7px; height:13px; background:${tw.inkMid}; margin-left:2px; vertical-align:middle; animation:blink 1s step-end infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  `

  return (
    <main style={{ backgroundColor: tw.bg, backgroundImage: notebookBg, minHeight: '100vh' }}>
      <style>{mdStyles}</style>

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
          <BondyLogo size={22} />
          <span style={{ fontFamily: serif, fontSize: '15px', letterSpacing: '0.04em', color: tw.inkMid }}>
            BONDY
          </span>
          <span style={{ fontFamily: mono, fontSize: '11px', color: tw.inkFaint, marginLeft: '4px' }}>
            / Lead Analyzer
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {session?.user && (
            <span style={{ fontFamily: mono, fontSize: '11px', color: tw.inkFaint }}>
              {session.user.email}
            </span>
          )}
          <Link href="/internal" style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.inkFaint, textDecoration: 'none' }}>
            ← Volver
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section style={{ padding: '3rem clamp(1.25rem,5vw,4rem) 2.5rem', borderBottom: `1px solid ${tw.rule}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
          <div style={{ width: '20px', height: '1px', background: tw.green }} />
          <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green }}>
            Bruno Comercial
          </span>
        </div>
        <h1 style={{ fontFamily: serif, fontSize: 'clamp(2rem,4vw,3rem)', lineHeight: 1.0, color: tw.inkMid, marginBottom: '0.5rem' }}>
          Lead Analyzer.
        </h1>
        <svg width="160" height="8" viewBox="0 0 160 8" fill="none" style={{ display: 'block', marginBottom: '1rem' }}>
          <path d="M0 4 Q40 1 80 4 Q120 7 160 4" stroke="#4A8C40" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
        <p style={{ fontFamily: mono, fontSize: '13px', color: tw.inkFaint, maxWidth: '520px', lineHeight: 1.7 }}>
          Ingresá una empresa, contacto o captura. Bruno investiga, puntúa el ICP y redacta el email de outreach.
        </p>
      </section>

      {/* Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'clamp(260px, 28%, 320px) 1fr', minHeight: 'calc(100vh - 280px)' }}>

        {/* Sidebar */}
        <aside style={{ borderRight: `1px solid ${tw.rule}`, background: '#F5F2EC', display: 'flex', flexDirection: 'column' }}>

          {/* Tipo */}
          <div style={{ padding: '18px 16px', borderBottom: `1px solid ${tw.rule}` }}>
            <div style={{ fontFamily: mono, fontSize: '8.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#b0ada8', marginBottom: '8px' }}>
              Tipo de análisis
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
              {TYPE_OPTIONS.map(t => (
                <button key={t.id} onClick={() => setType(t.id)}
                  style={{
                    border: `1px solid ${type === t.id ? tw.inkMid : tw.rule}`,
                    background: type === t.id ? tw.inkMid : tw.white,
                    borderRadius: '3px', padding: '7px 8px',
                    cursor: 'pointer', fontFamily: mono, fontSize: '10.5px',
                    color: type === t.id ? tw.white : tw.inkFaint,
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: '5px',
                    transition: 'all 0.1s', lineHeight: 1.3,
                  }}>
                  <span>{t.icon}</span><span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${tw.rule}` }}>
            <div style={{ fontFamily: mono, fontSize: '8.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#b0ada8', marginBottom: '7px' }}>
              Empresa o contacto
            </div>
            <textarea
              rows={4}
              placeholder="Nombre, URL, descripción, captura transcripta..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleAnalyze() }}
              style={{
                width: '100%', background: tw.white,
                border: `1px solid ${tw.rule}`, borderRadius: '3px',
                padding: '9px 10px', fontFamily: mono, fontSize: '12px',
                color: tw.inkMid, resize: 'none', lineHeight: 1.55,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Contexto */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${tw.rule}` }}>
            <div style={{ fontFamily: mono, fontSize: '8.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#b0ada8', marginBottom: '7px' }}>
              Contexto adicional
            </div>
            <textarea
              rows={2}
              placeholder="Ex-cliente, referido, vi en LinkedIn..."
              value={context}
              onChange={e => setContext(e.target.value)}
              style={{
                width: '100%', background: tw.white,
                border: `1px solid ${tw.rule}`, borderRadius: '3px',
                padding: '9px 10px', fontFamily: mono, fontSize: '12px',
                color: tw.inkMid, resize: 'none', lineHeight: 1.55,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Botones */}
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${tw.rule}` }}>
            {!loading ? (
              <button onClick={handleAnalyze} disabled={!input.trim()}
                style={{
                  width: '100%', background: input.trim() ? tw.inkMid : tw.rule,
                  color: input.trim() ? '#FEFCF9' : '#b0ada8',
                  border: 'none', borderRadius: '3px', padding: '11px',
                  fontFamily: serif, fontSize: '13px', letterSpacing: '0.08em',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background 0.12s',
                }}>
                Analizar →
              </button>
            ) : (
              <>
                <button disabled style={{
                  width: '100%', background: tw.rule, color: '#b0ada8',
                  border: 'none', borderRadius: '3px', padding: '11px',
                  fontFamily: serif, fontSize: '13px', letterSpacing: '0.08em',
                  cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}>
                  <span style={{
                    width: '11px', height: '11px',
                    border: '2px solid rgba(90,85,80,0.25)',
                    borderTopColor: tw.inkSub,
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                    display: 'inline-block', flexShrink: 0,
                  }}/>
                  Bruno analizando...
                </button>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <button onClick={handleStop} style={{
                  width: '100%', marginTop: '6px',
                  background: '#b84040', color: tw.white,
                  border: 'none', borderRadius: '3px', padding: '9px',
                  fontFamily: mono, fontSize: '10px', letterSpacing: '0.08em',
                  cursor: 'pointer', transition: 'background 0.12s',
                }}>
                  ✕ Detener
                </button>
              </>
            )}
          </div>

          {/* Historial */}
          <div style={{ padding: '10px 16px 6px', borderBottom: `1px solid ${tw.rule}` }}>
            <div style={{ fontFamily: mono, fontSize: '8.5px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#b0ada8' }}>
              Recientes
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
            {history.length === 0 ? (
              <div style={{ padding: '14px 8px', fontFamily: mono, fontSize: '11px', color: '#b0ada8', textAlign: 'center', lineHeight: 1.6 }}>
                El historial aparece<br />luego del primer análisis
              </div>
            ) : history.map((item, i) => (
              <button key={i} onClick={() => { setInput(item.name); setType(item.type); setResult('') }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'flex-start', gap: '8px',
                  padding: '8px', borderRadius: '3px', cursor: 'pointer',
                  borderBottom: `1px solid ${tw.rule}`,
                  background: 'none', border: 'none', textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = tw.white}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <ScoreBadge score={item.score} decision={item.decision} />
                <div>
                  <div style={{ fontFamily: mono, fontSize: '11px', fontWeight: 700, color: tw.inkMid }}>{item.name}</div>
                  <div style={{ fontFamily: mono, fontSize: '10px', color: '#b0ada8' }}>
                    {TYPE_OPTIONS.find(t => t.id === item.type)?.label} · {formatTime(item.timestamp)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Panel principal */}
        <section ref={resultRef} style={{ overflowY: 'auto', padding: '2.5rem clamp(1.25rem,4vw,3rem)', maxHeight: 'calc(100vh - 240px)' }}>
          {!result && !loading && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '60%', opacity: 0.2, pointerEvents: 'none', gap: '10px',
            }}>
              <div style={{ fontFamily: serif, fontSize: '60px', color: tw.inkSub, lineHeight: 1 }}>B.</div>
              <div style={{ fontFamily: serif, fontSize: '18px', color: tw.inkSub }}>Sin análisis activo</div>
              <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.inkFaint, textAlign: 'center' }}>
                Ingresá una empresa<br />y presioná Analizar
              </div>
            </div>
          )}

          {loading && !result && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '18px 0', fontFamily: mono, fontSize: '12px', color: tw.inkFaint,
            }}>
              <span style={{
                width: '10px', height: '10px',
                border: `2px solid rgba(74,140,64,0.2)`,
                borderTopColor: tw.green,
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
                display: 'inline-block', flexShrink: 0,
              }}/>
              Bruno está investigando la empresa...
            </div>
          )}

          {result && (
            <div
              className="la-md"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(result) + (loading ? '<span class="cursor-blink"></span>' : '')
              }}
              style={{ maxWidth: '780px' }}
            />
          )}
        </section>
      </div>

      {/* Footer */}
      <div style={{
        padding: '1.25rem clamp(1.25rem,5vw,4rem)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: `1px solid ${tw.rule}`,
      }}>
        <span style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '0.10em', color: tw.inkFaint }}>
          Uso exclusivo equipo Bondy
        </span>
        <a href="https://wearebondy.com" target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '0.10em', color: tw.green, textDecoration: 'none' }}>
          wearebondy.com ↗
        </a>
      </div>
    </main>
  )
}
