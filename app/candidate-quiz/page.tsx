'use client'

import { useState, useMemo, useEffect } from 'react'
import { mapCandidateAnswersToProfile, type CandidateQuizAnswers } from '@/lib/candidate-quiz-mapping'
import { t, type Lang } from '@/lib/candidate-quiz-i18n'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GREEN     = '#4A8C40'
const BLACK     = '#3A3530'
const OFF_WHITE = '#FEFCF9'
const MID       = '#5A5550'
const LIGHT     = '#7A7874'
const RULE      = '#E8E4DE'
const WHITE     = '#FFFFFF'

const DIMENSION_KEYS = [
  'autonomia', 'teamwork', 'comunicacion', 'ambiguedad',
  'velocidadCalidad', 'misionAlineacion', 'feedbackCultura', 'remoteFirst',
]

// ---------------------------------------------------------------------------
// Sub-components (identical styling to /culture-quiz)
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

function RadarChart({ scores, lang }: { scores: Record<string, number>; lang: Lang }) {
  const n = DIMENSION_KEYS.length
  const cx = 160, cy = 160, r = 120

  const getPoint = (i: number, value: number) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    const radius = (value / 10) * r
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
  }

  const gridLevels = [2, 4, 6, 8, 10]
  const labelPoints = DIMENSION_KEYS.map((_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    return { x: cx + (r + 28) * Math.cos(angle), y: cy + (r + 28) * Math.sin(angle) }
  })
  const scorePoints = DIMENSION_KEYS.map((key, i) => getPoint(i, scores[key] || 0))
  const polygonPath = scorePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  const gridPaths   = gridLevels.map(level => {
    const pts = DIMENSION_KEYS.map((_, i) => getPoint(i, level))
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  })

  return (
    <svg width="360" height="360" viewBox="-20 -20 360 360" style={{ maxWidth: '100%' }}>
      {gridPaths.map((path, i) => <path key={i} d={path} fill="none" stroke={RULE} strokeWidth="1" />)}
      {DIMENSION_KEYS.map((_, i) => {
        const p = getPoint(i, 10)
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={RULE} strokeWidth="1" />
      })}
      <path d={polygonPath} fill={GREEN} fillOpacity="0.15" stroke={GREEN} strokeWidth="2" />
      {scorePoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill={GREEN} />)}
      {labelPoints.map((p, i) => (
        <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize: '8.5px', fill: MID, fontFamily: "'Courier Prime', Courier, monospace", textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {t(`dim.${DIMENSION_KEYS[i]}.short`, lang)}
        </text>
      ))}
    </svg>
  )
}

function TextInput({ label, value, onChange, type = 'text', required = false, placeholder = '' }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; required?: boolean; placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: BLACK }}>
        {label}{required && <span style={{ color: GREEN }}> *</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ border: `1px solid ${RULE}`, borderRadius: '2px', padding: '12px 14px', fontSize: '14px', fontFamily: "'Courier Prime', Courier, monospace", fontWeight: 300, color: BLACK, background: WHITE, outline: 'none', transition: 'border-color 0.15s', width: '100%' }}
        onFocus={e => { e.currentTarget.style.borderColor = GREEN }}
        onBlur={e =>  { e.currentTarget.style.borderColor = RULE }}
      />
    </div>
  )
}

function NumberInput({ label, value, onChange, placeholder = '' }: {
  label: string; value: number | undefined; onChange: (v: number | undefined) => void; placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: BLACK }}>
        {label}
      </label>
      <input type="number" min={0} max={60}
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        placeholder={placeholder}
        style={{ border: `1px solid ${RULE}`, borderRadius: '2px', padding: '12px 14px', fontSize: '14px', fontFamily: "'Courier Prime', Courier, monospace", fontWeight: 300, color: BLACK, background: WHITE, outline: 'none', transition: 'border-color 0.15s', width: '100%' }}
        onFocus={e => { e.currentTarget.style.borderColor = GREEN }}
        onBlur={e =>  { e.currentTarget.style.borderColor = RULE }}
      />
    </div>
  )
}

function OptionGroup({ label, value, onChange, options, required = false }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string; hint?: string }[]; required?: boolean
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
            <button key={o.value} type="button" onClick={() => onChange(o.value)}
              style={{ border: `1px solid ${selected ? GREEN : RULE}`, borderRadius: '2px', padding: '12px 16px', background: selected ? 'rgba(74,140,64,0.04)' : WHITE, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', transition: 'border-color 0.15s, background 0.15s' }}
              onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = MID }}
              onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = RULE }}
            >
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `1.5px solid ${selected ? GREEN : LIGHT}`, background: selected ? GREEN : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: WHITE }} />}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: selected ? 400 : 300, color: BLACK, lineHeight: 1.4 }}>{o.label}</div>
                {o.hint && <div style={{ fontSize: '11px', color: MID, marginTop: '2px', fontWeight: 300 }}>{o.hint}</div>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ScaleInput({ label, value, onChange, lowLabel, highLabel, required = false }: {
  label: string; value: number; onChange: (v: number) => void
  lowLabel: string; highLabel: string; required?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <label className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: BLACK }}>
        {label}{required && <span style={{ color: GREEN }}> *</span>}
      </label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map(n => {
          const selected = value === n
          return (
            <button key={n} type="button" onClick={() => onChange(n)}
              style={{ flex: 1, height: '44px', border: `1px solid ${selected ? GREEN : RULE}`, borderRadius: '2px', background: selected ? GREEN : WHITE, color: selected ? WHITE : MID, fontFamily: "'Courier Prime', Courier, monospace", fontSize: '13px', fontWeight: selected ? 500 : 400, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = MID }}
              onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = RULE }}
            >{n}</button>
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

function TextareaInput({ label, value, onChange, placeholder = '', optional = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; optional?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: BLACK }}>
        {label}
        {optional && <span style={{ color: LIGHT, marginLeft: '8px', fontWeight: 300, textTransform: 'none', letterSpacing: 0, fontSize: '10px' }}>optional</span>}
      </label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4}
        style={{ border: `1px solid ${RULE}`, borderRadius: '2px', padding: '12px 14px', fontSize: '14px', fontFamily: "'Courier Prime', Courier, monospace", fontWeight: 300, color: BLACK, background: WHITE, outline: 'none', resize: 'vertical', lineHeight: 1.6, width: '100%' }}
        onFocus={e => { e.currentTarget.style.borderColor = GREEN }}
        onBlur={e =>  { e.currentTarget.style.borderColor = RULE }}
      />
    </div>
  )
}

function LinkedInButton({ onPrefill, lang }: { onPrefill: (name: string, email: string) => void; lang: Lang }) {
  const [status, setStatus] = useState<'idle' | 'waiting' | 'done'>('idle')

  function handleClick() {
    setStatus('waiting')
    const popup = window.open('/api/linkedin-oauth/start', 'linkedin-oauth', 'width=600,height=700,scrollbars=yes')

    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'linkedin-prefill') {
        onPrefill(event.data.name ?? '', event.data.email ?? '')
        setStatus('done')
        window.removeEventListener('message', handleMessage)
      } else if (event.data?.type === 'linkedin-error') {
        setStatus('idle')
        window.removeEventListener('message', handleMessage)
      }
    }
    window.addEventListener('message', handleMessage)

    const interval = setInterval(() => {
      if (popup?.closed) {
        clearInterval(interval)
        window.removeEventListener('message', handleMessage)
        setStatus(s => s === 'waiting' ? 'idle' : s)
      }
    }, 500)
  }

  if (status === 'done') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(74,140,64,0.06)', border: `1px solid rgba(74,140,64,0.25)`, borderRadius: '2px' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill={GREEN}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        <span style={{ fontSize: '13px', color: GREEN, fontFamily: "'Courier Prime', Courier, monospace" }}>{t('s1.prefilled', lang)}</span>
      </div>
    )
  }

  return (
    <button type="button" onClick={handleClick} disabled={status === 'waiting'}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', border: `1px solid ${RULE}`, borderRadius: '2px', padding: '12px 16px', background: WHITE, cursor: status === 'waiting' ? 'wait' : 'pointer', transition: 'border-color 0.15s', width: '100%' }}
      onMouseEnter={e => { if (status === 'idle') e.currentTarget.style.borderColor = '#0A66C2' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = RULE }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      <span style={{ fontSize: '13px', fontFamily: "'Courier Prime', Courier, monospace", fontWeight: 400, color: BLACK }}>
        {status === 'waiting' ? t('s1.prefilling', lang) : t('s1.prefill_btn', lang)}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Default answers & validation
// ---------------------------------------------------------------------------

const DEFAULT_ANSWERS: CandidateQuizAnswers = {
  name: '', email: '', linkedinUrl: '', jobTitle: '', yearsOfExperience: undefined, location: '',
  autonomyPreference: 3, ambiguityHandling: '', speedQuality: 3, processPreference: '',
  collaborationStyle: '', remotePreference: '', collaborationImportance: 3, communicationMethod: '',
  missionImportance: 3, feedbackPreference: '', environmentType: '', freeTextNotes: '',
}

function validateStep(step: number, answers: CandidateQuizAnswers, lang: Lang): string[] {
  const errors: string[] = []
  if (step === 1) {
    if (!answers.name.trim())  errors.push(t('err.name', lang))
    if (!answers.email.trim()) errors.push(t('err.email', lang))
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email)) errors.push(t('err.email_invalid', lang))
  }
  if (step === 2) {
    if (!answers.ambiguityHandling) errors.push(t('err.ambiguity', lang))
    if (!answers.processPreference) errors.push(t('err.process', lang))
  }
  if (step === 3) {
    if (!answers.collaborationStyle)  errors.push(t('err.collab_style', lang))
    if (!answers.remotePreference)    errors.push(t('err.remote', lang))
    if (!answers.communicationMethod) errors.push(t('err.comm_method', lang))
  }
  if (step === 4) {
    if (!answers.feedbackPreference) errors.push(t('err.feedback', lang))
    if (!answers.environmentType)    errors.push(t('err.env_type', lang))
  }
  return errors
}

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------

function Nav({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <nav style={{ borderBottom: `1px solid ${RULE}`, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(249,248,246,0.95)', position: 'sticky' as const, top: 0, zIndex: 50, backdropFilter: 'blur(8px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <BondyLogo size={22} />
        <span className="font-display" style={{ fontSize: '16px', fontWeight: 900, color: BLACK, letterSpacing: '-0.02em' }}>BONDY</span>
      </div>
      <span className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: LIGHT }}>{t('nav.title', lang)}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {(['en', 'es'] as Lang[]).map(l => (
          <button key={l} type="button" onClick={() => setLang(l)} className="font-mono-bondy"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: lang === l ? GREEN : LIGHT, fontWeight: lang === l ? 500 : 300, padding: '4px 2px', transition: 'color 0.15s' }}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CandidateQuizPage() {
  const [lang, setLang]           = useState<Lang>('en')
  const [step, setStep]           = useState(1)
  const [answers, setAnswers]     = useState<CandidateQuizAnswers>(DEFAULT_ANSWERS)
  const [errors, setErrors]       = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (navigator.language.startsWith('es')) setLang('es')
  }, [])

  const TOTAL_STEPS = 5

  const liveProfile = useMemo(() => {
    const { ambiguityHandling, processPreference, collaborationStyle, remotePreference, communicationMethod, feedbackPreference, environmentType } = answers
    if (!ambiguityHandling || !processPreference || !collaborationStyle || !remotePreference || !communicationMethod || !feedbackPreference || !environmentType) return null
    return mapCandidateAnswersToProfile(answers, lang)
  }, [answers, lang])

  const radarScores = useMemo(() => {
    const defaults: Record<string, number> = { autonomia: 5, teamwork: 5, comunicacion: 5, ambiguedad: 5, velocidadCalidad: 5, misionAlineacion: 5, feedbackCultura: 5, remoteFirst: 5 }
    if (!liveProfile) return defaults
    return Object.fromEntries(Object.entries(liveProfile).map(([k, v]) => [k, v.score]))
  }, [liveProfile])

  function set<K extends keyof CandidateQuizAnswers>(field: K, value: CandidateQuizAnswers[K]) {
    setAnswers(prev => ({ ...prev, [field]: value }))
  }

  function goNext() {
    const errs = validateStep(step, answers, lang)
    if (errs.length > 0) { setErrors(errs); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
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
    const errs = validateStep(step, answers, lang)
    if (errs.length > 0) { setErrors(errs); return }
    setErrors([])
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res  = await fetch('/api/candidate-quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(answers) })
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

  const stepLabel = `${String(step).padStart(2, '0')} / ${String(TOTAL_STEPS).padStart(2, '0')}`
  const stepTitles: Record<number, { title: string; italic: string }> = {
    1: { title: t('step1.title', lang), italic: t('step1.italic', lang) },
    2: { title: t('step2.title', lang), italic: t('step2.italic', lang) },
    3: { title: t('step3.title', lang), italic: t('step3.italic', lang) },
    4: { title: t('step4.title', lang), italic: t('step4.italic', lang) },
    5: { title: t('step5.title', lang), italic: t('step5.italic', lang) },
  }
  const current = stepTitles[step]

  const card = (children: React.ReactNode) => (
    <div style={{ background: WHITE, border: `1px solid ${RULE}`, borderRadius: '2px', padding: '40px 36px', display: 'flex', flexDirection: 'column' as const, gap: '28px' }}>
      {children}
    </div>
  )

  // ---- Success state ----
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
              <p style={{ fontSize: '15px', color: MID, fontWeight: 300, lineHeight: 1.8, maxWidth: '480px' }}>{t('success.desc', lang)}</p>
              {liveProfile && (
                <>
                  <div style={{ borderTop: `1px solid ${RULE}`, paddingTop: '28px' }}>
                    <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: MID, marginBottom: '20px' }}>{t('success.preview_label', lang)}</div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}><RadarChart scores={radarScores} lang={lang} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {Object.entries(liveProfile).map(([key, dim]) => (
                      <div key={key} style={{ borderTop: `1px solid ${RULE}`, paddingTop: '12px' }}>
                        <div className="font-mono-bondy" style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: LIGHT, marginBottom: '4px' }}>{t(`dim.${key}`, lang)}</div>
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

  // ---- Multi-step form ----
  return (
    <main style={{ background: OFF_WHITE, minHeight: '100vh' }}>
      <Nav lang={lang} setLang={setLang} />

      {/* Header */}
      <section style={{ maxWidth: '680px', margin: '0 auto', padding: '48px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div className="font-mono-bondy" style={{ fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN }}>{stepLabel}</div>
          <div style={{ flex: 1, height: '1px', background: RULE }}>
            <div style={{ height: '100%', background: GREEN, width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>
        <div className="font-mono-bondy" style={{ fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase', color: GREEN, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ display: 'block', width: '20px', height: '1px', background: GREEN }} />
          {t('header.label', lang)}
        </div>
        <h1 className="font-display" style={{ fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em', color: BLACK, marginBottom: '40px' }}>
          {current.title}<br /><em style={{ color: GREEN, fontStyle: 'italic' }}>{current.italic}</em>
        </h1>
      </section>

      {/* Form */}
      <section style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Error banner */}
        {errors.length > 0 && (
          <div style={{ border: '1px solid #FCA5A5', background: '#FFF5F5', borderRadius: '2px', padding: '16px 20px', marginBottom: '20px' }}>
            {errors.map((e, i) => <p key={i} style={{ fontSize: '13px', color: '#B91C1C', fontWeight: 300, margin: 0, lineHeight: 1.6 }}>{e}</p>)}
          </div>
        )}

        {/* ---- STEP 1: Personal info ---- */}
        {step === 1 && card(
          <>
            <LinkedInButton lang={lang} onPrefill={(name, email) => { set('name', name); set('email', email) }} />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <TextInput label={t('s1.name', lang)} value={answers.name} onChange={v => set('name', v)} required placeholder={t('s1.ph_name', lang)} />
              <TextInput label={t('s1.email', lang)} value={answers.email} onChange={v => set('email', v)} type="email" required placeholder={t('s1.ph_email', lang)} />
            </div>
            <TextInput label={t('s1.linkedin_url', lang)} value={answers.linkedinUrl ?? ''} onChange={v => set('linkedinUrl', v)} placeholder={t('s1.ph_linkedin', lang)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <TextInput label={t('s1.job_title', lang)} value={answers.jobTitle ?? ''} onChange={v => set('jobTitle', v)} placeholder={t('s1.ph_job_title', lang)} />
              <NumberInput label={t('s1.years_exp', lang)} value={answers.yearsOfExperience} onChange={v => set('yearsOfExperience', v)} placeholder="3" />
            </div>
            <TextInput label={t('s1.location', lang)} value={answers.location ?? ''} onChange={v => set('location', v)} placeholder={t('s1.ph_location', lang)} />
          </>
        )}

        {/* ---- STEP 2: Work style & autonomy ---- */}
        {step === 2 && card(
          <>
            <ScaleInput label={t('s2.autonomy_label', lang)} value={answers.autonomyPreference} onChange={v => set('autonomyPreference', v)} lowLabel={t('s2.autonomy_low', lang)} highLabel={t('s2.autonomy_high', lang)} required />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup label={t('s2.ambiguity_label', lang)} value={answers.ambiguityHandling} onChange={v => set('ambiguityHandling', v)} required options={[
              { value: 'wait-for-clarity', label: t('s2.ambiguity_wait', lang) },
              { value: 'ask-then-proceed', label: t('s2.ambiguity_ask', lang), hint: t('s2.ambiguity_ask_hint', lang) },
              { value: 'assume-and-move',  label: t('s2.ambiguity_assume', lang) },
              { value: 'thrive-in-it',     label: t('s2.ambiguity_thrive', lang) },
            ]} />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <ScaleInput label={t('s2.speed_label', lang)} value={answers.speedQuality} onChange={v => set('speedQuality', v)} lowLabel={t('s2.speed_low', lang)} highLabel={t('s2.speed_high', lang)} required />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup label={t('s2.process_label', lang)} value={answers.processPreference} onChange={v => set('processPreference', v)} required options={[
              { value: 'very-structured', label: t('s2.process_very', lang) },
              { value: 'some-structure',  label: t('s2.process_some', lang) },
              { value: 'mostly-adhoc',    label: t('s2.process_adhoc', lang) },
              { value: 'figure-it-out',   label: t('s2.process_figure', lang) },
            ]} />
          </>
        )}

        {/* ---- STEP 3: Collaboration & communication ---- */}
        {step === 3 && card(
          <>
            <OptionGroup label={t('s3.collab_label', lang)} value={answers.collaborationStyle} onChange={v => set('collaborationStyle', v)} required options={[
              { value: 'async-first', label: t('s3.collab_async', lang), hint: t('s3.collab_async_hint', lang) },
              { value: 'hybrid-mix',  label: t('s3.collab_hybrid', lang), hint: t('s3.collab_hybrid_hint', lang) },
              { value: 'sync-heavy',  label: t('s3.collab_sync', lang), hint: t('s3.collab_sync_hint', lang) },
            ]} />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup label={t('s3.remote_label', lang)} value={answers.remotePreference} onChange={v => set('remotePreference', v)} required options={[
              { value: 'fully-remote',  label: t('s3.remote_fully', lang) },
              { value: 'hybrid',        label: t('s3.remote_hybrid', lang) },
              { value: 'fully-onsite',  label: t('s3.remote_onsite', lang) },
            ]} />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <ScaleInput label={t('s3.collab_imp_label', lang)} value={answers.collaborationImportance} onChange={v => set('collaborationImportance', v)} lowLabel={t('s3.collab_imp_low', lang)} highLabel={t('s3.collab_imp_high', lang)} required />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup label={t('s3.comm_label', lang)} value={answers.communicationMethod} onChange={v => set('communicationMethod', v)} required options={[
              { value: 'slack-chat',  label: t('s3.comm_slack', lang) },
              { value: 'email',       label: t('s3.comm_email', lang) },
              { value: 'video-calls', label: t('s3.comm_video', lang) },
              { value: 'in-person',   label: t('s3.comm_inperson', lang) },
            ]} />
          </>
        )}

        {/* ---- STEP 4: Values & culture fit ---- */}
        {step === 4 && card(
          <>
            <ScaleInput label={t('s4.mission_label', lang)} value={answers.missionImportance} onChange={v => set('missionImportance', v)} lowLabel={t('s4.mission_low', lang)} highLabel={t('s4.mission_high', lang)} required />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup label={t('s4.feedback_label', lang)} value={answers.feedbackPreference} onChange={v => set('feedbackPreference', v)} required options={[
              { value: 'direct-frequent',    label: t('s4.feedback_direct', lang), hint: t('s4.feedback_direct_hint', lang) },
              { value: 'structured-reviews', label: t('s4.feedback_structured', lang), hint: t('s4.feedback_structured_hint', lang) },
              { value: 'informal',           label: t('s4.feedback_informal', lang) },
              { value: 'rarely',             label: t('s4.feedback_rarely', lang) },
            ]} />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <OptionGroup label={t('s4.env_label', lang)} value={answers.environmentType} onChange={v => set('environmentType', v)} required options={[
              { value: 'early-stage', label: t('s4.env_early', lang), hint: t('s4.env_early_hint', lang) },
              { value: 'scaling',     label: t('s4.env_scaling', lang), hint: t('s4.env_scaling_hint', lang) },
              { value: 'established', label: t('s4.env_established', lang), hint: t('s4.env_established_hint', lang) },
            ]} />
            <div style={{ borderTop: `1px solid ${RULE}` }} />
            <TextareaInput label={t('s4.notes_label', lang)} value={answers.freeTextNotes ?? ''} onChange={v => set('freeTextNotes', v)} placeholder={t('s4.notes_ph', lang)} optional />
          </>
        )}

        {/* ---- STEP 5: Cultural profile preview + submit ---- */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {card(
              <>
                <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: MID }}>{t('s5.preview_label', lang)}</div>
                <p style={{ fontSize: '14px', color: MID, fontWeight: 300, lineHeight: 1.7, margin: 0 }}>{t('s5.preview_desc', lang)}</p>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                  <RadarChart scores={radarScores} lang={lang} />
                </div>
                {liveProfile ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {Object.entries(liveProfile).map(([key, dim]) => (
                      <div key={key} style={{ borderTop: `1px solid ${RULE}`, paddingTop: '14px' }}>
                        <div className="font-mono-bondy" style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: LIGHT, marginBottom: '6px' }}>{t(`dim.${key}`, lang)}</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '22px', fontWeight: 700, color: BLACK, fontFamily: "'Courier Prime', Courier, monospace" }}>{dim.score}</span>
                          <span style={{ fontSize: '11px', color: LIGHT }}>/10</span>
                        </div>
                        <p style={{ fontSize: '11px', color: MID, fontWeight: 300, lineHeight: 1.5, margin: 0 }}>{dim.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: LIGHT, fontWeight: 300, fontStyle: 'italic' }}>{t('s5.incomplete', lang)}</p>
                )}
              </>
            )}

            {card(
              <>
                <div>
                  <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: MID, marginBottom: '8px' }}>{t('s5.submit_label', lang)}</div>
                  <p style={{ fontSize: '14px', color: MID, fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
                    {t('s5.submit_pre', lang)}<strong style={{ color: BLACK, fontWeight: 400 }}>{answers.email}</strong>{t('s5.submit_post', lang)}
                  </p>
                </div>
                {submitError && (
                  <div style={{ border: '1px solid #FCA5A5', background: '#FFF5F5', borderRadius: '2px', padding: '12px 16px' }}>
                    <p style={{ fontSize: '13px', color: '#B91C1C', margin: 0 }}>{submitError}</p>
                  </div>
                )}
                <button type="button" onClick={handleSubmit} disabled={submitting}
                  style={{ background: submitting ? LIGHT : GREEN, color: WHITE, border: 'none', borderRadius: '2px', padding: '16px 28px', fontSize: '13px', fontFamily: "'Courier Prime', Courier, monospace", fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' as const, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.2s', alignSelf: 'flex-start' }}>
                  {submitting ? t('s5.submitting', lang) : t('s5.submit_btn', lang)}
                </button>
              </>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
          {step > 1 ? (
            <button type="button" onClick={goBack} className="font-mono-bondy"
              style={{ background: 'none', border: 'none', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: MID, cursor: 'pointer', padding: '8px 0' }}
              onMouseEnter={e => { e.currentTarget.style.color = BLACK }}
              onMouseLeave={e => { e.currentTarget.style.color = MID }}>
              {t('nav.back', lang)}
            </button>
          ) : <div />}
          {step < TOTAL_STEPS && (
            <button type="button" onClick={goNext}
              style={{ background: GREEN, color: WHITE, border: 'none', borderRadius: '2px', padding: '12px 24px', fontSize: '12px', fontFamily: "'Courier Prime', Courier, monospace", fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' as const, cursor: 'pointer', transition: 'opacity 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
              {t('nav.continue', lang)}
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
