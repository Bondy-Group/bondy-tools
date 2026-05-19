'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const tw = {
  bg: '#FEFCF9', white: '#FFFFFF', ink: '#1A1A1A', inkMid: '#3A3530',
  inkSub: '#5A5550', inkFaint: '#7A7874', rule: '#E8E4DE', green: '#4A8C40',
  greenTint: 'rgba(74,140,64,0.10)', orange: '#C06A2D',
}
const serif = "'Special Elite', Georgia, serif"
const mono = "'Courier Prime', Courier, monospace"
const ui = "'Plus Jakarta Sans', system-ui, sans-serif"

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AudienciaPage() {
  const { status: authStatus } = useSession()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('tech')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/internal/audiencia', { cache: 'no-store' })
      if (!res.ok) throw new Error(res.status === 403 ? 'Sin permisos' : 'Error al cargar')
      setData(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authStatus === 'authenticated') load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus])

  const cand = data ? (tab === 'tech' ? data.tech : tab === 'hr' ? data.hr : null) : null

  return (
    <div style={{ background: tw.bg, minHeight: '100vh', fontFamily: ui, color: tw.ink }}>
      <div style={{ borderBottom: `1px solid ${tw.rule}`, background: tw.white }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <Link href="/internal" style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: tw.inkFaint, textDecoration: 'none' }}>
              ← Internal
            </Link>
            <h1 style={{ margin: '6px 0 0 0', fontFamily: serif, fontSize: 26, fontWeight: 400, color: tw.inkMid }}>
              Audiencia
            </h1>
            <p style={{ margin: '6px 0 0 0', fontFamily: ui, fontSize: 13, color: tw.inkFaint }}>
              Candidatos tech, candidatos HR y suscriptores del newsletter. Todo el lado oferta en un solo lugar.
            </p>
          </div>
          {data && (
            <span style={{ fontFamily: mono, fontSize: 10, color: tw.inkFaint }}>
              act. {new Date(data.generated_at).toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', display: 'flex', gap: 0 }}>
          {[
            ['tech', 'Candidatos tech'],
            ['hr', 'Candidatos HR'],
            ['newsletter', 'Newsletter'],
            ['engagement', 'Engagement'],
          ].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              fontFamily: mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'transparent', border: 'none', cursor: 'pointer', padding: '12px 18px',
              color: tab === k ? tw.green : tw.inkFaint,
              borderBottom: `2px solid ${tab === k ? tw.green : 'transparent'}`,
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px 60px' }}>
        {error && (
          <div style={{ padding: 16, background: '#FFF4F0', border: `1px solid ${tw.orange}`, color: tw.orange, fontFamily: mono, fontSize: 13 }}>{error}</div>
        )}
        {loading && !data && (
          <div style={{ fontFamily: mono, fontSize: 13, color: tw.inkFaint, padding: 24 }}>Cargando…</div>
        )}

        {data && (tab === 'tech' || tab === 'hr') && cand && (
          <>
            <Cards>
              <StatCard label="Suscriptores" value={cand.total} />
              <StatCard label="Activos" value={cand.active} highlight />
              <StatCard label="Cancelados" value={cand.unsubscribed} muted />
              <StatCard label="Bounced" value={cand.bounced} muted />
              <StatCard label="Sin filtros" value={cand.no_filters} />
              <StatCard label="Nunca recibieron" value={cand.never_sent} muted />
            </Cards>

            {cand.send_count_max === 0 && cand.last_sent && (
              <Note>
                ⚠ <b>send_count = 0 para todos</b> aunque el último digest salió el {fmtDate(cand.last_sent)}.
                El endpoint marca <code>last_sent_at</code> pero no incrementa el contador → fix de 1 línea en
                <code> weekly-digest/route.js</code> (handoff Mateo Dev).
              </Note>
            )}

            <Section title="Altas por hora (ART)">
              <HourBars hours={cand.by_hour} />
            </Section>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginTop: 28 }}>
              <Section title="Áreas"><Breakdown map={cand.areas} /></Section>
              <Section title="Modalidad"><Breakdown map={cand.modalities} /></Section>
              <Section title="Seniority"><Breakdown map={cand.seniorities} /></Section>
            </div>

            <EmailFunnel email={data.email} tab={tab} />
          </>
        )}

        {data && tab === 'newsletter' && (
          <>
            <Cards>
              <StatCard label="Total" value={data.newsletter.total} />
              <StatCard label="Confirmados" value={data.newsletter.confirmed} highlight />
              <StatCard label="Pendientes" value={data.newsletter.pending} muted />
              <StatCard label="Cancelados" value={data.newsletter.unsubscribed} muted />
              <StatCard label="ES / EN" value={`${data.newsletter.es} / ${data.newsletter.en}`} />
              <StatCard label="Ediciones enviadas" value={data.newsletter.issues_sent} />
            </Cards>

            {data.newsletter.total <= 5 && (
              <Note>
                El newsletter (Bondy Thinking) está recién scaffoldeado: {data.newsletter.total} registros,
                {' '}{data.newsletter.issues_total} ediciones. Todavía no es una audiencia real — el panel ya queda listo para cuando arranque.
              </Note>
            )}

            <Section title="Altas por hora (ART)">
              <HourBars hours={data.newsletter.by_hour} />
            </Section>

            <Section title="Origen">
              <Breakdown map={data.newsletter.by_source} />
            </Section>

            <EmailFunnel email={data.email} tab={tab} />
          </>
        )}

        {data && tab === 'engagement' && (
          <EngagementTab email={data.email} />
        )}

        {data && data.unmapped_sources && data.unmapped_sources.length > 0 && (
          <Note>
            Hay sources sin mapear en job_subscribers: <code>{data.unmapped_sources.join(', ')}</code>. Revisar si va a tech o HR.
          </Note>
        )}
      </div>
    </div>
  )
}

function Cards({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>{children}</div>
}

function StatCard({ label, value, muted, highlight }) {
  return (
    <div style={{ background: tw.white, border: `1px solid ${highlight ? tw.green : tw.rule}`, padding: '14px 16px' }}>
      <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: highlight ? tw.green : (muted ? tw.inkFaint : tw.inkSub), marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: serif, fontSize: 24, color: tw.inkMid, lineHeight: 1 }}>{value}</div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.inkFaint, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

function Note({ children }) {
  return (
    <div style={{ marginTop: 16, padding: '12px 16px', background: tw.greenTint, border: `1px solid ${tw.rule}`, borderLeft: `3px solid ${tw.orange}`, fontFamily: ui, fontSize: 12.5, color: tw.inkSub, lineHeight: 1.6 }}>
      {children}
    </div>
  )
}

function HourBars({ hours }) {
  const max = Math.max(1, ...hours)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140, background: tw.white, border: `1px solid ${tw.rule}`, padding: '16px 14px 8px' }}>
      {hours.map((v, h) => (
        <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ fontFamily: mono, fontSize: 9, color: tw.inkFaint, height: 12 }}>{v || ''}</span>
          <div title={`${h}:00 — ${v}`} style={{ width: '100%', height: `${(v / max) * 96}px`, background: v ? tw.green : tw.rule, minHeight: v ? 2 : 1 }} />
          <span style={{ fontFamily: mono, fontSize: 8, color: tw.inkFaint }}>{h}</span>
        </div>
      ))}
    </div>
  )
}

function Breakdown({ map }) {
  const entries = Object.entries(map || {}).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) {
    return <div style={{ fontFamily: ui, fontSize: 12, color: tw.inkFaint, padding: '8px 0' }}>Sin datos</div>
  }
  const max = Math.max(...entries.map((e) => e[1]))
  return (
    <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {entries.map(([k, v]) => (
        <div key={k}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: ui, fontSize: 12, color: tw.inkSub, marginBottom: 4 }}>
            <span>{k}</span><span style={{ fontFamily: mono, color: tw.inkMid }}>{v}</span>
          </div>
          <div style={{ height: 6, background: tw.bg }}>
            <div style={{ height: '100%', width: `${(v / max) * 100}%`, background: tw.green }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmailFunnel({ email, tab }) {
  // email === null → la tabla email_events no respondió: dejamos la sección
  // en estado "pendiente" (no rompemos el panel).
  const f = email
    ? (tab === 'tech' ? email.tech : tab === 'hr' ? email.hr : tab === 'newsletter' ? email.newsletter : null)
    : null
  const hasData = f && f.total_events > 0

  if (!hasData) {
    return (
      <div style={{ marginTop: 28, border: `1px dashed ${tw.rule}`, padding: '18px 20px', background: tw.white, opacity: 0.85 }}>
        <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.inkFaint, marginBottom: 6 }}>
          Opens · Clicks · Deliverability
        </div>
        <p style={{ margin: 0, fontFamily: ui, fontSize: 12.5, color: tw.inkSub, lineHeight: 1.6 }}>
          {email
            ? 'Webhook de Resend activo. Todavía no llegaron eventos para este público — la sección se llena sola cuando salga el próximo envío.'
            : <>Webhook de Resend (<code>email.sent / delivered / opened / clicked / bounced</code>) → tabla <code>email_events</code>. Aún sin datos: se enciende sola cuando empiecen a llegar eventos.</>}
        </p>
      </div>
    )
  }

  const base = f.delivered || f.sent || 0
  const pct = (n) => (base > 0 ? `${Math.round((n / base) * 1000) / 10}%` : '—')
  const engaged = (email && email.engaged && email.engaged[tab]) || []
  return (
    <Section title="Opens · Clicks · Deliverability">
      <Cards>
        <StatCard label="Enviados" value={f.sent} />
        <StatCard label="Entregados" value={f.delivered} highlight />
        <StatCard label="Abiertos" value={`${f.opened} · ${pct(f.opened)}`} />
        <StatCard label="Clicks" value={`${f.clicked} · ${pct(f.clicked)}`} />
        <StatCard label="Bounces" value={f.bounced} muted />
        <StatCard label="Spam" value={f.complained} muted />
      </Cards>
      <div style={{ marginTop: 10, fontFamily: mono, fontSize: 10, color: tw.inkFaint }}>
        último evento: {f.last_event_at ? fmtDate(f.last_event_at) : '—'} · {f.total_events} eventos registrados
      </div>
      <EngagedList people={engaged} />
    </Section>
  )
}

function EngagedList({ people }) {
  if (!people || people.length === 0) {
    return (
      <div style={{ marginTop: 18, fontFamily: ui, fontSize: 12, color: tw.inkFaint }}>
        Todavía no hay aperturas ni clicks registrados para este público.
      </div>
    )
  }
  const Tag = ({ children, color }) => (
    <span style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', color, border: `1px solid ${color}`, borderRadius: 2, padding: '1px 5px', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.inkFaint, marginBottom: 10 }}>
        Quién — {people.length} {people.length === 1 ? 'persona' : 'personas'}
      </div>
      <div style={{ border: `1px solid ${tw.rule}` }}>
        {people.map((p, i) => (
          <div key={p.recipient} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderTop: i ? `1px solid ${tw.rule}` : 'none', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: ui, fontSize: 12.5, color: tw.inkSub, flex: '1 1 220px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {p.recipient}
            </span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {p.clicked && <Tag color={tw.green}>click{p.click_count > 1 ? ` ×${p.click_count}` : ''}</Tag>}
              {p.opened && <Tag color={tw.inkSub}>abrió{p.open_count > 1 ? ` ×${p.open_count}` : ''}</Tag>}
              {p.bounced && <Tag color={tw.inkFaint}>bounce</Tag>}
              {p.complained && <Tag color={tw.inkFaint}>spam</Tag>}
            </span>
            <span style={{ fontFamily: mono, fontSize: 9, color: tw.inkFaint, flex: '0 0 auto' }}>
              {p.last_click_at ? fmtDate(p.last_click_at) : p.last_open_at ? fmtDate(p.last_open_at) : ''}
            </span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, fontFamily: mono, fontSize: 9, color: tw.inkFaint }}>
        Ordenado: clicks primero, luego aperturas, más reciente arriba.
      </div>
    </div>
  )
}

function shortUrl(u) {
  try {
    const x = new URL(u)
    const p = (x.pathname + x.search).replace(/\/$/, '')
    return x.hostname.replace(/^www\./, '') + (p && p !== '/' ? p : '')
  } catch {
    return u
  }
}

function EngagementTab({ email }) {
  if (!email) {
    return (
      <div style={{ border: `1px dashed ${tw.rule}`, padding: '18px 20px', background: tw.white, opacity: 0.85, fontFamily: ui, fontSize: 12.5, color: tw.inkSub, lineHeight: 1.6 }}>
        El webhook de Resend todavía no devolvió datos. Esta pestaña se llena sola con el primer envío real.
      </div>
    )
  }
  const hot = email.hot || []
  const links = email.topLinks || []
  const sup = email.suppression || []

  return (
    <>
      <p style={{ margin: '0 0 24px 0', fontFamily: ui, fontSize: 13, color: tw.inkFaint, lineHeight: 1.6, maxWidth: 680 }}>
        Cross-público, todos los envíos. El engagement acá es señal de sourcing:
        quién está activo y receptivo, qué roles tiran, y qué emails sacar para
        cuidar la reputación del dominio.
      </p>

      {/* #1 Candidatos calientes */}
      <Section title={`Candidatos calientes — ${hot.length}`}>
        {hot.length === 0 ? (
          <Empty>Sin aperturas ni clicks todavía. Se puebla con el primer digest real.</Empty>
        ) : (
          <div style={{ border: `1px solid ${tw.rule}` }}>
            <Row head cols={['Email', 'Clicks', 'Aperturas', 'Score', 'Último']} />
            {hot.map((p, i) => (
              <Row
                key={p.recipient}
                i={i}
                cols={[
                  p.recipient,
                  String(p.clicks),
                  String(p.opens),
                  String(p.score),
                  p.last_at ? fmtDate(p.last_at) : '—',
                ]}
                strong={p.clicks > 0}
              />
            ))}
          </div>
        )}
        <Hint>Score = clicks×3 + aperturas. La lista de arriba es la cola priorizada para el sourcer.</Hint>
      </Section>

      {/* #2 Roles / links más clickeados */}
      <div style={{ marginTop: 32 }}>
        <Section title={`Qué se clickea más — ${links.length} links`}>
          {links.length === 0 ? (
            <Empty>Sin clicks registrados todavía.</Empty>
          ) : (
            <div style={{ border: `1px solid ${tw.rule}` }}>
              <Row head cols={['Destino', 'Clicks', 'Personas únicas', 'Último']} />
              {links.map((l, i) => (
                <Row
                  key={l.url}
                  i={i}
                  cols={[l.url, String(l.clicks), String(l.unique_clickers), l.last_at ? fmtDate(l.last_at) : '—']}
                  display={[shortUrl(l.url), null, null, null]}
                  href={l.url}
                  strong
                />
              ))}
            </div>
          )}
          <Hint>Qué roles/links quiere la audiencia → qué destacar en el próximo digest.</Hint>
        </Section>
      </div>

      {/* #5 Lista de supresión */}
      <div style={{ marginTop: 32 }}>
        <Section title={`Lista de supresión — ${sup.length}`}>
          {sup.length === 0 ? (
            <Empty>Sin hard bounces ni quejas de spam. Reputación limpia.</Empty>
          ) : (
            <>
              <div style={{ border: `1px solid ${tw.rule}` }}>
                <Row head cols={['Email', 'Motivo', 'Fecha']} />
                {sup.map((s, i) => (
                  <Row
                    key={s.recipient}
                    i={i}
                    cols={[
                      s.recipient,
                      [s.bounced && 'hard bounce', s.complained && 'spam'].filter(Boolean).join(' + '),
                      s.last_at ? fmtDate(s.last_at) : '—',
                    ]}
                  />
                ))}
              </div>
              <Hint>Sacar estos emails de la base protege la entregabilidad. Copiá la lista y dásela al cron de limpieza o pedímelo y lo automatizo.</Hint>
            </>
          )}
        </Section>
      </div>
    </>
  )
}

function Row({ cols, display, head, i, strong, href }) {
  const widths = cols.length === 5
    ? ['1fr', '80px', '90px', '70px', '110px']
    : cols.length === 4
      ? ['1fr', '80px', '120px', '110px']
      : ['1fr', '160px', '110px']
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: widths.join(' '), gap: 12,
      padding: head ? '8px 12px' : '9px 12px',
      borderTop: i ? `1px solid ${tw.rule}` : 'none',
      background: head ? tw.bg : 'transparent',
      alignItems: 'center',
    }}>
      {cols.map((c, idx) => {
        const txt = display && display[idx] != null ? display[idx] : c
        if (head) {
          return <span key={idx} style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.inkFaint }}>{c}</span>
        }
        const isFirst = idx === 0
        const style = {
          fontFamily: isFirst ? ui : mono,
          fontSize: isFirst ? 12.5 : 11,
          color: isFirst ? (strong ? tw.inkMid : tw.inkSub) : tw.inkSub,
          fontWeight: isFirst && strong ? 600 : 400,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }
        if (isFirst && href) {
          return (
            <a key={idx} href={href} target="_blank" rel="noreferrer" style={{ ...style, color: tw.green, textDecoration: 'none' }} title={c}>
              {txt} ↗
            </a>
          )
        }
        return <span key={idx} style={style} title={isFirst ? c : undefined}>{txt}</span>
      })}
    </div>
  )
}

function Empty({ children }) {
  return <div style={{ fontFamily: ui, fontSize: 12.5, color: tw.inkFaint, padding: '10px 0' }}>{children}</div>
}

function Hint({ children }) {
  return <div style={{ marginTop: 8, fontFamily: mono, fontSize: 9, color: tw.inkFaint, lineHeight: 1.5 }}>{children}</div>
}
