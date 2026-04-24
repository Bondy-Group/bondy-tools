'use client'

/**
 * app/culture-quiz/page.tsx
 *
 * Public culture quiz — no auth required.
 * 5-step form that collects lead info + cultural answers and submits
 * to /api/culture-quiz, which inserts into potential_clients.
 *
 * State: plain useState (no React Hook Form). Inline styles matching
 * the bondy-tools editorial aesthetic. RadarChart extracted from
 * components/CulturalFitTab.jsx.
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { mapAnswersToProfile, type QuizAnswers, type CulturalProfile } from '@/lib/culture-quiz-mapping'
import { t, INDUSTRY_KEYS, type Lang } from '@/lib/culture-quiz-i18n'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GREEN    = '#4A8C40'
const BLACK    = '#3A3530'
const OFF_WHITE = '#FEFCF9'
const MID      = '#5A5550'
const LIGHT    = '#7A7874'
const RULE     = '#E8E4DE'
const WHITE    = '#FFFFFF'

const DIMENSION_KEYS = [
  'autonomia', 'teamwork', 'comunicacion', 'ambiguedad',
  'velocidadCalidad', 'misionAlineacion', 'feedbackCultura', 'remoteFirst',
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BondyLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="4"  y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" />
      <rect x="22" y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".18" />
      <rect x="4"  y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".42" />
      <rect x="22" y="22" width="14" height="12" rx="2.5" fill={GREEN} />
    </svg>
  )
}

/** Radar chart — adapted from components/CulturalFitTab.jsx */
function RadarChart({ scores, lang }: { scores: Record<string, number>; lang: Lang }) {
  const dims = DIMENSION_KEYS
  const n = dims.length
  const cx = 160, cy = 160, r = 120

  const getPoint = (i: number, value: number) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    const radius = (value / 10) * r
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    }
  }

  const gridLevels = [2, 4, 6, 8, 10]
  const labelPoints = dims.map((_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    return {
      x: cx + (r + 28) * Math.cos(angle),
      y: cy + (r + 28) * Math.sin(angle),
    }
  })

  const scorePoints = dims.map((key, i) => getPoint(i, scores[key] || 0))
  const polygonPath = scorePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  const gridPaths = gridLevels.map(level => {
    const pts = dims.map((_, i) => getPoint(i, level))
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  })

  return (
    <svg width="360" height="360" viewBox="-20 -20 360 360" style={{ maxWidth: '100%' }}>
      {/* Grid rings */}
      {gridPaths.map((path, i) => (
        <path key={i} d={path} fill="none" stroke={RULE} strokeWidth="1" />
      ))}
      {/* Axis spokes */}
      {dims.map((_, i) => {
        const p = getPoint(i, 10)
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={RULE} strokeWidth="1" />
      })}
      {/* Score polygon */}
      <path d={polygonPath} fill={GREEN} fillOpacity="0.15" stroke={GREEN} strokeWidth="2" />
      {/* Score dots */}
      {scorePoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill={GREEN} />
      ))}
      {/* Labels */}
      {labelPoints.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={p.y}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: '8.5px',
            fill: MID,
            fontFamily: "'Courier Prime', Courier, monospace",
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {t(`dim.${dims[i]}.short`, lang)}
        </text>
      ))}
    </svg>
  )
}

/** Styled text input */
function TextInput({
  label, value, onChange, type = 'text', required = false, placeholder = ''
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: BLACK }}>
        {label}{required && <span style={{ color: GREEN }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: `1px solid ${RULE}`,
          borderRadius: '2px',
          padding: '12px 14px',
          fontSize: '14px',
          fontFamily: "'Courier Prime', Courier, monospace",
          fontWeight: 300,
          color: BLACK,
          background: WHITE,
          outline: 'none',
          transition: 'border-color 0.15s',
          width: '100%',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = GREEN }}
        onBlur={e => { e.currentTarget.style.borderColor = RULE }}
      />
    </div>
  )
}

/** Styled select */
function SelectInput({
  label, value, onChange, options, required = false
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  required?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: BLACK }}>
        {label}{required && <span style={{ color: GREEN }}> *</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          border: `1px solid ${RULE}`,
          borderRadius: '2px',
          padding: '12px 14px',
          fontSize: '14px',
          fontFamily: "'Courier Prime', Courier, monospace",
          fontWeight: 300,
          color: value ? BLACK : MID,
          background: WHITE,
          outline: 'none',
          cursor: 'pointer',
          width: '100%',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888885' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 14px center',
          paddingRight: '36px',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = GREEN }}
        onBlur={e => { e.currentTarget.style.borderColor = RULE }}
      >
        <option value="" disabled>Select…</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

/** Radio-style clickable option cards */
function OptionGroup({
  label, value, onChange, options, required = false
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; hint?: string }[]
  required?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <label className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: BLACK }}>
        {label}{required && <span style={{ color: GREEN }}> *</span>}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {options.map(o => {
          const selected = value === o.value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              style={{
                border: `1px solid ${selected ? GREEN : RULE}`,
                borderRadius: '2px',
                padding: '12px 16px',
                background: selected ? `rgba(224,92,0,0.04)` : WHITE,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => {
                if (!selected) {
                  e.currentTarget.style.borderColor = MID
                }
              }}
              onMouseLeave={e => {
                if (!selected) {
                  e.currentTarget.style.borderColor = RULE
                }
              }}
            >
              {/* Radio dot */}
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%',
                border: `1.5px solid ${selected ? GREEN : LIGHT}`,
                background: selected ? GREEN : 'transparent',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {selected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: WHITE }} />}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: selected ? 400 : 300, color: BLACK, lineHeight: 1.4 }}>
                  {o.label}
                </div>
                {o.hint && (
                  <div style={{ fontSize: '11px', color: MID, marginTop: '2px', fontWeight: 300 }}>
                    {o.hint}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** 1–5 scale selector */
function ScaleInput({
  label, value, onChange, lowLabel, highLabel, required = false
}: {
  label: string
  value: number
  onChange: (v: number) => void
  lowLabel: string
  highLabel: string
  required?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <label className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: BLACK }}>
        {label}{required && <span style={{ color: GREEN }}> *</span>}
      </label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
        {[1, 2, 3, 4, 5].map(n => {
          const selected = value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              style={{
                flex: 1,
                height: '44px',
                border: `1px solid ${selected ? GREEN : RULE}`,
                borderRadius: '2px',
                background: selected ? GREEN : WHITE,
                color: selected ? WHITE : MID,
                fontFamily: "'Courier Prime', Courier, monospace",
                fontSize: '13px',
                fontWeight: selected ? 500 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                if (!selected) e.currentTarget.style.borderColor = MID
              }}
              onMouseLeave={e => {
                if (!selected) e.currentTarget.style.borderColor = RULE
              }}
            >
              {n}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: LIGHT, fontWeight: 300 }}>{lowLabel}</span>
        <span style={{ fontSize: '11px', color: LIGHT, fontWeight: 300 }}>{highLabel}</span>
      </div>
    </div>
  )
}

/** Textarea */
function TextareaInput({
  label, value, onChange, placeholder = '', lang = 'en' as Lang
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  lang?: Lang
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: BLACK }}>
        {label}
        <span style={{ color: LIGHT, marginLeft: '8px', fontWeight: 300, textTransform: 'none', letterSpacing: 0 }}>{t('s4.notes_optional', lang)}</span>
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        style={{
          border: `1px solid ${RULE}`,
          borderRadius: '2px',
          padding: '12px 14px',
          fontSize: '14px',
          fontFamily: "'Courier Prime', Courier, monospace",
          fontWeight: 300,
          color: BLACK,
          background: WHITE,
          outline: 'none',
          resize: 'vertical',
          lineHeight: 1.6,
          width: '100%',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = GREEN }}
        onBlur={e => { e.currentTarget.style.borderColor = RULE }}
      />
    </div>
  )
}

/** Multi-tag industry picker — up to 3, single-pick-per-open flow */
function IndustrySelector({
  values,
  onChange,
  lang,
}: {
  values: string[]
  onChange: (v: string[]) => void
  lang: Lang
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  function selectIndustry(key: string) {
    if (values.includes(key)) return
    onChange([...values, key])
    setOpen(false)
  }

  function removeIndustry(key: string) {
    onChange(values.filter(v => v !== key))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: BLACK }}>
        {t('s1.industry', lang)}
      </label>

      {/* Selected tags */}
      {values.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {values.map(key => (
            <div
              key={key}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(74,140,64,0.08)',
                border: '1px solid rgba(74,140,64,0.3)',
                borderRadius: '2px', padding: '4px 10px',
                fontSize: '12px', color: GREEN,
                fontFamily: "'Courier Prime', Courier, monospace",
              }}
            >
              <span>{t(key, lang)}</span>
              <button
                type="button"
                onClick={() => removeIndustry(key)}
                aria-label={`Remove ${t(key, lang)}`}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: GREEN, padding: 0, lineHeight: 1, fontSize: '15px',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add trigger + dropdown */}
      {values.length < 3 && (
        <div ref={containerRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            style={{
              border: `1px solid ${open ? GREEN : RULE}`,
              borderRadius: '2px',
              padding: '10px 14px',
              fontSize: '13px',
              fontFamily: "'Courier Prime', Courier, monospace",
              fontWeight: 300,
              color: MID,
              background: WHITE,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'border-color 0.15s',
            }}
          >
            <span>{t('s1.industry_add', lang)}</span>
            <span style={{ fontSize: '10px', color: LIGHT }}>▾</span>
          </button>

          {open && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: WHITE,
                border: `1px solid ${RULE}`,
                borderRadius: '2px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                zIndex: 100,
                maxHeight: '240px',
                overflowY: 'auto',
              }}
            >
              {INDUSTRY_KEYS.map((key, idx) => {
                const selected = values.includes(key)
                const isLast = idx === INDUSTRY_KEYS.length - 1
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => !selected && selectIndustry(key)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 14px',
                      fontSize: '13px',
                      fontFamily: "'Courier Prime', Courier, monospace",
                      fontWeight: 300,
                      background: 'none',
                      border: 'none',
                      borderBottom: isLast ? 'none' : `1px solid ${RULE}`,
                      cursor: selected ? 'default' : 'pointer',
                      color: selected ? LIGHT : BLACK,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (!selected) e.currentTarget.style.background = 'rgba(74,140,64,0.05)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'none'
                    }}
                  >
                    {t(key, lang)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Default answers state
// ---------------------------------------------------------------------------

const DEFAULT_ANSWERS: QuizAnswers = {
  // Step 1
  companyName:  '',
  contactName:  '',
  email:        '',
  role:         '',
  companySize:  '',
  industry:     [],
  // Step 2
  autonomyLevel:      3,
  ambiguityHandling:  '',
  speedQuality:       3,
  processStructure:   '',
  // Step 3
  collaborationStyle:       '',
  remoteSetup:              '',
  collaborationImportance:  3,
  communicationMethod:      '',
  // Step 4
  missionImportance: 3,
  feedbackHandling:  '',
  growthStage:       '',
  freeTextNotes:     '',
}

// ---------------------------------------------------------------------------
// Validation per step
// ---------------------------------------------------------------------------

function validateStep(step: number, answers: QuizAnswers, lang: Lang): string[] {
  const errors: string[] = []
  if (step === 1) {
    if (!answers.companyName.trim())  errors.push(t('err.company_name', lang))
    if (!answers.contactName.trim())  errors.push(t('err.contact_name', lang))
    if (!answers.email.trim())        errors.push(t('err.email', lang))
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email)) errors.push(t('err.email_invalid', lang))
    if (!answers.companySize)         errors.push(t('err.company_size', lang))
  }
  if (step === 2) {
    if (!answers.ambiguityHandling)   errors.push(t('err.ambiguity', lang))
    if (!answers.processStructure)    errors.push(t('err.process', lang))
  }
  if (step === 3) {
    if (!answers.collaborationStyle)  errors.push(t('err.collab_style', lang))
    if (!answers.remoteSetup)         errors.push(t('err.remote', lang))
    if (!answers.communicationMethod) errors.push(t('err.comm_method', lang))
  }
  if (step === 4) {
    if (!answers.feedbackHandling)    errors.push(t('err.feedback', lang))
    if (!answers.growthStage)         errors.push(t('err.growth', lang))
  }
  return errors
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CultureQuizPage() {
  const [lang, setLang] = useState<Lang>('en')
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState<QuizAnswers>(DEFAULT_ANSWERS)
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Detect browser language on mount — no SSR mismatch since we init to 'en'
  useEffect(() => {
    if (navigator.language.startsWith('es')) setLang('es')
  }, [])

  const TOTAL_STEPS = 5

  // Live cultural profile preview (computed from answers as user fills in steps 2–4)
  const liveProfile: CulturalProfile | null = useMemo(() => {
    const { ambiguityHandling, processStructure, collaborationStyle, remoteSetup, communicationMethod, feedbackHandling, growthStage } = answers
    if (!ambiguityHandling || !processStructure || !collaborationStyle || !remoteSetup || !communicationMethod || !feedbackHandling || !growthStage) {
      return null
    }
    return mapAnswersToProfile(answers, lang)
  }, [answers, lang])

  // Partial profile for radar preview — uses defaults for unanswered dimensions
  const radarScores = useMemo(() => {
    const defaults: Record<string, number> = {
      autonomia: 5, teamwork: 5, comunicacion: 5, ambiguedad: 5,
      velocidadCalidad: 5, misionAlineacion: 5, feedbackCultura: 5, remoteFirst: 5,
    }
    if (!liveProfile) return defaults
    return Object.fromEntries(
      Object.entries(liveProfile).map(([k, v]) => [k, v.score])
    )
  }, [liveProfile])

  function set<K extends keyof QuizAnswers>(field: K, value: QuizAnswers[K]) {
    setAnswers(prev => ({ ...prev, [field]: value }))
  }

  function goNext() {
    const stepErrors = validateStep(step, answers, lang)
    if (stepErrors.length > 0) {
      setErrors(stepErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setErrors([])
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    setErrors([])
    setStep(s => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit() {
    const stepErrors = validateStep(step, answers, lang)
    if (stepErrors.length > 0) {
      setErrors(stepErrors)
      return
    }
    setErrors([])
    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/culture-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Something went wrong.')
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('err.generic', lang))
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const stepLabel = `${String(step).padStart(2, '0')} / ${String(TOTAL_STEPS).padStart(2, '0')}`

  const stepTitles: Record<number, { num: string; title: string; italic: string }> = {
    1: { num: '01', title: t('step1.title', lang), italic: t('step1.italic', lang) },
    2: { num: '02', title: t('step2.title', lang), italic: t('step2.italic', lang) },
    3: { num: '03', title: t('step3.title', lang), italic: t('step3.italic', lang) },
    4: { num: '04', title: t('step4.title', lang), italic: t('step4.italic', lang) },
    5: { num: '05', title: t('step5.title', lang), italic: t('step5.italic', lang) },
  }

  const current = stepTitles[step]

  // ---------------------------------------------------------------------------
  // Shared layout wrapper
  // ---------------------------------------------------------------------------

  const card = (children: React.ReactNode) => (
    <div style={{
      background: WHITE,
      border: `1px solid ${RULE}`,
      borderRadius: '2px',
      padding: '40px 36px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '28px',
    }}>
      {children}
    </div>
  )

  // ---------------------------------------------------------------------------
  // Success state
  // ---------------------------------------------------------------------------

  if (submitted) {
    return (
      <main style={{ background: OFF_WHITE, minHeight: '100vh' }}>
        <Nav lang={lang} setLang={setLang} />
        <section style={{ maxWidth: '680px', margin: '0 auto', padding: '64px 24px' }}>
          {card(
            <>
              <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: GREEN, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ display: 'block', width: '20px', height: '1px', background: GREEN }} />
                {t('success.badge', lang)}
              </div>
              <h1 className="font-display" style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.02em', color: BLACK }}>
                {t('success.heading', lang)}<br />
                <em style={{ color: GREEN, fontStyle: 'italic' }}>{t('success.heading_em', lang)}</em>
              </h1>
              <p style={{ fontSize: '15px', color: MID, fontWeight: 300, lineHeight: 1.8, maxWidth: '480px' }}>
                {t('success.desc', lang)}
              </p>
              {liveProfile && (
                <>
                  <div style={{ borderTop: `1px solid ${RULE}`, paddingTop: '28px' }}>
                    <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: MID, marginBottom: '20px' }}>
                      {t('success.preview_label', lang)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <RadarChart scores={radarScores} lang={lang} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {Object.entries(liveProfile).map(([key, dim]) => (
                      <div key={key} style={{ borderTop: `1px solid ${RULE}`, paddingTop: '12px' }}>
                        <div className="font-mono-bondy" style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: LIGHT, marginBottom: '4px' }}>
                          {t(`dim.${key}`, lang)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '20px', fontWeight: 700, color: BLACK, fontFamily: "'Courier Prime', Courier, monospace" }}>{dim.score}</span>
                          <span style={{ fontSize: '11px', color: LIGHT, fontWeight: 300 }}>/10</span>
                        </div>
                        <p style={{ fontSize: '11px', color: MID, fontWeight: 300, lineHeight: 1.5 }}>{dim.description}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.1em', color: LIGHT, textTransform: 'uppercase', paddingTop: '12px' }}>
                © {new Date().getFullYear()} Bondy Group · <a href="https://wearebondy.com" target="_blank" rel="noopener noreferrer" style={{ color: LIGHT, textDecoration: 'none' }}>wearebondy.com ↗</a>
              </div>
            </>
          )}
        </section>
      </main>
    )
  }

  // ---------------------------------------------------------------------------
  // Multi-step form
  // ---------------------------------------------------------------------------

  return (
    <main style={{ background: OFF_WHITE, minHeight: '100vh' }}>
      <Nav lang={lang} setLang={setLang} />

      {/* Header */}
      <section style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 24px 0' }}>
        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div className="font-mono-bondy" style={{ fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN }}>
            {stepLabel}
          </div>
          <div style={{ flex: 1, height: '1px', background: RULE }}>
            <div style={{ height: '100%', background: GREEN, width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Step heading */}
        <div className="font-mono-bondy" style={{ fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase', color: GREEN, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ display: 'block', width: '20px', height: '1px', background: GREEN }} />
          {t('header.label', lang)}
        </div>
        <h1 className="font-display" style={{ fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em', color: BLACK, marginBottom: '40px' }}>
          {current.title}<br />
          <em style={{ color: GREEN, fontStyle: 'italic' }}>{current.italic}</em>
        </h1>
      </section>

      {/* Form */}
      <section style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Error banner */}
        {errors.length > 0 && (
          <div style={{ border: `1px solid #FCA5A5`, background: '#FFF5F5', borderRadius: '2px', padding: '16px 20px', marginBottom: '20px' }}>
            {errors.map((e, i) => (
              <p key={i} style={{ fontSize: '13px', color: '#B91C1C', fontWeight: 300, margin: 0, lineHeight: 1.6 }}>
                {e}
              </p>
            ))}
          </div>
        )}

        {/* ---- STEP 1: Company info ---- */}
        {step === 1 && card(
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <TextInput label={t('s1.company_name', lang)} value={answers.companyName} onChange={v => set('companyName', v)} required placeholder={t('s1.ph_company', lang)} />
              <TextInput label={t('s1.your_name', lang)} value={answers.contactName} onChange={v => set('contactName', v)} required placeholder={t('s1.ph_name', lang)} />
            </div>
            <TextInput label={t('s1.work_email', lang)} value={answers.email} onChange={v => set('email', v)} type="email" required placeholder={t('s1.ph_email', lang)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <TextInput label={t('s1.role', lang)} value={answers.role ?? ''} onChange={v => set('role', v)} placeholder={t('s1.ph_role', lang)} />
              <SelectInput
                label={t('s1.company_size', lang)}
                value={answers.companySize}
                onChange={v => set('companySize', v)}
                required
                options={[
                  { value: '1-10',    label: t('s1.size_1_10', lang) },
                  { value: '11-50',   label: t('s1.size_11_50', lang) },
                  { value: '51-200',  label: t('s1.size_51_200', lang) },
                  { value: '200+',    label: t('s1.size_200plus', lang) },
                ]}
              />
            </div>
            <IndustrySelector
              values={(answers.industry as string[]) ?? []}
              onChange={v => set('industry', v as QuizAnswers['industry'])}
              lang={lang}
            />
          </>
        )}

        {/* ---- STEP 2: Work style & autonomy ---- */}
        {step === 2 && card(
          <>
            <ScaleInput
              label={t('s2.autonomy_label', lang)}
              value={answers.autonomyLevel}
              onChange={v => set('autonomyLevel', v)}
              lowLabel={t('s2.autonomy_low', lang)}
              highLabel={t('s2.autonomy_high', lang)}
              required
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup
              label={t('s2.ambiguity_label', lang)}
              value={answers.ambiguityHandling}
              onChange={v => set('ambiguityHandling', v)}
              required
              options={[
                { value: 'wait-for-clarity', label: t('s2.ambiguity_wait', lang) },
                { value: 'ask-then-proceed', label: t('s2.ambiguity_ask', lang), hint: t('s2.ambiguity_ask_hint', lang) },
                { value: 'assume-and-move',  label: t('s2.ambiguity_assume', lang) },
                { value: 'thrive-in-it',     label: t('s2.ambiguity_thrive', lang) },
              ]}
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <ScaleInput
              label={t('s2.speed_label', lang)}
              value={answers.speedQuality}
              onChange={v => set('speedQuality', v)}
              lowLabel={t('s2.speed_low', lang)}
              highLabel={t('s2.speed_high', lang)}
              required
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup
              label={t('s2.process_label', lang)}
              value={answers.processStructure}
              onChange={v => set('processStructure', v)}
              required
              options={[
                { value: 'very-structured', label: t('s2.process_very', lang) },
                { value: 'some-structure',  label: t('s2.process_some', lang) },
                { value: 'mostly-adhoc',    label: t('s2.process_adhoc', lang) },
                { value: 'figure-it-out',   label: t('s2.process_figure', lang) },
              ]}
            />
          </>
        )}

        {/* ---- STEP 3: Team & communication ---- */}
        {step === 3 && card(
          <>
            <OptionGroup
              label={t('s3.collab_label', lang)}
              value={answers.collaborationStyle}
              onChange={v => set('collaborationStyle', v)}
              required
              options={[
                { value: 'async-first', label: t('s3.collab_async', lang), hint: t('s3.collab_async_hint', lang) },
                { value: 'hybrid-mix',  label: t('s3.collab_hybrid', lang), hint: t('s3.collab_hybrid_hint', lang) },
                { value: 'sync-heavy',  label: t('s3.collab_sync', lang), hint: t('s3.collab_sync_hint', lang) },
              ]}
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup
              label={t('s3.remote_label', lang)}
              value={answers.remoteSetup}
              onChange={v => set('remoteSetup', v)}
              required
              options={[
                { value: 'fully-remote',  label: t('s3.remote_fully', lang) },
                { value: 'hybrid',        label: t('s3.remote_hybrid', lang) },
                { value: 'fully-onsite',  label: t('s3.remote_onsite', lang) },
              ]}
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <ScaleInput
              label={t('s3.collab_imp_label', lang)}
              value={answers.collaborationImportance}
              onChange={v => set('collaborationImportance', v)}
              lowLabel={t('s3.collab_imp_low', lang)}
              highLabel={t('s3.collab_imp_high', lang)}
              required
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup
              label={t('s3.comm_label', lang)}
              value={answers.communicationMethod}
              onChange={v => set('communicationMethod', v)}
              required
              options={[
                { value: 'slack-chat',  label: t('s3.comm_slack', lang) },
                { value: 'email',       label: t('s3.comm_email', lang) },
                { value: 'video-calls', label: t('s3.comm_video', lang) },
                { value: 'in-person',   label: t('s3.comm_inperson', lang) },
              ]}
            />
          </>
        )}

        {/* ---- STEP 4: Culture & values ---- */}
        {step === 4 && card(
          <>
            <ScaleInput
              label={t('s4.mission_label', lang)}
              value={answers.missionImportance}
              onChange={v => set('missionImportance', v)}
              lowLabel={t('s4.mission_low', lang)}
              highLabel={t('s4.mission_high', lang)}
              required
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup
              label={t('s4.feedback_label', lang)}
              value={answers.feedbackHandling}
              onChange={v => set('feedbackHandling', v)}
              required
              options={[
                { value: 'direct-frequent',    label: t('s4.feedback_direct', lang), hint: t('s4.feedback_direct_hint', lang) },
                { value: 'structured-reviews', label: t('s4.feedback_structured', lang), hint: t('s4.feedback_structured_hint', lang) },
                { value: 'informal',           label: t('s4.feedback_informal', lang) },
                { value: 'rarely',             label: t('s4.feedback_rarely', lang) },
              ]}
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup
              label={t('s4.growth_label', lang)}
              value={answers.growthStage}
              onChange={v => set('growthStage', v)}
              required
              options={[
                { value: 'early-stage', label: t('s4.growth_early', lang), hint: t('s4.growth_early_hint', lang) },
                { value: 'scaling',     label: t('s4.growth_scaling', lang), hint: t('s4.growth_scaling_hint', lang) },
                { value: 'established', label: t('s4.growth_established', lang), hint: t('s4.growth_established_hint', lang) },
              ]}
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <TextareaInput
              label={t('s4.notes_label', lang)}
              value={answers.freeTextNotes ?? ''}
              onChange={v => set('freeTextNotes', v)}
              placeholder={t('s4.notes_ph', lang)}
              lang={lang}
            />
          </>
        )}

        {/* ---- STEP 5: Summary & submit ---- */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {card(
              <>
                <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: MID }}>
                  {t('s5.preview_label', lang)}
                </div>
                <p style={{ fontSize: '14px', color: MID, fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
                  {answers.companyName
                    ? <>{t('s5.preview_pre', lang)}<strong style={{ fontWeight: 500, color: BLACK }}>{answers.companyName}</strong>{t('s5.preview_post', lang)}</>
                    : t('s5.preview_generic', lang)
                  }
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                  <RadarChart scores={radarScores} lang={lang} />
                </div>
                {liveProfile ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {Object.entries(liveProfile).map(([key, dim]) => (
                      <div key={key} style={{ borderTop: `1px solid ${RULE}`, paddingTop: '14px' }}>
                        <div className="font-mono-bondy" style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: LIGHT, marginBottom: '6px' }}>
                          {t(`dim.${key}`, lang)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '22px', fontWeight: 700, color: BLACK, fontFamily: "'Courier Prime', Courier, monospace" }}>{dim.score}</span>
                          <span style={{ fontSize: '11px', color: LIGHT }}>/10</span>
                        </div>
                        <p style={{ fontSize: '11px', color: MID, fontWeight: 300, lineHeight: 1.5, margin: 0 }}>
                          {dim.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: LIGHT, fontWeight: 300, fontStyle: 'italic' }}>
                    {t('s5.incomplete', lang)}
                  </p>
                )}
              </>
            )}

            {card(
              <>
                <div>
                  <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: MID, marginBottom: '8px' }}>
                    {t('s5.submit_label', lang)}
                  </div>
                  <p style={{ fontSize: '14px', color: MID, fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
                    {t('s5.submit_pre', lang)}
                    <strong style={{ color: BLACK, fontWeight: 400 }}>{answers.email}</strong>
                    {t('s5.submit_post', lang)}
                  </p>
                </div>

                {submitError && (
                  <div style={{ border: '1px solid #FCA5A5', background: '#FFF5F5', borderRadius: '2px', padding: '12px 16px' }}>
                    <p style={{ fontSize: '13px', color: '#B91C1C', margin: 0 }}>{submitError}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    background: submitting ? LIGHT : GREEN,
                    color: WHITE,
                    border: 'none',
                    borderRadius: '2px',
                    padding: '16px 28px',
                    fontSize: '13px',
                    fontFamily: "'Courier Prime', Courier, monospace",
                    fontWeight: 500,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase' as const,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                    alignSelf: 'flex-start',
                  }}
                >
                  {submitting ? t('s5.submitting', lang) : t('s5.submit_btn', lang)}
                </button>
              </>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              className="font-mono-bondy"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '10px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase' as const,
                color: MID,
                cursor: 'pointer',
                padding: '8px 0',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = BLACK }}
              onMouseLeave={e => { e.currentTarget.style.color = MID }}
            >
              {t('nav.back', lang)}
            </button>
          ) : <div />}

          {step < TOTAL_STEPS && (
            <button
              type="button"
              onClick={goNext}
              style={{
                background: GREEN,
                color: WHITE,
                border: 'none',
                borderRadius: '2px',
                padding: '12px 24px',
                fontSize: '12px',
                fontFamily: "'Courier Prime', Courier, monospace",
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              {t('nav.continue', lang)}
            </button>
          )}
        </div>
      </section>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Nav (shared across states)
// ---------------------------------------------------------------------------

function Nav({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <nav style={{
      borderBottom: `1px solid ${RULE}`,
      padding: '18px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: `rgba(249,248,246,0.95)`,
      position: 'sticky' as const,
      top: 0,
      zIndex: 50,
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <BondyLogo size={22} />
        <span className="font-display" style={{ fontSize: '16px', fontWeight: 900, color: BLACK, letterSpacing: '-0.02em' }}>
          BONDY
        </span>
      </div>
      <span className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: LIGHT }}>
        {t('nav.title', lang)}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {(['en', 'es'] as Lang[]).map(l => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className="font-mono-bondy"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '10px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase' as const,
              color: lang === l ? GREEN : LIGHT,
              fontWeight: lang === l ? 500 : 300,
              padding: '4px 2px',
              transition: 'color 0.15s',
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </nav>
  )
}
