'use client'

/* ═══════════════════════════════════════════════════════════════════
   Sesiones de Carrera — card + flujo de solicitud
   Se monta en /busco-trabajo y /recursos-recruiters.

   La card usa el sistema .btl-card de globals.css (esquina verde, línea
   interna, sombra — todo viene del CSS). A diferencia de las otras cards
   no es un link: abre un overlay con vista expandida → formulario → ok.

   Props:
     pagina : 'busco-trabajo' | 'recursos-recruiters'  → copy + pagina_origen
     lang   : 'es' | 'en'
     num    : string  (número de card, ej '07')
   ═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react'

const GREEN = '#4A8C40'
const INK = '#1A1A1A'
const INK_MID = '#3A3530'
const INK_SUB = '#5A5550'
const FAINT = '#7A7874'
const RULE = '#E8E4DE'
const CREAM = '#FEFCF9'
const DISPLAY = "'Special Elite', Georgia, serif"
const MONO = "'Courier Prime', 'Courier New', monospace"

// product → label key (el VALUE enviado al backend va siempre en español)
const PRODUCTS = [
  { value: 'Exprés', es: 'Exprés', en: 'Exprés', meta_es: '1 sesión · 60 min', meta_en: '1 session · 60 min', precioOriginal: 'USD 90–110', precio: 'USD 45–55' },
  { value: 'Plan de Carrera', es: 'Plan de Carrera', en: 'Career Plan', meta_es: '3 sesiones · 60 min c/u', meta_en: '3 sessions · 60 min each', precioOriginal: 'USD 270–320', precio: 'USD 135–160' },
  { value: 'Todavía no sé', es: 'Todavía no sé', en: 'Not sure yet', meta_es: '', meta_en: '', precioOriginal: null, precio: null },
]

const CONSULTORAS = [
  { value: 'Mara', name: 'Mara Schmitman', role_es: 'Founder · Bondy', role_en: 'Founder · Bondy', linkedin: 'https://www.linkedin.com/in/mara-schmitman2/' },
  { value: 'Lucía', name: 'Lucía Palomeque', role_es: 'Head of Delivery · Bondy', role_en: 'Head of Delivery · Bondy', linkedin: 'https://www.linkedin.com/in/luciapalomeque/' },
]
const ANY_CONSULTORA = 'La que tenga disponibilidad antes'

const T = {
  es: {
    card: {
      'busco-trabajo': 'Consultoría 1 a 1 para ordenar tu búsqueda de trabajo en tech. Es una sesión de asesoría, no de colocación: no te presentamos a empresas, te dejamos lista para presentarte vos.',
      'recursos-recruiters': 'Consultoría 1 a 1 para pensar tu próximo paso como recruiter. Asesoría de carrera, no búsqueda de empleo.',
    },
    cardTitle: 'Sesiones de',
    cardTitleEm: 'Carrera',
    cardKicker: 'Consultoría de carrera',
    cardStamp: 'Activo · Sin login',
    cardTools: ['1 a 1', '60 min', 'Mara o Lucía', '50% OFF'],
    cardCta: 'Pedir una sesión →',
    expHead: 'Una hora con alguien que mira procesos de selección todos los días.',
    expBody: 'Sesiones de consultoría de carrera. Trabajamos tu posicionamiento, tu CV y tu estrategia de búsqueda. No es colocación: el trabajo lo conseguís vos, nosotras te dejamos lista para hacerlo.',
    expPick: 'Elegí con quién querés tu sesión.',
    promoBanner: 'Promo 50% OFF — en las dos sesiones, por tiempo limitado.',
    panelCta: 'Pedir una sesión →',
    formIntro: 'Contanos un poco antes de la sesión. Leemos cada solicitud y te respondemos si avanzamos.',
    f: {
      nombre: 'Nombre y apellido',
      email: 'Email',
      linkedin: 'Link LinkedIn',
      cv: 'Link CV',
      cvOpt: '(opcional)',
      servicio: 'Servicio',
      consultora: 'Consultora',
      expectativa: '¿Qué esperás de las charlas o de estos encuentros?',
      problema: '¿Cuál considerás que es el mayor problema que tenés hoy que te frena de encontrar el trabajo que querés?',
      anyConsultora: 'La que tenga disponibilidad antes',
      placeholder: 'Escribí libremente…',
    },
    submit: 'Enviar solicitud',
    submitting: 'Enviando…',
    back: '← volver',
    backToPanels: '← volver a elegir consultora',
    successTitle: 'Listo. Recibimos tu solicitud.',
    successBody: 'Te escribimos a tu email dentro de 1 día hábil para confirmarte si avanzamos y pasarte los pasos para reservar.',
    close: 'Cerrar',
    errGeneric: 'No se pudo enviar. Revisá los campos e intentá de nuevo.',
    errFields: 'Faltan datos o hay algo mal. Revisá los campos marcados.',
  },
  en: {
    card: {
      'busco-trabajo': '1-on-1 coaching to organize your tech job search. It is an advisory session, not placement: we do not introduce you to companies, we get you ready to introduce yourself.',
      'recursos-recruiters': '1-on-1 coaching to think through your next step as a recruiter. Career advice, not a job search.',
    },
    cardTitle: 'Career',
    cardTitleEm: 'Sessions',
    cardKicker: 'Career consulting',
    cardStamp: 'Live · No login',
    cardTools: ['1-on-1', '60 min', 'Mara or Lucía', '50% OFF'],
    cardCta: 'Request a session →',
    expHead: 'An hour with someone who looks at hiring processes every day.',
    expBody: 'Career consulting sessions. We work on your positioning, your CV and your search strategy. It is not placement: you land the job, we get you ready to do it.',
    expPick: 'Choose who you want your session with.',
    promoBanner: '50% OFF promo — on both sessions, for a limited time.',
    panelCta: 'Request a session →',
    formIntro: 'Tell us a bit before the session. We read every request and reply if we move forward.',
    f: {
      nombre: 'Full name',
      email: 'Email',
      linkedin: 'LinkedIn URL',
      cv: 'CV link',
      cvOpt: '(optional)',
      servicio: 'Service',
      consultora: 'Consultant',
      expectativa: 'What do you expect from these sessions?',
      problema: 'What do you think is the biggest thing holding you back from landing the job you want?',
      anyConsultora: "Whoever is available first",
      placeholder: 'Write freely…',
    },
    submit: 'Send request',
    submitting: 'Sending…',
    back: '← back',
    backToPanels: '← back to choosing consultant',
    successTitle: 'Done. We got your request.',
    successBody: 'We will email you within 1 business day to confirm whether we move forward and share the steps to book.',
    close: 'Close',
    errGeneric: 'Could not send. Check the fields and try again.',
    errFields: 'Something is missing or wrong. Check the highlighted fields.',
  },
}

// ─── estilos inline (overlay/panels/form no están en .btl-*) ────────
const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(26,26,26,0.55)', backdropFilter: 'blur(2px)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '40px 16px', overflowY: 'auto',
  },
  modal: {
    background: CREAM, border: `1px solid ${RULE}`, borderRadius: 14,
    width: '100%', maxWidth: 720, padding: '36px 36px 40px', position: 'relative',
    boxShadow: '0 24px 60px -20px rgba(26,26,26,0.4)',
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16, width: 30, height: 30,
    border: `1px solid ${RULE}`, borderRadius: 999, background: '#fff',
    color: FAINT, cursor: 'pointer', fontFamily: MONO, fontSize: 14, lineHeight: 1,
  },
  back: {
    fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: FAINT, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 22,
  },
  expHead: { fontFamily: DISPLAY, fontSize: '1.5rem', lineHeight: 1.2, color: INK_MID, margin: '0 0 14px', fontWeight: 400 },
  expBody: { fontSize: 14, lineHeight: 1.7, color: INK_SUB, margin: '0 0 8px' },
  expPick: { fontSize: 14, color: INK, fontWeight: 600, margin: '0 0 14px' },
  promoBanner: {
    display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 11,
    letterSpacing: '0.03em', color: GREEN, background: 'rgba(74,140,64,0.08)',
    border: '1px solid rgba(74,140,64,0.32)', borderRadius: 999, padding: '6px 14px', margin: '0 0 24px',
  },
  panels: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 },
  panel: {
    background: '#fff', border: `1px solid ${RULE}`, borderRadius: 12,
    padding: '24px 24px 26px', display: 'flex', flexDirection: 'column',
    boxShadow: '0 1px 0 rgba(232,228,222,0.8), 0 8px 24px -18px rgba(58,53,48,0.18)',
  },
  panelNameRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  panelName: { fontFamily: DISPLAY, fontSize: '1.4rem', color: INK, margin: 0, fontWeight: 400 },
  linkedinLink: {
    fontFamily: MONO, fontSize: 10, letterSpacing: '0.04em', color: GREEN,
    textDecoration: 'none', border: `1px solid ${RULE}`, borderRadius: 999,
    padding: '3px 9px', whiteSpace: 'nowrap', flexShrink: 0,
  },
  panelRole: { fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: FAINT, margin: '3px 0 16px' },
  prod: { borderTop: `1px solid ${RULE}`, padding: '13px 0' },
  prodName: { fontWeight: 600, fontSize: 14, color: INK },
  prodMeta: { fontFamily: MONO, fontSize: 11, color: FAINT, margin: '3px 0 6px' },
  prodPriceRow: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  prodPrice: { fontFamily: DISPLAY, fontSize: '1rem', color: GREEN },
  prodPriceOld: { fontFamily: MONO, fontSize: 12, color: FAINT, textDecoration: 'line-through' },
  promoBadge: {
    fontFamily: MONO, fontSize: 9, letterSpacing: '0.05em', color: '#fff',
    background: GREEN, borderRadius: 4, padding: '2px 6px',
  },
  btnGreen: {
    fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
    background: GREEN, color: '#fff', border: 'none', borderRadius: 8,
    padding: '12px 20px', cursor: 'pointer', marginTop: 16, width: '100%',
  },
  formIntro: { fontSize: 14, color: INK_SUB, lineHeight: 1.7, margin: '0 0 24px', maxWidth: 480 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field: { marginBottom: 16 },
  label: {
    fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
    color: INK_SUB, display: 'block', marginBottom: 6,
  },
  input: {
    width: '100%', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 14,
    color: INK, background: '#fff', border: `1px solid ${RULE}`, borderRadius: 8,
    padding: '10px 12px', outline: 'none',
  },
  inputErr: { borderColor: '#C0392B' },
  textarea: { minHeight: 70, resize: 'vertical', lineHeight: 1.6 },
  submitBtn: {
    fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
    background: GREEN, color: '#fff', border: 'none', borderRadius: 8,
    padding: '13px 26px', cursor: 'pointer', marginTop: 6,
  },
  errBox: {
    fontFamily: MONO, fontSize: 12, color: '#C0392B', background: 'rgba(192,57,43,0.07)',
    border: '1px solid rgba(192,57,43,0.25)', borderRadius: 8, padding: '10px 12px', marginBottom: 16,
  },
  successWrap: { maxWidth: 460 },
  check: {
    width: 44, height: 44, border: `2px solid ${GREEN}`, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: GREEN, fontSize: 21, marginBottom: 18,
  },
  successTitle: { fontFamily: DISPLAY, fontSize: '1.5rem', color: INK_MID, margin: '0 0 12px', fontWeight: 400 },
  successBody: { fontSize: 14, color: INK_SUB, lineHeight: 1.7, margin: 0 },
}

const EMPTY_FORM = {
  nombre: '', email: '', linkedin_url: '', cv_url: '',
  producto: 'Exprés', consultora_preferida: 'Mara',
  expectativa: '', problema: '', hp_field: '',
}

export default function SesionesCarreraCard({ pagina = 'busco-trabajo', lang = 'es', num = '07' }) {
  const c = T[lang] || T.es
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0) // 0 expanded · 1 form · 2 success
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [badFields, setBadFields] = useState([])

  const reset = useCallback(() => {
    setStep(0)
    setForm(EMPTY_FORM)
    setSubmitting(false)
    setError('')
    setBadFields([])
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setTimeout(reset, 200)
  }, [reset])

  // body scroll lock + ESC
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  function openWithConsultora(consultoraValue) {
    setForm((f) => ({ ...f, consultora_preferida: consultoraValue }))
    setStep(1)
  }

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
    if (badFields.includes(k)) setBadFields((b) => b.filter((x) => x !== k))
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    setBadFields([])
    try {
      const res = await fetch('/api/session-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, pagina_origen: pagina }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setStep(2)
      } else if (data.error === 'validation') {
        setBadFields(data.fields || [])
        setError(c.errFields)
      } else {
        setError(c.errGeneric)
      }
    } catch {
      setError(c.errGeneric)
    } finally {
      setSubmitting(false)
    }
  }

  const isErr = (k) => badFields.includes(k)
  const inputStyle = (k, extra) => ({ ...S.input, ...(isErr(k) ? S.inputErr : null), ...extra })

  return (
    <>
      {/* ─── CARD ─── */}
      <div
        className="btl-card"
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true) } }}
        style={{ cursor: 'pointer' }}
      >
        <div className="btl-card__top">
          <span className="btl-card__num">{num}</span>
          <span className="btl-card__stamp">{c.cardStamp}</span>
        </div>
        <div className="btl-card__kicker">— {c.cardKicker}</div>
        <h3 className="btl-card__title">
          {c.cardTitle} <em>{c.cardTitleEm}.</em>
        </h3>
        <p className="btl-card__desc">{c.card[pagina]}</p>
        <div className="btl-card__bottom">
          <div className="btl-card__tools">
            {c.cardTools.map((t, j) => (
              <span key={j} className="btl-card__tool">{t}</span>
            ))}
          </div>
          <span className="btl-card__cta">{c.cardCta}</span>
        </div>
      </div>

      {/* ─── OVERLAY ─── */}
      {open && (
        <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) close() }}>
          <div style={S.modal} role="dialog" aria-modal="true">
            <button style={S.closeBtn} onClick={close} aria-label={c.close}>✕</button>

            {/* STEP 0 — vista expandida */}
            {step === 0 && (
              <div>
                <h2 style={S.expHead}>{c.expHead}</h2>
                <p style={S.expBody}>{c.expBody}</p>
                <p style={S.expPick}>{c.expPick}</p>
                <div style={S.promoBanner}>{c.promoBanner}</div>
                <div style={S.panels} className="sc-panels">
                  {CONSULTORAS.map((p) => (
                    <div key={p.value} style={S.panel}>
                      <div style={S.panelNameRow}>
                        <span style={S.panelName}>{p.name}</span>
                        {p.linkedin && (
                          <a href={p.linkedin} target="_blank" rel="noopener noreferrer" style={S.linkedinLink}>
                            LinkedIn ↗
                          </a>
                        )}
                      </div>
                      <div style={S.panelRole}>{lang === 'en' ? p.role_en : p.role_es}</div>
                      {PRODUCTS.filter((pr) => pr.value !== 'Todavía no sé').map((pr) => (
                        <div key={pr.value} style={S.prod}>
                          <div style={S.prodName}>{lang === 'en' ? pr.en : pr.es}</div>
                          <div style={S.prodMeta}>{lang === 'en' ? pr.meta_en : pr.meta_es}</div>
                          <div style={S.prodPriceRow}>
                            <span style={S.prodPrice}>{pr.precio}</span>
                            <span style={S.prodPriceOld}>{pr.precioOriginal}</span>
                            <span style={S.promoBadge}>−50%</span>
                          </div>
                        </div>
                      ))}
                      <button style={S.btnGreen} onClick={() => openWithConsultora(p.value)}>
                        {c.panelCta}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 1 — formulario */}
            {step === 1 && (
              <div>
                <button style={S.back} onClick={() => setStep(0)}>{c.backToPanels}</button>
                <p style={S.formIntro}>{c.formIntro}</p>
                {error && <div style={S.errBox}>{error}</div>}

                <div style={S.row2} className="sc-row2">
                  <div style={S.field}>
                    <label style={S.label}>{c.f.nombre}</label>
                    <input style={inputStyle('nombre')} value={form.nombre}
                      onChange={(e) => setField('nombre', e.target.value)} />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>{c.f.email}</label>
                    <input style={inputStyle('email')} type="email" value={form.email}
                      onChange={(e) => setField('email', e.target.value)} />
                  </div>
                </div>

                <div style={S.row2} className="sc-row2">
                  <div style={S.field}>
                    <label style={S.label}>{c.f.linkedin}</label>
                    <input style={inputStyle('linkedin_url')} type="url" placeholder="https://linkedin.com/in/…"
                      value={form.linkedin_url} onChange={(e) => setField('linkedin_url', e.target.value)} />
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>{c.f.cv} <span style={{ color: FAINT, textTransform: 'none', letterSpacing: 0 }}>{c.f.cvOpt}</span></label>
                    <input style={inputStyle('cv_url')} type="url" placeholder="https://…"
                      value={form.cv_url} onChange={(e) => setField('cv_url', e.target.value)} />
                  </div>
                </div>

                <div style={S.row2} className="sc-row2">
                  <div style={S.field}>
                    <label style={S.label}>{c.f.servicio}</label>
                    <select style={inputStyle('producto')} value={form.producto}
                      onChange={(e) => setField('producto', e.target.value)}>
                      {PRODUCTS.map((pr) => (
                        <option key={pr.value} value={pr.value}>{lang === 'en' ? pr.en : pr.es}</option>
                      ))}
                    </select>
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>{c.f.consultora}</label>
                    <select style={inputStyle('consultora_preferida')} value={form.consultora_preferida}
                      onChange={(e) => setField('consultora_preferida', e.target.value)}>
                      {CONSULTORAS.map((p) => (
                        <option key={p.value} value={p.value}>{p.name}</option>
                      ))}
                      <option value={ANY_CONSULTORA}>{c.f.anyConsultora}</option>
                    </select>
                  </div>
                </div>

                <div style={S.field}>
                  <label style={S.label}>{c.f.expectativa}</label>
                  <textarea style={inputStyle('expectativa', S.textarea)} placeholder={c.f.placeholder}
                    value={form.expectativa} onChange={(e) => setField('expectativa', e.target.value)} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>{c.f.problema}</label>
                  <textarea style={inputStyle('problema', S.textarea)} placeholder={c.f.placeholder}
                    value={form.problema} onChange={(e) => setField('problema', e.target.value)} />
                </div>

                {/* honeypot — invisible para humanos */}
                <input
                  type="text" tabIndex={-1} autoComplete="off" value={form.hp_field}
                  onChange={(e) => setField('hp_field', e.target.value)}
                  style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
                  aria-hidden="true"
                />

                <button style={{ ...S.submitBtn, opacity: submitting ? 0.6 : 1 }}
                  onClick={submit} disabled={submitting}>
                  {submitting ? c.submitting : `${c.submit} →`}
                </button>
              </div>
            )}

            {/* STEP 2 — success */}
            {step === 2 && (
              <div style={S.successWrap}>
                <div style={S.check}>✓</div>
                <h2 style={S.successTitle}>{c.successTitle}</h2>
                <p style={S.successBody}>{c.successBody}</p>
                <button style={{ ...S.submitBtn, marginTop: 22 }} onClick={close}>{c.close}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* responsive: paneles y filas a 1 columna en mobile */}
      <style>{`
        @media (max-width: 620px) {
          .sc-panels { grid-template-columns: 1fr !important; }
          .sc-row2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
