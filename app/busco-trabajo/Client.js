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
              <button className="btn btn--ghost" onClick={() => onToggleSave(r.id)}>
                {r.saved ? 'Guardado ★' : 'Guardar ☆'}
              </button>
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
// SubscribeForm — captures email + optional preferences, posts to
// /api/job-subscribe. Three states: idle → submitting → done | error.
// Preferences stay collapsed until the user clicks "Filtrá lo que recibís".
// ─────────────────────────────────────────────────────────────
function SubscribeForm({ areas, modalities, seniorities }) {
  const [email, setEmail] = useState('')
  const [showPrefs, setShowPrefs] = useState(false)
  const [prefs, setPrefs] = useState({ areas: [], modalities: [], seniorities: [] })
  const [state, setState] = useState('idle') // idle | submitting | done | error
  const [errorMsg, setErrorMsg] = useState('')

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
        body: JSON.stringify({ email, preferences: prefs }),
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
          Recibí los nuevos roles <em>cada lunes.</em>
        </h3>
        <p className="subscribe__sub">
          Un solo mail por semana, los lunes 10am ART, con los roles que entraron en los últimos 7 días. Sin afiliados, sin spam. Cancelás con un click.
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

export default function BuscoTrabajoClient({ initialRoles, updateLabel, todayLabel, newToday = 0, areas, modalities, seniorities, sources, locations, languages = [], audience = 'candidates' }) {
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
        <div className="tools-bar__brand">
          <BondyLogo size={20} />
          <span className="tools-bar__brand-name">BONDY</span>
          <span className="tools-bar__sep">/</span>
          <span className="tools-bar__crumb">{COPY.crumb}</span>
        </div>
        <a
          className="tools-bar__cta"
          href="https://wearebondy.com"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('cta_sumar_perfil_click', { location: 'header' })}
        >
          Sumar mi perfil →
        </a>
      </header>

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

      {/* Subscribe — temporarily hidden until Resend account + env vars are set up. Re-enable by uncommenting. */}
      {/* <SubscribeForm areas={areas} modalities={modalities} seniorities={seniorities} /> */}

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
    </div>
  )
}
