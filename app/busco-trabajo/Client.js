'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { SPANISH_SOURCES } from '@/lib/scraper-jobs'
import { trackEvent } from '@/lib/analytics'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function formatRelativeDate(iso) {
  if (!iso) return ''
  const today = new Date()
  const d = new Date(iso)
  const days = Math.floor((today - d) / 86400000)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days}d`
  if (days < 30) return `hace ${Math.floor(days / 7)}sem`
  return `hace ${Math.floor(days / 30)}m`
}

function locationBucket(loc) {
  const s = (loc || '').toLowerCase()
  if (s.includes('global')) return 'Global (remoto)'
  if (s.includes('latam') || s.includes('americas')) return 'LATAM (remoto)'
  if (s.includes('argentina') || s.includes('buenos aires')) return 'Argentina'
  if (s.includes('mx') || s.includes('méxico') || s.includes('mexico') || s.includes('cdmx')) return 'México'
  if (s.includes('brasil') || s.includes('brazil') || s.includes('são paulo') || s.includes('sao paulo')) return 'Brasil'
  if (s.includes('uruguay') || s.includes('montevideo')) return 'Uruguay'
  if (s.includes('madrid') || s.includes('españa') || s.includes('espana') || s.includes('spain')) return 'España'
  return 'LATAM (remoto)'
}

function buildApplyUrl(role) {
  const base = role.applyUrl
  if (!base) return '#'
  const params = new URLSearchParams({
    utm_source: 'bondy',
    utm_medium: 'jobs',
    utm_campaign: 'busco-trabajo',
    utm_content: `role-${role.id}`,
    ref: 'bondy.tools',
  })
  return base + (base.includes('?') ? '&' : '?') + params.toString()
}

// Share URL — same base as apply but with a "share" campaign tag so we can
// distinguish in analytics traffic from word-of-mouth vs direct discovery.
function buildShareUrl(role) {
  const base = role.applyUrl
  if (!base) return ''
  const params = new URLSearchParams({
    utm_source: 'bondy',
    utm_medium: 'share',
    utm_campaign: 'busco-trabajo',
    utm_content: `role-${role.id}`,
    ref: 'bondy.tools',
  })
  return base + (base.includes('?') ? '&' : '?') + params.toString()
}

function shareTextFor(role) {
  const company = role.company || ''
  const title = role.title || 'Esta posición'
  return `${title} — ${company} (vía Bondy)`
}

function attributionCopy(lang) {
  if (lang === 'en') {
    return `I found this role through Bondy (wearebondy.com), a technical recruiting group focused on engineering teams across LATAM.`
  }
  return `Encontré esta posición a través de Bondy (wearebondy.com), un grupo de recruiting técnico enfocado en equipos de ingeniería de LATAM.`
}

const modalityClass = (m) => (m === 'Remote' ? 'dot--remote' : m === 'Híbrido' ? 'dot--hybrid' : 'dot--onsite')

// ─────────────────────────────────────────────────────────────
// Brand atoms (logo)
// ─────────────────────────────────────────────────────────────
const BondyLogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="4" y="5" width="14" height="12" rx="2.5" fill="#1A1A1A" />
    <rect x="22" y="5" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity="0.18" />
    <rect x="4" y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity="0.42" />
    <rect x="22" y="22" width="14" height="12" rx="2.5" fill="#4A8C40" />
  </svg>
)

// ─────────────────────────────────────────────────────────────
// FilterChip — multi-select dropdown
// ─────────────────────────────────────────────────────────────
function FilterChip({ label, options, selected, onChange, allLabel = 'Todas' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const toggle = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter((x) => x !== opt))
    else onChange([...selected, opt])
  }

  const active = selected.length > 0
  const display = selected.length === 0 ? label : selected.length === 1 ? selected[0] : `${label} · ${selected.length}`

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className={`chip ${active ? 'chip--active' : ''}`} onClick={() => setOpen(!open)}>
        <span>{display}</span>
        <span className="chip__caret">▾</span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            minWidth: 200,
            background: '#fff',
            border: '1px solid #E8E4DE',
            padding: '8px 0',
            zIndex: 200,
            boxShadow: '0 4px 12px rgba(26,26,26,0.06)',
          }}
        >
          <div
            onClick={() => onChange([])}
            style={{
              padding: '8px 16px',
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#7A7874',
              cursor: 'pointer',
              borderBottom: '1px solid #E8E4DE',
              marginBottom: 4,
            }}
          >
            {allLabel}
          </div>
          {options.map((opt) => {
            const isSel = selected.includes(opt)
            return (
              <div
                key={opt}
                onClick={() => toggle(opt)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  color: isSel ? '#4A8C40' : '#1A1A1A',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontWeight: isSel ? 600 : 400,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(74,140,64,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    border: `1px solid ${isSel ? '#4A8C40' : '#E8E4DE'}`,
                    background: isSel ? '#4A8C40' : 'transparent',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 9,
                  }}
                >
                  {isSel ? '✓' : ''}
                </span>
                {opt}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// FiltersBar
// ─────────────────────────────────────────────────────────────
function FiltersBar({ filters, setFilters, search, setSearch, areas, modalities, seniorities, sources, locations, languages }) {
  const setF = (key) => (vals) => setFilters({ ...filters, [key]: vals })
  const anyActive =
    filters.areas.length ||
    filters.modalities.length ||
    filters.seniorities.length ||
    filters.sources.length ||
    filters.locations.length ||
    filters.languages.length ||
    search

  return (
    <div className="filters">
      <div className="filters__inner">
        <div className="filters__search">
          <span className="filters__search-icon">⌕</span>
          <input
            placeholder="Buscar por título, empresa, stack…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filters__group">
          <FilterChip label="Área" options={areas} selected={filters.areas} onChange={setF('areas')} />
          <FilterChip label="Modalidad" options={modalities} selected={filters.modalities} onChange={setF('modalities')} />
          <FilterChip label="Ubicación" options={locations} selected={filters.locations} onChange={setF('locations')} />
          <FilterChip label="Idioma" options={languages} selected={filters.languages} onChange={setF('languages')} />
          <FilterChip label="Seniority" options={seniorities} selected={filters.seniorities} onChange={setF('seniorities')} />
          <FilterChip label="Fuente" options={sources} selected={filters.sources} onChange={setF('sources')} />
        </div>
        {anyActive ? (
          <>
            <div className="filters__divider" />
            <div
              className="filters__clear"
              onClick={() => {
                setFilters({ areas: [], modalities: [], seniorities: [], sources: [], locations: [], languages: [] })
                setSearch('')
              }}
            >
              Limpiar ✕
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Row
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// ShareMenu — popover with link/whatsapp/email/linkedin options.
// `compact` variant is used on Row cards (icon only). Default variant
// (used inside DetailPanel) labels the trigger.
// ─────────────────────────────────────────────────────────────
function ShareMenu({ role, compact = false, location = 'row' }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const url = buildShareUrl(role)
  const text = shareTextFor(role)

  const fire = (channel) => {
    trackEvent('job_share', {
      job_id: role.id,
      job_title: role.title,
      company: role.company,
      source: role.source,
      channel,
      location,
    })
  }

  const onToggle = (e) => {
    e.stopPropagation()
    setOpen((v) => !v)
  }

  const onCopy = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Fallback: select-and-copy fails silently. Users on ancient browsers
      // can still right-click the WhatsApp/Email links.
    }
    fire('copy_link')
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`
  const mailto = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`
  const li = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`

  return (
    <div className="share" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`share__trigger ${compact ? 'share__trigger--compact' : ''}`}
        onClick={onToggle}
        aria-label="Compartir esta posición"
        aria-expanded={open}
        title="Compartir"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .17 1.97L8.83 9.03A3 3 0 1 0 6 13a3 3 0 0 0 2.83-1.97l6.34 3.06A3 3 0 1 0 18 16a3 3 0 0 0-2.83 1.97L8.83 14.9A3.03 3.03 0 0 0 9 13a3 3 0 0 0-.17-1.97l6.34-3.06A3 3 0 0 0 18 8Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        {!compact && <span className="share__trigger-label">Compartir</span>}
      </button>

      {open && (
        <div className="share__menu" role="menu">
          <button type="button" className="share__item" onClick={onCopy} role="menuitem">
            <span className="share__item-icon" aria-hidden="true">🔗</span>
            <span>{copied ? 'Link copiado' : 'Copiar link'}</span>
          </button>
          <a
            className="share__item"
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { fire('whatsapp'); setOpen(false) }}
            role="menuitem"
          >
            <span className="share__item-icon" aria-hidden="true">💬</span>
            <span>WhatsApp</span>
          </a>
          <a
            className="share__item"
            href={mailto}
            onClick={() => { fire('email'); setOpen(false) }}
            role="menuitem"
          >
            <span className="share__item-icon" aria-hidden="true">✉</span>
            <span>Email</span>
          </a>
          <a
            className="share__item"
            href={li}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { fire('linkedin'); setOpen(false) }}
            role="menuitem"
          >
            <span className="share__item-icon" aria-hidden="true">in</span>
            <span>LinkedIn</span>
          </a>
        </div>
      )}
    </div>
  )
}

function Row({ role, onSelect, selected, onToggleSave }) {
  const initials = (role.company || '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <div className={`row ${selected ? 'row--selected' : ''}`} onClick={() => onSelect(role)}>
      <div className="row__date">{formatRelativeDate(role.date)}</div>
      <div>
        <div className="row__title">
          {role.isNew && <span className="row__new" aria-label="Nuevo">Nuevo</span>}
          {role.title}
        </div>
        <div className="row__company" style={{ marginTop: 4 }}>
          <span className="row__company-logo">{initials}</span>
          {role.company}
        </div>
      </div>
      <div className="row__meta">
        <span className={`dot ${modalityClass(role.modality)}`} />
        <span>{role.modality}</span>
        <span style={{ color: '#E8E4DE' }}>·</span>
        <span style={{ color: '#7A7874' }}>{role.location}</span>
      </div>
      <div className="row__seniority">{role.seniority}</div>
      <div className={`row__salary ${!role.salary ? 'row__salary--empty' : ''}`}>{role.salary || '—'}</div>
      <div className="row__source">{role.area.split(' / ')[0]}</div>
      <div className="row__source">{role.source}</div>
      <div className="row__actions" onClick={(e) => e.stopPropagation()}>
        <ShareMenu role={role} compact location="row" />
        <button
          className={`row__save ${role.saved ? 'row__save--saved' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleSave(role.id)
          }}
          aria-label={role.saved ? 'Quitar de guardados' : 'Guardar'}
        >
          {role.saved ? '★' : '☆'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DetailPanel
// ─────────────────────────────────────────────────────────────
function DetailPanel({ role, onClose, onToggleSave, onApply }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const open = !!role
  const r = role || {}
  return (
    <>
      <div className={`detail-overlay ${open ? 'detail-overlay--open' : ''}`} onClick={onClose} />
      <aside className={`detail ${open ? 'detail--open' : ''}`}>
        {role && (
          <>
            <div className="detail__header">
              <div className="detail__source">vía {r.source}</div>
              <button className="detail__close" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="detail__body">
              <h2 className="detail__title">{r.title}</h2>
              <div className="detail__company">
                {r.company} · {r.location}
              </div>

              <div className="detail__meta-grid">
                <div className="detail__meta-cell">
                  <div className="detail__meta-label">Modalidad</div>
                  <div className="detail__meta-val">
                    <span className={`dot ${modalityClass(r.modality)}`} style={{ marginRight: 8 }} />
                    {r.modality}
                  </div>
                </div>
                <div className="detail__meta-cell">
                  <div className="detail__meta-label">Seniority</div>
                  <div className="detail__meta-val">{r.seniority}</div>
                </div>
                <div className="detail__meta-cell">
                  <div className="detail__meta-label">Compensación</div>
                  <div className="detail__meta-val">{r.salary || 'No publicado'}</div>
                </div>
                <div className="detail__meta-cell">
                  <div className="detail__meta-label">Publicado</div>
                  <div className="detail__meta-val">{formatRelativeDate(r.date)}</div>
                </div>
              </div>

              <div className="attr-banner">
                <div className="attr-banner__icon">→</div>
                <div className="attr-banner__text">
                  Al aplicar, te pediremos copiar una línea para que la empresa sepa que llegaste por <strong>Bondy</strong>. Es lo
                  que hace que sigan publicándonos roles.
                </div>
              </div>

              {r.tags && r.tags.length > 0 && (
                <>
                  <div className="detail__section-label">Stack</div>
                  <div className="detail__tags">
                    {r.tags.map((t) => (
                      <span key={t} className="detail__tag">
                        {t}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <div className="detail__section-label">Por qué Bondy lo lista</div>
              <p className="detail__desc" style={{ margin: 0 }}>
                Curamos lo que se publica acá: la empresa es real, el equipo es técnico, y el proceso de hiring es razonable.{' '}
                <em>No vendemos roles. Los listamos.</em>
              </p>
            </div>
            <div className="detail__cta">
              <button className="btn btn--primary btn--block" onClick={() => onApply(r)}>
                Aplicar en {r.source} →
              </button>
              <div className="detail__cta-row">
                <button className="btn btn--ghost detail__cta-half" onClick={() => onToggleSave(r.id)}>
                  {r.saved ? 'Guardado ★' : 'Guardar ☆'}
                </button>
                <div className="detail__cta-half detail__share-wrap">
                  <ShareMenu role={r} location="detail" />
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// ApplyModal
// ─────────────────────────────────────────────────────────────
function ApplyModal({ role, onClose }) {
  const defaultLang = role && SPANISH_SOURCES.includes(role.source) ? 'es' : 'en'
  const [lang, setLang] = useState(defaultLang)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (role) setLang(SPANISH_SOURCES.includes(role.source) ? 'es' : 'en')
    setCopied(false)
  }, [role])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!role) return null
  const copy = attributionCopy(lang)
  const url = buildApplyUrl(role)

  const onCopy = () => {
    navigator.clipboard?.writeText(copy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const onContinue = () => {
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener')
    onClose()
  }

  return (
    <div className="apply-overlay apply-overlay--open" onClick={onClose}>
      <div className="apply-modal" onClick={(e) => e.stopPropagation()}>
        <div className="apply-modal__head">
          <div>
            <div className="apply-modal__kicker">Antes de aplicar</div>
            <h3 className="apply-modal__title">
              Mencioná que llegaste por <em>Bondy.</em>
            </h3>
          </div>
          <button className="detail__close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="apply-modal__body">
          <div className="apply-modal__step">
            <div className="apply-modal__step-num">01</div>
            <div className="apply-modal__step-body">
              <div className="apply-modal__step-title">Copiá esta línea</div>
              <div className="apply-modal__step-sub" style={{ marginBottom: 10 }}>
                Pegala en el campo <em>"How did you hear about us?"</em> o equivalente del form de {role.source}.
              </div>
              <div className="apply-modal__lang">
                <button
                  className={`apply-modal__lang-btn ${lang === 'es' ? 'apply-modal__lang-btn--active' : ''}`}
                  onClick={() => setLang('es')}
                >
                  ES
                </button>
                <button
                  className={`apply-modal__lang-btn ${lang === 'en' ? 'apply-modal__lang-btn--active' : ''}`}
                  onClick={() => setLang('en')}
                >
                  EN
                </button>
              </div>
              <div className="apply-modal__copybox">
                {copy}
                <button
                  className={`apply-modal__copybtn ${copied ? 'apply-modal__copybtn--ok' : ''}`}
                  onClick={onCopy}
                >
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>

          <div className="apply-modal__step" style={{ marginBottom: 0 }}>
            <div className="apply-modal__step-num">02</div>
            <div className="apply-modal__step-body">
              <div className="apply-modal__step-title">Continuá a {role.source}</div>
              <div className="apply-modal__step-sub">
                El link incluye un identificador para que la empresa vea que viniste de Bondy en sus analytics.{' '}
                <strong style={{ color: '#1A1A1A' }}>No compartimos tus datos.</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="apply-modal__foot">
          <button className="apply-modal__skip" onClick={onContinue}>
            Saltar paso
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn--ghost" onClick={onClose}>
            Volver
          </button>
          <button className="btn btn--primary" onClick={onContinue}>
            Continuar a {role.source} →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// SubscribeBanner — sticky bottom bar that nudges signup without
// blocking the page. Dismissible (X). Once dismissed, persists in
// localStorage for 30 days so we don't pester the same person.
//
// Two-step flow:
//   1. email-only (low friction) → POST /api/job-subscribe
//   2. after success, offer optional filter chips (areas/seniority/modality);
//      if the user picks any, PATCH the same email with preferences.
//
// The backend's upsertSubscriber is idempotent: a second POST with the same
// email updates prefs and returns isNew=false, which means the welcome email
// does NOT re-fire. Safe to call twice.
// ─────────────────────────────────────────────────────────────
function SubscribeBanner({ areas = [], modalities = [], seniorities = [], audience = 'candidates' }) {
  const [email, setEmail] = useState('')
  // idle | submitting | pick_filters | saving_filters | done | error | dismissed | hidden
  const [state, setState] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [hpField, setHpField] = useState('')
  const [prefs, setPrefs] = useState({ areas: [], modalities: [], seniorities: [] })

  const isRecruiters = audience === 'recruiters'
  const subscribeSource = isRecruiters ? 'busco-trabajo-recruiters' : 'busco-trabajo'
  const bannerCopy = isRecruiters
    ? 'Los nuevos roles de recruiting/HR en LATAM, un mail cada lunes. Sin spam.'
    : 'Los nuevos roles tech LATAM, un mail cada lunes. Sin spam.'

  // On mount, check if user dismissed recently (or already subscribed).
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('bondy_subscribe_banner_dismissed')
      if (dismissed) {
        const ts = parseInt(dismissed, 10)
        // 30-day cooldown
        if (!Number.isNaN(ts) && Date.now() - ts < 30 * 24 * 60 * 60 * 1000) {
          setState('hidden')
          return
        }
      }
      const subscribed = localStorage.getItem('bondy_subscribed')
      if (subscribed === '1') setState('hidden')
    } catch {}
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem('bondy_subscribe_banner_dismissed', String(Date.now()))
    } catch {}
    setState('dismissed')
    trackEvent('subscribe_banner_dismissed')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (state === 'submitting') return
    setState('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/job-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, preferences: {}, hp_field: hpField, audience }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setErrorMsg(
          data.error === 'invalid_email'
            ? 'Email inválido.'
            : data.error === 'rate_limited'
            ? 'Esperá un minuto y probá de nuevo.'
            : 'Falló. Probá de nuevo.'
        )
        setState('error')
        return
      }
      try {
        localStorage.setItem('bondy_subscribed', '1')
      } catch {}
      trackEvent('newsletter_subscribe', { location: 'sticky_banner', with_preferences: false, audience })
      // Step 2: invite optional preferences. Skip if we have no filter
      // options available (shouldn't happen, but defensive).
      if (areas.length || modalities.length || seniorities.length) {
        setState('pick_filters')
      } else {
        setState('done')
        setTimeout(() => setState('hidden'), 4500)
      }
    } catch {
      setErrorMsg('No pudimos conectar.')
      setState('error')
    }
  }

  const togglePref = (key, value) => {
    setPrefs((p) => {
      const arr = p[key] || []
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
      return { ...p, [key]: next }
    })
  }

  const totalPrefs = prefs.areas.length + prefs.modalities.length + prefs.seniorities.length

  const saveFilters = async () => {
    if (state === 'saving_filters') return
    if (totalPrefs === 0) {
      // Nothing picked — treat as "skip"
      finishWithoutFilters()
      return
    }
    setState('saving_filters')
    setErrorMsg('')
    try {
      const res = await fetch('/api/job-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, preferences: prefs, hp_field: hpField, audience }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setErrorMsg('No pudimos guardar los filtros. Tu suscripción está OK igual.')
        setState('error')
        // Still complete: user IS subscribed, only filters update failed
        setTimeout(() => setState('hidden'), 4500)
        return
      }
      trackEvent('newsletter_preferences_set', {
        location: 'sticky_banner',
        areas: prefs.areas.length,
        modalities: prefs.modalities.length,
        seniorities: prefs.seniorities.length,
        audience,
      })
      setState('done')
      setTimeout(() => setState('hidden'), 4500)
    } catch {
      setErrorMsg('No pudimos guardar los filtros. Tu suscripción está OK igual.')
      setState('error')
      setTimeout(() => setState('hidden'), 4500)
    }
  }

  const finishWithoutFilters = () => {
    trackEvent('newsletter_preferences_skipped', { location: 'sticky_banner' })
    setState('done')
    setTimeout(() => setState('hidden'), 3500)
  }

  if (state === 'hidden' || state === 'dismissed') return null

  // ─── State: pick_filters → show optional chip selector ───
  if (state === 'pick_filters' || state === 'saving_filters') {
    return (
      <div className="subscribe-banner subscribe-banner--filters" role="region" aria-label="Personalizar suscripción">
        <button
          type="button"
          className="subscribe-banner__close"
          onClick={finishWithoutFilters}
          aria-label="Saltar este paso"
          title="Saltar"
        >
          ×
        </button>
        <div className="subscribe-banner__filters-head">
          <span className="subscribe-banner__kicker">✓ Suscripto. Un paso más (opcional)</span>
          <span className="subscribe-banner__msg">
            ¿Querés que te mandemos solo lo que te interesa? Elegí filtros, o saltá y recibí todo.
          </span>
        </div>

        <div className="subscribe-banner__filters-body">
          {areas.length > 0 && (
            <div className="subscribe-banner__filter-group">
              <span className="subscribe-banner__filter-label">Áreas</span>
              <div className="subscribe-banner__chips">
                {areas.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`subscribe-banner__chip ${prefs.areas.includes(a) ? 'is-active' : ''}`}
                    onClick={() => togglePref('areas', a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}
          {seniorities.length > 0 && (
            <div className="subscribe-banner__filter-group">
              <span className="subscribe-banner__filter-label">Seniority</span>
              <div className="subscribe-banner__chips">
                {seniorities.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`subscribe-banner__chip ${prefs.seniorities.includes(s) ? 'is-active' : ''}`}
                    onClick={() => togglePref('seniorities', s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {modalities.length > 0 && (
            <div className="subscribe-banner__filter-group">
              <span className="subscribe-banner__filter-label">Modalidad</span>
              <div className="subscribe-banner__chips">
                {modalities.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`subscribe-banner__chip ${prefs.modalities.includes(m) ? 'is-active' : ''}`}
                    onClick={() => togglePref('modalities', m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="subscribe-banner__filters-foot">
          <button
            type="button"
            className="subscribe-banner__skip"
            onClick={finishWithoutFilters}
            disabled={state === 'saving_filters'}
          >
            Mandame todos
          </button>
          <button
            type="button"
            className="subscribe-banner__submit"
            onClick={saveFilters}
            disabled={state === 'saving_filters'}
          >
            {state === 'saving_filters' ? 'Guardando…' : totalPrefs > 0 ? `Guardar (${totalPrefs})` : 'Guardar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="subscribe-banner" role="region" aria-label="Suscripción al newsletter de Bondy">
      <button
        type="button"
        className="subscribe-banner__close"
        onClick={dismiss}
        aria-label="Cerrar"
        title="Cerrar"
      >
        ×
      </button>

      {state === 'done' ? (
        <div className="subscribe-banner__done">
          <span className="subscribe-banner__kicker">✓ Listo.</span>
          <span className="subscribe-banner__msg">
            Te sumamos. Revisá tu inbox — te mandamos un mail de bienvenida ahora.
          </span>
        </div>
      ) : (
        <>
          <div className="subscribe-banner__copy">
            <span className="subscribe-banner__kicker">📬 Newsletter Bondy</span>
            <span className="subscribe-banner__msg">
              {bannerCopy}
            </span>
          </div>
          <form className="subscribe-banner__form" onSubmit={submit}>
            <input
              type="text"
              name="hp_field"
              tabIndex={-1}
              autoComplete="off"
              value={hpField}
              onChange={(e) => setHpField(e.target.value)}
              style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
              aria-hidden="true"
            />
            <input
              type="email"
              placeholder="tu@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={state === 'submitting'}
              autoComplete="email"
              aria-label="Tu email"
            />
            <button
              type="submit"
              className="subscribe-banner__submit"
              disabled={state === 'submitting' || !email}
            >
              {state === 'submitting' ? '…' : 'Suscribirme'}
            </button>
          </form>
          {state === 'error' && <div className="subscribe-banner__error">{errorMsg}</div>}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SubscribeForm — captures email + optional preferences, posts to
// /api/job-subscribe. Three states: idle → submitting → done | error.
// Preferences stay collapsed until the user clicks "Filtrá lo que recibís".
// ─────────────────────────────────────────────────────────────
function SubscribeForm({ areas, modalities, seniorities, audience = 'candidates' }) {
  const [email, setEmail] = useState('')
  const [showPrefs, setShowPrefs] = useState(false)
  const [prefs, setPrefs] = useState({ areas: [], modalities: [], seniorities: [] })
  const [state, setState] = useState('idle') // idle | submitting | done | error
  const [errorMsg, setErrorMsg] = useState('')
  // Honeypot: hidden field that real users never see. Bots that fill every
  // input get silently dropped server-side.
  const [hpField, setHpField] = useState('')

  const isRecruiters = audience === 'recruiters'

  const togglePref = (key, value) => {
    setPrefs((p) => {
      const arr = p[key]
      return { ...p, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] }
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (state === 'submitting') return
    setState('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/job-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, preferences: prefs, hp_field: hpField, audience }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        const msg =
          data.error === 'invalid_email'
            ? 'Ese email no parece válido.'
            : data.error === 'rate_limited'
            ? 'Probaste varias veces seguidas. Esperá un minuto.'
            : 'Algo falló. Probá de nuevo en un rato.'
        setErrorMsg(msg)
        setState('error')
        return
      }
      trackEvent('newsletter_subscribe', {
        with_preferences: !!(prefs.areas.length || prefs.modalities.length || prefs.seniorities.length),
        areas: prefs.areas.join(',') || '(all)',
        seniorities: prefs.seniorities.join(',') || '(all)',
        modalities: prefs.modalities.join(',') || '(all)',
        audience,
      })
      setState('done')
    } catch {
      setErrorMsg('No pudimos conectar. Revisá tu conexión y probá de nuevo.')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <section className="subscribe subscribe--done">
        <div>
          <h3 className="subscribe__title">
            Listo. <em>Te sumamos.</em>
          </h3>
          <p className="subscribe__sub">
            Vas a recibir el primer mail el lunes que viene a las 10am de Argentina. Si no aparece, fijate en spam y marcalo como “no es spam” — así llega bien las próximas semanas.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="subscribe">
      <div>
        <h3 className="subscribe__title">
          {isRecruiters
            ? <>Recibí los nuevos roles de recruiting/HR <em>cada lunes.</em></>
            : <>Recibí los nuevos roles <em>cada lunes.</em></>
          }
        </h3>
        <p className="subscribe__sub">
          {isRecruiters
            ? 'Un solo mail por semana, los lunes 10am ART, con los roles de recruiting, talent y people ops que entraron en los últimos 7 días. Sin afiliados, sin spam. Cancelás con un click.'
            : 'Un solo mail por semana, los lunes 10am ART, con los roles que entraron en los últimos 7 días. Sin afiliados, sin spam. Cancelás con un click.'
          }
        </p>

        {showPrefs && (
          <div className="subscribe__prefs">
            <PrefRow label="Áreas" options={areas} selected={prefs.areas} onToggle={(v) => togglePref('areas', v)} />
            <PrefRow label="Modalidad" options={modalities} selected={prefs.modalities} onToggle={(v) => togglePref('modalities', v)} />
            <PrefRow label="Seniority" options={seniorities} selected={prefs.seniorities} onToggle={(v) => togglePref('seniorities', v)} />
            <p className="subscribe__prefs-help">
              Si no marcás nada, recibís todos los roles nuevos de la semana.
            </p>
          </div>
        )}

        <button type="button" className="subscribe__toggle" onClick={() => setShowPrefs((v) => !v)}>
          {showPrefs ? '− Ocultar preferencias' : '+ Filtrá lo que recibís (opcional)'}
        </button>
      </div>

      <form className="subscribe__form" onSubmit={submit}>
        {/* Honeypot — hidden from humans, bots fill it and get silently dropped */}
        <input
          type="text"
          name="hp_field"
          tabIndex={-1}
          autoComplete="off"
          value={hpField}
          onChange={(e) => setHpField(e.target.value)}
          style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
          aria-hidden="true"
        />
        <input
          type="email"
          placeholder="tu@email.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state === 'submitting'}
          autoComplete="email"
        />
        <button type="submit" className="btn btn--primary" disabled={state === 'submitting' || !email}>
          {state === 'submitting' ? 'Enviando…' : 'Suscribirme →'}
        </button>
        {state === 'error' && <div className="subscribe__error">{errorMsg}</div>}
      </form>
    </section>
  )
}

function PrefRow({ label, options, selected, onToggle }) {
  return (
    <div className="subscribe__prefs-row">
      <span className="subscribe__prefs-label">{label}</span>
      <div className="subscribe__prefs-chips">
        {options.map((opt) => {
          const active = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              className={`chip ${active ? 'chip--active' : ''}`}
              onClick={() => onToggle(opt)}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function BuscoTrabajoClient({ initialRoles, bondyRoles = [], updateLabel, todayLabel, newToday = 0, areas, modalities, seniorities, sources, locations, languages = [], audience = 'candidates' }) {
  const [roles, setRoles] = useState(initialRoles)
  const [filters, setFilters] = useState({ areas: [], modalities: [], seniorities: [], sources: [], locations: [], languages: [] })
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [applying, setApplying] = useState(null)
  const [sort, setSort] = useState('date')

  // Load saved IDs from localStorage on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bondy_saved_roles') || '[]')
      if (saved.length) {
        setRoles((rs) => rs.map((r) => (saved.includes(r.id) ? { ...r, saved: true } : r)))
      }
    } catch {}
  }, [])

  const filtered = useMemo(() => {
    let r = roles
    if (filters.areas.length) r = r.filter((x) => filters.areas.includes(x.area))
    if (filters.modalities.length) r = r.filter((x) => filters.modalities.includes(x.modality))
    if (filters.seniorities.length) r = r.filter((x) => filters.seniorities.includes(x.seniority))
    if (filters.sources.length) r = r.filter((x) => filters.sources.includes(x.source))
    if (filters.locations.length) r = r.filter((x) => filters.locations.includes(locationBucket(x.location)))
    if (filters.languages.length) {
      // 'Sin detectar' is a label; when the user picks it explicitly, also
      // include rows where language is null (legacy pre-detection).
      r = r.filter((x) => filters.languages.includes(x.language || 'Sin detectar'))
    }
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          x.company.toLowerCase().includes(q) ||
          (x.tags || []).some((t) => t.toLowerCase().includes(q))
      )
    }
    if (sort === 'date') r = [...r].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    if (sort === 'salary') r = [...r].sort((a, b) => (b.salary ? 1 : 0) - (a.salary ? 1 : 0))
    if (sort === 'saved') r = [...r].sort((a, b) => (b.saved ? 1 : 0) - (a.saved ? 1 : 0))
    return r
  }, [roles, filters, search, sort])

  const toggleSave = (id) => {
    setRoles((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, saved: !r.saved } : r))
      try {
        const ids = next.filter((r) => r.saved).map((r) => r.id)
        localStorage.setItem('bondy_saved_roles', JSON.stringify(ids))
      } catch {}
      return next
    })
    if (selected && selected.id === id) setSelected({ ...selected, saved: !selected.saved })
  }

  // ─── Analytics handlers ───────────────────────────────────────
  const handleSelectRole = (role) => {
    if (role) {
      trackEvent('job_card_click', {
        job_id: role.id,
        job_title: role.title,
        company: role.company,
        area: role.area,
        seniority: role.seniority,
        modality: role.modality,
        source: role.source,
        salary_disclosed: !!role.salary,
      })
    }
    setSelected(role)
  }

  const handleApplyClick = (role) => {
    trackEvent('job_apply_click', {
      job_id: role.id,
      job_title: role.title,
      company: role.company,
      source: role.source,
    })
    setApplying(role)
  }

  const handleFiltersChange = (next) => {
    // Track sólo cuando hay cambio real (evitamos ruido de re-renders)
    const changed = Object.keys(next).find((k) => next[k]?.length !== filters[k]?.length)
    if (changed) {
      trackEvent('filter_change', {
        filter_type: changed,
        active_values: (next[changed] || []).join(',') || '(cleared)',
        total_active_filters:
          (next.areas?.length || 0) +
          (next.modalities?.length || 0) +
          (next.seniorities?.length || 0) +
          (next.sources?.length || 0) +
          (next.locations?.length || 0) +
          (next.languages?.length || 0),
      })
    }
    setFilters(next)
  }
  // ──────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = roles.length
    const remote = roles.filter((r) => r.modality === 'Remote').length
    const withSalary = roles.filter((r) => r.salary).length
    const today = roles.filter((r) => r.isNew).length
    return { total, remote, withSalary, today }
  }, [roles])

  const sourcesCount = sources.length
  const anyFilter =
    filters.areas.length ||
    filters.modalities.length ||
    filters.seniorities.length ||
    filters.sources.length ||
    filters.locations.length ||
    filters.languages.length ||
    search

  // Audience-aware copy. Defaults preserve the legacy "candidates" wording so
  // /busco-trabajo stays unchanged. Recruiters get a tightened-up variant.
  const COPY = audience === 'recruiters'
    ? {
        crumb: 'Recursos para Recruiters / Busco Trabajo',
        kicker: 'Bondy · Roles para recruiters',
        h1Line1: 'Roles de recruiting & talent en LATAM,',
        windowText: <>Mostramos solo roles publicados en los <em>últimos 3 días</em></>,
        sub: `Posiciones para recruiters, sourcers, talent acquisition, people ops y talent development. Sin avisos viejos: agregamos avisos de ${sourcesCount} fuentes todos los días y solo dejamos a la vista lo publicado en las últimas 72 horas. Sin login, sin fricción. Curados con el mismo criterio que aplicamos a nuestras búsquedas embebidas.`,
      }
    : {
        crumb: 'Busco Trabajo',
        kicker: 'Bondy · Roles abiertos',
        h1Line1: 'Roles tech en LATAM,',
        windowText: <>Mostramos solo roles publicados en los <em>últimos 3 días</em></>,
        sub: `Sin avisos viejos: agregamos posiciones de ${sourcesCount} fuentes todos los días y solo dejamos a la vista lo publicado en las últimas 72 horas. Volvé mañana, vas a ver otras. Sin login, sin fricción. Curados con el mismo criterio que aplicamos a nuestras búsquedas embebidas — si no pasa nuestro filtro, no lo listamos.`,
      }

  return (
    <div className="bt-root">
      {/* Top bar */}
      <header className="tools-bar">
        <a
          className="tools-bar__brand"
          href="/"
          aria-label="Volver al home de Bondy Tools"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <BondyLogo size={20} />
          <span className="tools-bar__brand-name">BONDY</span>
          <span className="tools-bar__sep">/</span>
          <span className="tools-bar__crumb">{COPY.crumb}</span>
        </a>
        <a
          className="tools-bar__cta"
          href="https://wearebondy.com/es/sumar-perfil?utm_source=tools&utm_medium=busco_trabajo&utm_campaign=sumar_perfil_header&source=tools_busco_trabajo"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('cta_sumar_perfil_click', { location: 'header' })}
        >
          Sumar mi perfil →
        </a>
      </header>

      {/* ─── Bondy's own open roles (hero highlight above the scraped board) ─── */}
      {bondyRoles.length > 0 && (
        <section className="bondy-hero" aria-labelledby="bondy-hero-title">
          <div className="bondy-hero__inner">
            <div className="bondy-hero__kicker">
              <span className="bondy-hero__dot" aria-hidden="true">
                <span className="bondy-hero__dot-ring" />
                <span className="bondy-hero__dot-core" />
              </span>
              <span className="bondy-hero__kicker-text">
                {bondyRoles.length} {bondyRoles.length === 1 ? 'búsqueda activa en Bondy' : 'búsquedas activas en Bondy'}
              </span>
            </div>
            <h2 id="bondy-hero-title" className="bondy-hero__title">
              Roles abiertos en <em>Bondy.</em>
            </h2>
            <p className="bondy-hero__sub">
              Estos son los roles que estamos llenando para nuestros clientes ahora mismo. Proceso acompañado, feedback siempre, sin ATS roto.
            </p>

            <ul className="bondy-hero__chips" aria-label="Roles abiertos en Bondy">
              {bondyRoles.slice(0, 8).map((role) => (
                <li key={role.slug}>
                  <a
                    className="bondy-hero__chip"
                    href={`https://wearebondy.com/es/roles/${role.slug}?utm_source=tools&utm_medium=busco_trabajo&utm_campaign=bondy_roles_hero`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent('bondy_roles_chip_click', { slug: role.slug })}
                  >
                    <span className="bondy-hero__chip-title">{role.title}</span>
                    {role.seniority && (
                      <span className="bondy-hero__chip-sep" aria-hidden="true">·</span>
                    )}
                    {role.seniority && (
                      <span className="bondy-hero__chip-meta">{role.seniority}</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>

            <a
              className="bondy-hero__cta"
              href="https://wearebondy.com/es/roles?utm_source=tools&utm_medium=busco_trabajo&utm_campaign=bondy_roles_hero_cta"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('bondy_roles_cta_click', { location: 'hero' })}
            >
              Ver {bondyRoles.length === 1 ? 'el rol' : `los ${bondyRoles.length} roles`} de Bondy <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className="bondy-hero__divider" role="separator" aria-label="O explorá el listado abierto">
            <span className="bondy-hero__divider-rule" />
            <span className="bondy-hero__divider-text">O explorá el listado abierto · LATAM</span>
            <span className="bondy-hero__divider-rule" />
          </div>
        </section>
      )}

      {/* Hero */}
      <section className="hero">
        <div className="hero__kicker">
          <div className="hero__kicker-rule" />
          <span className="hero__kicker-text">{COPY.kicker}</span>
          {updateLabel && (
            <>
              <span className="hero__kicker-sep">·</span>
              <span className="hero__live">
                <span className="hero__live-dot" aria-hidden="true" />
                Actualizado {updateLabel}
              </span>
            </>
          )}
        </div>
        <h1 className="hero__title">
          {COPY.h1Line1}
          <br />
          actualizados <em>a diario.</em>
        </h1>
        {todayLabel && (
          <div className="hero__today">
            <span className="hero__today-date">Hoy · {todayLabel}</span>
            {newToday > 0 && (
              <>
                <span className="hero__today-sep">·</span>
                <span className="hero__today-count">
                  <em>{newToday}</em> {newToday === 1 ? 'rol nuevo' : 'roles nuevos'} en las últimas 24h
                </span>
              </>
            )}
          </div>
        )}
        <div className="hero__window" aria-label="Ventana de publicación">
          <span className="hero__window-rule" aria-hidden="true" />
          <span className="hero__window-text">
            {COPY.windowText}
          </span>
        </div>
        <p className="hero__sub">
          {COPY.sub}
        </p>
      </section>

      {/* Stats */}
      <section className="stats">
        <div className="stats__cell">
          <div className="stats__num">{stats.total}</div>
          <div className="stats__label">Roles abiertos</div>
        </div>
        <div className="stats__cell">
          <div className="stats__num">
            <em>{stats.remote}</em>
          </div>
          <div className="stats__label">Remotos · LATAM</div>
        </div>
        <div className="stats__cell">
          <div className="stats__num">
            {stats.withSalary}
            <span style={{ fontSize: 18, color: '#7A7874' }}>/{stats.total}</span>
          </div>
          <div className="stats__label">Con salario publicado</div>
        </div>
        <div className="stats__cell">
          <div className="stats__num">
            <em>{stats.today}</em>
          </div>
          <div className="stats__label">Sumados hoy</div>
        </div>
      </section>

      {/* Filters */}
      <FiltersBar
        filters={filters}
        setFilters={handleFiltersChange}
        search={search}
        setSearch={setSearch}
        areas={areas}
        modalities={modalities}
        seniorities={seniorities}
        sources={sources}
        locations={locations}
        languages={languages}
      />

      {/* Result count + sort */}
      <div className="result-bar">
        <div className="result-bar__count">
          <em>{filtered.length}</em> {filtered.length === 1 ? 'rol' : 'roles'}
          {anyFilter ? (
            <span style={{ fontSize: 13, color: '#7A7874', marginLeft: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", fontStyle: 'normal' }}>
              filtrados de {roles.length}
            </span>
          ) : null}
        </div>
        <div className="result-bar__sort">
          <span>Ordenar:</span>
          <span className={`result-bar__sort-link ${sort === 'date' ? 'result-bar__sort-link--active' : ''}`} onClick={() => setSort('date')}>
            Más recientes
          </span>
          <span style={{ color: '#E8E4DE' }}>·</span>
          <span className={`result-bar__sort-link ${sort === 'salary' ? 'result-bar__sort-link--active' : ''}`} onClick={() => setSort('salary')}>
            Con salario
          </span>
          <span style={{ color: '#E8E4DE' }}>·</span>
          <span className={`result-bar__sort-link ${sort === 'saved' ? 'result-bar__sort-link--active' : ''}`} onClick={() => setSort('saved')}>
            Guardados
          </span>
        </div>
      </div>

      {/* List */}
      <main className="list">
        <div className="head-row">
          <div>Fecha</div>
          <div>Título · Empresa</div>
          <div>Modalidad · Ubicación</div>
          <div>Seniority</div>
          <div>Salario</div>
          <div>Área</div>
          <div style={{ textAlign: 'right' }}>Fuente</div>
          <div></div>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: '#7A7874' }}>
            <div style={{ fontFamily: "'BT Special Elite', Georgia, serif", fontSize: 32, color: '#3A3530', marginBottom: 12 }}>
              Sin coincidencias.
            </div>
            <div style={{ fontSize: 13, marginBottom: 24 }}>Ajustá los filtros, o sacá uno y volvé a probar.</div>
            <button
              className="btn btn--ghost"
              onClick={() => {
                setFilters({ areas: [], modalities: [], seniorities: [], sources: [], locations: [], languages: [] })
                setSearch('')
              }}
            >
              Limpiar todos los filtros
            </button>
          </div>
        ) : (
          filtered.map((r) => (
            <Row key={r.id} role={r} selected={selected && selected.id === r.id} onSelect={handleSelectRole} onToggleSave={toggleSave} />
          ))
        )}
      </main>

      {/* Full subscribe form with preferences (bottom of page, for users who want filters) */}
      <SubscribeForm areas={areas} modalities={modalities} seniorities={seniorities} audience={audience} />

      <footer className="bondy-footer">
        <span>© 2026 Bondy Group</span>
        <a
          href="https://wearebondy.com"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('cta_sumar_perfil_click', { location: 'footer' })}
        >
          wearebondy.com ↗
        </a>
      </footer>

      <DetailPanel role={selected} onClose={() => setSelected(null)} onToggleSave={toggleSave} onApply={handleApplyClick} />
      <ApplyModal role={applying} onClose={() => setApplying(null)} />

      {/* Sticky-bottom banner: low-friction email-only signup, dismissible.
          After signup, offers optional filter chips inline (areas/seniority/modality).
          Always rendered last so it overlays everything else. */}
      <SubscribeBanner areas={areas} modalities={modalities} seniorities={seniorities} audience={audience} />
    </div>
  )
}
