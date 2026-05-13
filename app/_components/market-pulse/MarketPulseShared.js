'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/* ───────────────── elementos de marca (idénticos a btl-*) ────────────────── */

export const BondyLogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="4"  y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" />
    <rect x="22" y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".18" />
    <rect x="4"  y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".42" />
    <rect x="22" y="22" width="14" height="12" rx="2.5" fill="#4A8C40" />
  </svg>
)

export const BondyUnderline = ({ width = 360, color = '#4A8C40' }) => {
  const mid = width / 2
  return (
    <svg width={width} height="8" viewBox={`0 0 ${width} 8`} fill="none" style={{ display: 'block', maxWidth: '100%' }}>
      <path d={`M0 4 Q${mid * 0.5} 1 ${mid} 4 Q${mid * 1.5} 7 ${width} 4`} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/* ─────────────────── persistencia de idioma compartida ──────────────────── */

export function useBondyLang() {
  const [lang, setLang] = useState('es')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = window.localStorage.getItem('bondy_tools_lang')
      if (saved === 'es' || saved === 'en') setLang(saved)
    } catch {}
  }, [])

  useEffect(() => {
    if (mounted) {
      try { window.localStorage.setItem('bondy_tools_lang', lang) } catch {}
    }
  }, [lang, mounted])

  return [lang, setLang]
}

/* ─────────────────────── header con back link customizable ───────────────── */

export function MarketPulseHeader({ lang, setLang, backHref, backLabel }) {
  return (
    <header className="btl-bar">
      <Link href="/" className="btl-bar__brand">
        <BondyLogo size={22} />
        <span className="btl-bar__brand-name">Bondy Tools</span>
      </Link>
      <div className="btl-bar__right">
        <Link href={backHref} className="btl-bar__back">{backLabel}</Link>
        <span className="btl-bar__sep" />
        <div className="btl-lang">
          <span
            className={lang === 'es' ? 'is-active' : ''}
            onClick={() => setLang('es')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLang('es') }}
          >ES</span>
          <i>/</i>
          <span
            className={lang === 'en' ? 'is-active' : ''}
            onClick={() => setLang('en')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLang('en') }}
          >EN</span>
        </div>
      </div>
    </header>
  )
}

/* ──────────────────────────── stat card grande ──────────────────────────── */

export function StatCard({ label, value, suffix, hint, tone }) {
  return (
    <div className={`mp-stat ${tone === 'green' ? 'mp-stat--green' : ''}`}>
      <div className="mp-stat__label">{label}</div>
      <div className="mp-stat__value">{value}{suffix ? <span className="mp-stat__suffix">{suffix}</span> : null}</div>
      {hint ? <div className="mp-stat__hint">{hint}</div> : null}
    </div>
  )
}

/* ────────────────────── bar list (top stacks, top empresas) ──────────────── */

export function BarList({ items, maxValue, valueKey = 'count', labelKey = 'stack', subKey = null, badgeKey = null }) {
  const max = maxValue ?? Math.max(...items.map(i => i[valueKey] || 0), 1)
  return (
    <div className="mp-barlist">
      {items.map((item, i) => {
        const width = Math.max(2, Math.round((item[valueKey] / max) * 100))
        return (
          <div key={i} className="mp-barlist__row">
            <div className="mp-barlist__label">
              {labelKey && <span className="mp-barlist__name">{item[labelKey]}</span>}
              {subKey && item[subKey] ? <span className="mp-barlist__sub">{item[subKey]}</span> : null}
            </div>
            <div className="mp-barlist__track">
              <div className="mp-barlist__fill" style={{ width: `${width}%` }} />
            </div>
            <div className="mp-barlist__value">{item[valueKey]}</div>
            {badgeKey && item[badgeKey] != null ? (
              <span className={`mp-barlist__badge ${item[badgeKey] > 0 ? 'is-up' : item[badgeKey] < 0 ? 'is-down' : ''}`}>
                {item[badgeKey] > 0 ? '+' : ''}{item[badgeKey]}%
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────── line chart simple SVG (sin deps externos) ───────────────── */

export function LineChart({ months, series, monthLabels, height = 220 }) {
  const W = 700
  const H = height
  const padL = 40, padR = 12, padT = 16, padB = 28
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const allValues = series.flatMap(s => s.values)
  const maxY = Math.max(...allValues, 1)

  const x = (i) => padL + (months.length === 1 ? innerW / 2 : (i / (months.length - 1)) * innerW)
  const y = (v) => padT + innerH - (v / maxY) * innerH

  const colors = ['#1A1A1A', '#4A8C40', '#B8A640', '#5A5550', '#3A7030', '#7A7874']

  return (
    <div className="mp-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img">
        {/* y axis gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line key={i}
            x1={padL} y1={padT + p * innerH}
            x2={W - padR} y2={padT + p * innerH}
            stroke="#E8E4DE" strokeWidth="0.5"
          />
        ))}
        {/* y axis labels */}
        {[0, 0.5, 1].map((p, i) => (
          <text key={i}
            x={padL - 6} y={padT + (1 - p) * innerH + 4}
            fontSize="10" fill="#7A7874" textAnchor="end"
            fontFamily="'Courier Prime', monospace"
          >{Math.round(maxY * p)}</text>
        ))}
        {/* x axis labels */}
        {months.map((m, i) => (
          <text key={i}
            x={x(i)} y={H - 8}
            fontSize="10" fill="#7A7874" textAnchor="middle"
            fontFamily="'Courier Prime', monospace"
          >{monthLabels[i]}</text>
        ))}
        {/* lines */}
        {series.map((s, i) => {
          const path = s.values.map((v, j) => `${j === 0 ? 'M' : 'L'} ${x(j)} ${y(v)}`).join(' ')
          return (
            <g key={s.stack}>
              <path d={path} stroke={colors[i % colors.length]} strokeWidth="2" fill="none" />
              {s.values.map((v, j) => (
                <circle key={j} cx={x(j)} cy={y(v)} r="3" fill={colors[i % colors.length]} />
              ))}
            </g>
          )
        })}
      </svg>
      <div className="mp-chart__legend">
        {series.map((s, i) => (
          <span key={s.stack} className="mp-chart__legend-item">
            <span className="mp-chart__legend-dot" style={{ background: colors[i % colors.length] }} />
            {s.stack}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ─────────────── donut chart (modality, seniority mix) ──────────────────── */

export function DonutChart({ items, total }) {
  const colors = ['#4A8C40', '#1A1A1A', '#B8A640', '#7A7874', '#5A5550']
  const R = 60
  const W = 160
  let acc = 0
  const t = total || items.reduce((s, i) => s + i.count, 0) || 1
  const arcs = items.map((item, i) => {
    const pct = item.count / t
    const start = acc
    acc += pct
    const end = acc
    const a0 = start * 2 * Math.PI - Math.PI / 2
    const a1 = end * 2 * Math.PI - Math.PI / 2
    const large = pct > 0.5 ? 1 : 0
    const x0 = W / 2 + R * Math.cos(a0)
    const y0 = W / 2 + R * Math.sin(a0)
    const x1 = W / 2 + R * Math.cos(a1)
    const y1 = W / 2 + R * Math.sin(a1)
    return {
      d: `M ${W / 2} ${W / 2} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`,
      color: colors[i % colors.length],
      ...item,
    }
  })

  return (
    <div className="mp-donut">
      <svg viewBox={`0 0 ${W} ${W}`} width="160" height="160" role="img">
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill={a.color} />
        ))}
        <circle cx={W / 2} cy={W / 2} r={R * 0.55} fill="#FEFCF9" />
      </svg>
      <ul className="mp-donut__legend">
        {arcs.map((a, i) => (
          <li key={i}>
            <span className="mp-donut__dot" style={{ background: a.color }} />
            <span className="mp-donut__name">{a.label || a.value}</span>
            <span className="mp-donut__pct">{a.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ────────────────────── section + footer compartido ─────────────────────── */

export function Section({ title, kicker, children, action }) {
  return (
    <section className="mp-section">
      <div className="mp-section__head">
        <div>
          {kicker ? <div className="mp-section__kicker">— {kicker}</div> : null}
          <h2 className="mp-section__title">{title}</h2>
        </div>
        {action ? <div className="mp-section__action">{action}</div> : null}
      </div>
      <div className="mp-section__body">{children}</div>
    </section>
  )
}

export function MarketPulseFooter({ lang, generatedAt }) {
  const txt = lang === 'es'
    ? `Datos actualizados el ${new Date(generatedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}. Fuente: tabla \`jobs\` (Supabase), normalizada con whitelist curada. El scrapper corre 1 vez al día.`
    : `Data refreshed on ${new Date(generatedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}. Source: \`jobs\` table (Supabase), normalized with curated whitelist. Scraper runs once a day.`
  return (
    <footer className="mp-foot">
      <p className="mp-foot__meta">{txt}</p>
      <div className="mp-foot__brand">
        <span>© 2026 Bondy Group · Buenos Aires</span>
        <a href="https://wearebondy.com">wearebondy.com ↗</a>
      </div>
    </footer>
  )
}

/* ───────────────────────── loading skeleton ─────────────────────────────── */

export function PulseSkeleton({ lang }) {
  return (
    <div className="mp-loading">
      <p>{lang === 'es' ? 'Cargando datos del mercado…' : 'Loading market data…'}</p>
    </div>
  )
}
