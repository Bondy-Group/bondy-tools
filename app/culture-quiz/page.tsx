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

import { useState, useMemo } from 'react'
import { mapAnswersToProfile, type QuizAnswers, type CulturalProfile } from '@/lib/culture-quiz-mapping'

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

const DIMENSION_LABELS: Record<string, string> = {
  autonomia:        'Autonomy / Ownership',
  teamwork:         'Teamwork',
  comunicacion:     'Communication',
  ambiguedad:       'Ambiguity tolerance',
  velocidadCalidad: 'Speed vs. Quality',
  misionAlineacion: 'Mission alignment',
  feedbackCultura:  'Feedback culture',
  remoteFirst:      'Remote-first mindset',
}

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
function RadarChart({ scores }: { scores: Record<string, number> }) {
  const dims = Object.keys(DIMENSION_LABELS)
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

  const shortLabels: Record<string, string> = {
    autonomia:        'Autonomy',
    teamwork:         'Teamwork',
    comunicacion:     'Comms',
    ambiguedad:       'Ambiguity',
    velocidadCalidad: 'Speed',
    misionAlineacion: 'Mission',
    feedbackCultura:  'Feedback',
    remoteFirst:      'Remote',
  }

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
          {shortLabels[dims[i]] ?? dims[i]}
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
  label, value, onChange, placeholder = ''
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: BLACK }}>
        {label}
        <span style={{ color: LIGHT, marginLeft: '8px', fontWeight: 300, textTransform: 'none', letterSpacing: 0 }}>optional</span>
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
  industry:     '',
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

function validateStep(step: number, answers: QuizAnswers): string[] {
  const errors: string[] = []
  if (step === 1) {
    if (!answers.companyName.trim())  errors.push('Company name is required.')
    if (!answers.contactName.trim())  errors.push('Contact name is required.')
    if (!answers.email.trim())        errors.push('Email is required.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email)) errors.push('Please enter a valid email address.')
    if (!answers.companySize)         errors.push('Company size is required.')
  }
  if (step === 2) {
    if (!answers.ambiguityHandling)   errors.push('Please select how your team handles ambiguity.')
    if (!answers.processStructure)    errors.push('Please select how structured your processes are.')
  }
  if (step === 3) {
    if (!answers.collaborationStyle)  errors.push('Please select your primary collaboration style.')
    if (!answers.remoteSetup)         errors.push('Please select your remote work setup.')
    if (!answers.communicationMethod) errors.push('Please select your primary communication method.')
  }
  if (step === 4) {
    if (!answers.feedbackHandling)    errors.push('Please select how your team handles feedback.')
    if (!answers.growthStage)         errors.push('Please select your team\'s growth stage.')
  }
  return errors
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CultureQuizPage() {
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState<QuizAnswers>(DEFAULT_ANSWERS)
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const TOTAL_STEPS = 5

  // Live cultural profile preview (computed from answers as user fills in steps 2–4)
  const liveProfile: CulturalProfile | null = useMemo(() => {
    const { ambiguityHandling, processStructure, collaborationStyle, remoteSetup, communicationMethod, feedbackHandling, growthStage } = answers
    if (!ambiguityHandling || !processStructure || !collaborationStyle || !remoteSetup || !communicationMethod || !feedbackHandling || !growthStage) {
      return null
    }
    return mapAnswersToProfile(answers)
  }, [answers])

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
    const stepErrors = validateStep(step, answers)
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
    const stepErrors = validateStep(step, answers)
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
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const stepLabel = `${String(step).padStart(2, '0')} / ${String(TOTAL_STEPS).padStart(2, '0')}`

  const stepTitles: Record<number, { num: string; title: string; italic: string }> = {
    1: { num: '01', title: 'Your', italic: 'company.' },
    2: { num: '02', title: 'Work style &', italic: 'autonomy.' },
    3: { num: '03', title: 'Team &', italic: 'communication.' },
    4: { num: '04', title: 'Culture &', italic: 'values.' },
    5: { num: '05', title: 'Your cultural', italic: 'profile.' },
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
        <Nav />
        <section style={{ maxWidth: '680px', margin: '0 auto', padding: '64px 24px' }}>
          {card(
            <>
              <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: GREEN, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ display: 'block', width: '20px', height: '1px', background: GREEN }} />
                Profile submitted
              </div>
              <h1 className="font-display" style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.02em', color: BLACK }}>
                We'll be in<br />
                <em style={{ color: GREEN, fontStyle: 'italic' }}>touch soon.</em>
              </h1>
              <p style={{ fontSize: '15px', color: MID, fontWeight: 300, lineHeight: 1.8, maxWidth: '480px' }}>
                Thanks for sharing your team culture with us. We've generated your cultural profile and our team at Bondy will review it and reach out within 24–48 hours.
              </p>
              {liveProfile && (
                <>
                  <div style={{ borderTop: `1px solid ${RULE}`, paddingTop: '28px' }}>
                    <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: MID, marginBottom: '20px' }}>
                      Your cultural profile preview
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <RadarChart scores={radarScores} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {Object.entries(liveProfile).map(([key, dim]) => (
                      <div key={key} style={{ borderTop: `1px solid ${RULE}`, paddingTop: '12px' }}>
                        <div className="font-mono-bondy" style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: LIGHT, marginBottom: '4px' }}>
                          {DIMENSION_LABELS[key]}
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
      <Nav />

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
          Culture Quiz
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
              <TextInput label="Company name" value={answers.companyName} onChange={v => set('companyName', v)} required placeholder="Acme Corp" />
              <TextInput label="Your name" value={answers.contactName} onChange={v => set('contactName', v)} required placeholder="Jane Smith" />
            </div>
            <TextInput label="Work email" value={answers.email} onChange={v => set('email', v)} type="email" required placeholder="jane@acmecorp.com" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <TextInput label="Role / Title" value={answers.role ?? ''} onChange={v => set('role', v)} placeholder="Head of Engineering" />
              <SelectInput
                label="Company size"
                value={answers.companySize}
                onChange={v => set('companySize', v)}
                required
                options={[
                  { value: '1-10', label: '1–10 people' },
                  { value: '11-50', label: '11–50 people' },
                  { value: '51-200', label: '51–200 people' },
                  { value: '200+', label: '200+ people' },
                ]}
              />
            </div>
            <TextInput label="Industry" value={answers.industry ?? ''} onChange={v => set('industry', v)} placeholder="Fintech, SaaS, Healthcare…" />
          </>
        )}

        {/* ---- STEP 2: Work style & autonomy ---- */}
        {step === 2 && card(
          <>
            <ScaleInput
              label="How much autonomy do team members have in making decisions?"
              value={answers.autonomyLevel}
              onChange={v => set('autonomyLevel', v)}
              lowLabel="Very little — decisions go up the chain"
              highLabel="Full autonomy — own decisions end-to-end"
              required
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup
              label="How does your team handle ambiguity or incomplete requirements?"
              value={answers.ambiguityHandling}
              onChange={v => set('ambiguityHandling', v)}
              required
              options={[
                { value: 'wait-for-clarity', label: 'We wait for clarity before moving forward' },
                { value: 'ask-then-proceed', label: 'We ask clarifying questions, then proceed', hint: 'Most common' },
                { value: 'assume-and-move', label: 'We make assumptions and move forward' },
                { value: 'thrive-in-it', label: 'We thrive in ambiguity — it\'s our default state' },
              ]}
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <ScaleInput
              label="What matters more in your team: shipping fast or shipping perfect?"
              value={answers.speedQuality}
              onChange={v => set('speedQuality', v)}
              lowLabel="Quality first — no shortcuts"
              highLabel="Ship fast — iterate in production"
              required
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup
              label="How structured are your processes?"
              value={answers.processStructure}
              onChange={v => set('processStructure', v)}
              required
              options={[
                { value: 'very-structured', label: 'Very structured — documented playbooks and processes' },
                { value: 'some-structure', label: 'Some structure, some flexibility' },
                { value: 'mostly-adhoc', label: 'Mostly ad-hoc — principles over process' },
                { value: 'figure-it-out', label: 'We figure it out as we go' },
              ]}
            />
          </>
        )}

        {/* ---- STEP 3: Team & communication ---- */}
        {step === 3 && card(
          <>
            <OptionGroup
              label="How does your team primarily collaborate?"
              value={answers.collaborationStyle}
              onChange={v => set('collaborationStyle', v)}
              required
              options={[
                { value: 'async-first', label: 'Async-first', hint: 'Slack threads, docs, written updates — minimal meetings' },
                { value: 'hybrid-mix', label: 'Hybrid mix', hint: 'Balance of async and sync' },
                { value: 'sync-heavy', label: 'Sync-heavy', hint: 'Lots of meetings, real-time collaboration' },
              ]}
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup
              label="What's your remote work setup?"
              value={answers.remoteSetup}
              onChange={v => set('remoteSetup', v)}
              required
              options={[
                { value: 'fully-remote', label: 'Fully remote — 100%, no office' },
                { value: 'hybrid', label: 'Hybrid — some office, some remote' },
                { value: 'fully-onsite', label: 'Fully on-site' },
              ]}
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <ScaleInput
              label="How important is team collaboration vs individual contribution?"
              value={answers.collaborationImportance}
              onChange={v => set('collaborationImportance', v)}
              lowLabel="Individual — people own their lane"
              highLabel="Highly collaborative — success is collective"
              required
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup
              label="How do you primarily communicate as a team?"
              value={answers.communicationMethod}
              onChange={v => set('communicationMethod', v)}
              required
              options={[
                { value: 'slack-chat', label: 'Slack / Chat' },
                { value: 'email', label: 'Email' },
                { value: 'video-calls', label: 'Video calls' },
                { value: 'in-person', label: 'In-person' },
              ]}
            />
          </>
        )}

        {/* ---- STEP 4: Culture & values ---- */}
        {step === 4 && card(
          <>
            <ScaleInput
              label="How important is mission / purpose alignment when hiring?"
              value={answers.missionImportance}
              onChange={v => set('missionImportance', v)}
              lowLabel="Secondary — skills and experience come first"
              highLabel="Critical — non-negotiable hiring filter"
              required
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup
              label="How does your team handle feedback?"
              value={answers.feedbackHandling}
              onChange={v => set('feedbackHandling', v)}
              required
              options={[
                { value: 'direct-frequent', label: 'Direct and frequent', hint: 'Candid feedback is normalized at all levels' },
                { value: 'structured-reviews', label: 'Structured reviews', hint: 'Quarterly or annual cycles' },
                { value: 'informal', label: 'Informal and occasional' },
                { value: 'rarely', label: 'We rarely give feedback' },
              ]}
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup
              label="What best describes your team's growth stage?"
              value={answers.growthStage}
              onChange={v => set('growthStage', v)}
              required
              options={[
                { value: 'early-stage', label: 'Early-stage', hint: 'Building from scratch, high uncertainty, small team' },
                { value: 'scaling', label: 'Scaling', hint: 'Growing fast, processes forming, team expanding' },
                { value: 'established', label: 'Established', hint: 'Optimizing a proven model, process-mature' },
              ]}
            />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <TextareaInput
              label="Anything else you'd like us to know about your team culture?"
              value={answers.freeTextNotes ?? ''}
              onChange={v => set('freeTextNotes', v)}
              placeholder="Describe your team's vibe, what makes it unique, or any cultural nuance the questions didn't capture…"
            />
          </>
        )}

        {/* ---- STEP 5: Summary & submit ---- */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {card(
              <>
                <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: MID }}>
                  Cultural profile preview
                </div>
                <p style={{ fontSize: '14px', color: MID, fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
                  Based on your answers, here's a preview of {answers.companyName ? <strong style={{ fontWeight: 500, color: BLACK }}>{answers.companyName}'s</strong> : 'your'} cultural profile across the 8 Bondy dimensions.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                  <RadarChart scores={radarScores} />
                </div>
                {liveProfile ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {Object.entries(liveProfile).map(([key, dim]) => (
                      <div key={key} style={{ borderTop: `1px solid ${RULE}`, paddingTop: '14px' }}>
                        <div className="font-mono-bondy" style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: LIGHT, marginBottom: '6px' }}>
                          {DIMENSION_LABELS[key]}
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
                    Complete all previous steps to see your full profile.
                  </p>
                )}
              </>
            )}

            {/* Confirm & submit card */}
            {card(
              <>
                <div>
                  <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: MID, marginBottom: '8px' }}>
                    Ready to submit
                  </div>
                  <p style={{ fontSize: '14px', color: MID, fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
                    Bondy will review your cultural profile and reach out at <strong style={{ color: BLACK, fontWeight: 400 }}>{answers.email}</strong> within 24–48 hours.
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
                  {submitting ? 'Submitting…' : 'Get my culture profile →'}
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
              ← Back
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
              Continue →
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

function Nav() {
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
        Culture Quiz
      </span>
    </nav>
  )
}
