'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

const tw = {
  bg: '#FEFCF9', white: '#FFFFFF', ink: '#1A1A1A', inkMid: '#3A3530',
  inkSub: '#5A5550', inkFaint: '#7A7874', rule: '#E8E4DE', green: '#4A8C40',
  greenTint: 'rgba(74,140,64,0.08)', orange: '#C06A2D',
}
const serif = "'Special Elite', Georgia, serif"
const mono = "'Courier Prime', Courier, monospace"
const ui = "'Plus Jakarta Sans', system-ui, sans-serif"

const SECTION_KINDS = [
  { kind: 'intro', label: 'Intro' },
  { kind: 'paragraph', label: 'Párrafo' },
  { kind: 'heading', label: 'Sub-título' },
  { kind: 'article_card', label: 'Card de artículo' },
  { kind: 'quote', label: 'Cita' },
  { kind: 'divider', label: 'Divisor' },
]

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

export default function NewsletterEditorPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status: authStatus } = useSession()
  const [issue, setIssue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [sendingTest, setSendingTest] = useState(false)
  const [confirmSend, setConfirmSend] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)
  const dirtyRef = useRef(false)
  const previewIframeRef = useRef(null)

  // Hidratar issue
  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/newsletter/issues/${params.id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setIssue(data.issue)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authStatus === 'authenticated') load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, params.id])

  // Marcar dirty cuando muta
  function patchIssue(patch) {
    if (!issue) return
    dirtyRef.current = true
    setIssue({ ...issue, ...patch })
  }

  function patchContent(patch) {
    if (!issue) return
    dirtyRef.current = true
    setIssue({ ...issue, content: { ...issue.content, ...patch } })
  }

  function updateSection(idx, patch) {
    const sections = [...(issue?.content?.sections || [])]
    sections[idx] = { ...sections[idx], ...patch }
    patchContent({ sections })
  }

  function addSection(kind) {
    const sections = [...(issue?.content?.sections || [])]
    const base = { _key: uid(), kind }
    const presets = {
      intro: { text: '' },
      paragraph: { text: '' },
      heading: { text: '' },
      article_card: { title: '', excerpt: '', url: '', kicker: '' },
      quote: { text: '', attribution: '' },
      divider: {},
    }
    sections.push({ ...base, ...(presets[kind] || {}) })
    patchContent({ sections })
  }

  function moveSection(idx, dir) {
    const sections = [...(issue?.content?.sections || [])]
    const j = idx + dir
    if (j < 0 || j >= sections.length) return
    ;[sections[idx], sections[j]] = [sections[j], sections[idx]]
    patchContent({ sections })
  }

  function removeSection(idx) {
    const sections = [...(issue?.content?.sections || [])]
    sections.splice(idx, 1)
    patchContent({ sections })
  }

  // Guardar (PATCH)
  async function save() {
    if (!issue || issue.status === 'sent') return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/newsletter/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: issue.title,
          subject: issue.subject,
          preheader: issue.preheader,
          lang: issue.lang,
          content: issue.content,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Save failed')
      setIssue(data.issue)
      dirtyRef.current = false
      setSavedAt(new Date())
      // Reload preview iframe
      if (previewIframeRef.current) {
        previewIframeRef.current.src = `/api/newsletter/preview/${issue.id}?t=${Date.now()}`
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Auto-save debounced
  useEffect(() => {
    if (!issue || issue.status === 'sent') return
    if (!dirtyRef.current) return
    const t = setTimeout(() => {
      save()
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue])

  async function handleSendTest() {
    if (!issue) return
    // Guardar primero si está dirty
    if (dirtyRef.current) await save()
    setSendingTest(true)
    setError(null)
    try {
      const res = await fetch(`/api/newsletter/issues/${issue.id}/send-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session?.user?.email }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Test send failed')
      alert(`Test enviado a ${data.to}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setSendingTest(false)
    }
  }

  async function handleSendReal() {
    if (!issue) return
    if (dirtyRef.current) await save()
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/newsletter/issues/${issue.id}/send`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Send failed')
      setSendResult(data.results)
      setConfirmSend(false)
      await load() // refresh status
    } catch (e) {
      setError(e.message)
      setConfirmSend(false)
    } finally {
      setSending(false)
    }
  }

  async function handleDelete() {
    if (!issue) return
    if (!confirm('¿Borrar este borrador? No se puede deshacer.')) return
    const res = await fetch(`/api/newsletter/issues/${issue.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/internal/newsletter')
    else {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Delete failed')
    }
  }

  if (authStatus === 'loading' || loading) {
    return <div style={{ padding: 32, background: tw.bg, minHeight: '100vh', fontFamily: mono, fontSize: 13, color: tw.inkFaint }}>Cargando…</div>
  }
  if (!issue) {
    return <div style={{ padding: 32, background: tw.bg, minHeight: '100vh', fontFamily: mono, fontSize: 13, color: tw.orange }}>{error || 'No encontrado'}</div>
  }

  const isSent = issue.status === 'sent'
  const sections = issue.content?.sections || []

  return (
    <div style={{ background: tw.bg, minHeight: '100vh', fontFamily: ui, color: tw.ink }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${tw.rule}`, background: tw.white, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1, minWidth: 0 }}>
            <Link href="/internal/newsletter" style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: tw.inkFaint, textDecoration: 'none', flexShrink: 0 }}>
              ← Newsletter
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: isSent ? tw.green : tw.inkFaint, padding: '4px 8px', border: `1px solid ${isSent ? tw.green : tw.rule}`, background: isSent ? tw.greenTint : tw.white }}>
                {isSent ? `№ ${String(issue.issue_number || '?').padStart(2, '0')} · ENVIADO` : 'BORRADOR'}
              </span>
              <span style={{ fontFamily: mono, fontSize: 10, color: tw.inkFaint }}>{issue.lang === 'en' ? '🇺🇸 EN' : '🇦🇷 ES'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!isSent && (
              <span style={{ fontFamily: mono, fontSize: 10, color: saving ? tw.green : tw.inkFaint }}>
                {saving ? 'Guardando…' : savedAt ? `Guardado · ${savedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : dirtyRef.current ? 'Sin guardar' : 'Sincronizado'}
              </span>
            )}
            <button
              onClick={handleSendTest}
              disabled={sendingTest || sending}
              style={btnSecondary(sendingTest || sending)}
            >
              {sendingTest ? 'Enviando test…' : 'Enviar test a mí'}
            </button>
            {!isSent && (
              <button
                onClick={() => setConfirmSend(true)}
                disabled={sending || sendingTest}
                style={btnPrimary(sending || sendingTest)}
              >
                Enviar a todos
              </button>
            )}
            {!isSent && (
              <button onClick={handleDelete} style={{ ...btnSecondary(false), color: tw.orange, borderColor: tw.orange }}>
                Borrar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmSend && (
        <ConfirmModal
          issue={issue}
          onCancel={() => setConfirmSend(false)}
          onConfirm={handleSendReal}
          sending={sending}
        />
      )}

      {sendResult && (
        <SendResultModal results={sendResult} onClose={() => setSendResult(null)} />
      )}

      {error && (
        <div style={{ maxWidth: 1400, margin: '16px auto 0', padding: '0 32px' }}>
          <div style={{ padding: 14, background: '#FFF4F0', border: `1px solid ${tw.orange}`, color: tw.orange, fontFamily: mono, fontSize: 13 }}>
            {error}
          </div>
        </div>
      )}

      {/* Body: editor | preview */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: 32, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 480px', gap: 24, alignItems: 'start' }}>
        {/* Editor column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Meta fields */}
          <FieldGroup title="Metadata del email">
            <Field label="Título (en el header del email)">
              <input
                type="text"
                value={issue.title || ''}
                onChange={(e) => patchIssue({ title: e.target.value })}
                disabled={isSent}
                style={inputStyle()}
                placeholder={issue.lang === 'es' ? 'Ej: Por qué los seniors no aplican' : 'Ex: Why seniors don\'t apply'}
              />
            </Field>
            <Field label="Subject del email (lo que ven en la bandeja)">
              <input
                type="text"
                value={issue.subject || ''}
                onChange={(e) => patchIssue({ subject: e.target.value })}
                disabled={isSent}
                style={inputStyle()}
                placeholder="Bondy Thinking — ..."
              />
            </Field>
            <Field label="Preheader (texto preview tras el subject, opcional)">
              <input
                type="text"
                value={issue.preheader || ''}
                onChange={(e) => patchIssue({ preheader: e.target.value })}
                disabled={isSent}
                style={inputStyle()}
                placeholder={issue.lang === 'es' ? 'Una línea para tentar la apertura' : 'A one-liner to entice the open'}
              />
            </Field>
          </FieldGroup>

          {/* Sections */}
          <FieldGroup title={`Contenido (${sections.length} ${sections.length === 1 ? 'sección' : 'secciones'})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sections.map((s, idx) => (
                <SectionEditor
                  key={s._key || idx}
                  section={s}
                  isSent={isSent}
                  onChange={(patch) => updateSection(idx, patch)}
                  onMoveUp={() => moveSection(idx, -1)}
                  onMoveDown={() => moveSection(idx, 1)}
                  onRemove={() => removeSection(idx)}
                  isFirst={idx === 0}
                  isLast={idx === sections.length - 1}
                />
              ))}
              {!isSent && (
                <AddSectionRow onAdd={addSection} />
              )}
            </div>
          </FieldGroup>
        </div>

        {/* Preview column */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: tw.inkFaint, marginBottom: 10 }}>
            Preview en vivo
          </div>
          <div style={{ border: `1px solid ${tw.rule}`, background: tw.white, height: 'calc(100vh - 160px)', overflow: 'hidden' }}>
            <iframe
              ref={previewIframeRef}
              src={`/api/newsletter/preview/${issue.id}?t=${savedAt?.getTime() || ''}`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Preview"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ───────────── Components ─────────────

function FieldGroup({ title, children }) {
  return (
    <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, padding: 20 }}>
      <h3 style={{ margin: '0 0 14px 0', fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: tw.inkFaint }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontFamily: ui, fontSize: 12, color: tw.inkSub, fontWeight: 500 }}>{label}</span>
      {children}
    </label>
  )
}

function inputStyle() {
  return {
    fontFamily: ui, fontSize: 14, padding: '10px 12px',
    background: tw.white, color: tw.ink, border: `1px solid ${tw.rule}`,
    outline: 'none', width: '100%', boxSizing: 'border-box',
  }
}
function textareaStyle(minHeight = 80) {
  return { ...inputStyle(), minHeight, resize: 'vertical', lineHeight: 1.6 }
}

function btnPrimary(disabled) {
  return {
    fontFamily: mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
    background: tw.green, color: '#fff', border: 'none', padding: '10px 18px',
    cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.6 : 1,
  }
}
function btnSecondary(disabled) {
  return {
    fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
    background: tw.white, color: tw.inkMid, border: `1px solid ${tw.rule}`, padding: '8px 14px',
    cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.6 : 1,
  }
}

function SectionEditor({ section, isSent, onChange, onMoveUp, onMoveDown, onRemove, isFirst, isLast }) {
  const kindLabel = SECTION_KINDS.find((k) => k.kind === section.kind)?.label || section.kind
  return (
    <div style={{ border: `1px solid ${tw.rule}`, background: tw.bg, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: tw.green }}>{kindLabel}</span>
        {!isSent && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={onMoveUp} disabled={isFirst} style={iconBtn(isFirst)} title="Subir">↑</button>
            <button onClick={onMoveDown} disabled={isLast} style={iconBtn(isLast)} title="Bajar">↓</button>
            <button onClick={onRemove} style={{ ...iconBtn(false), color: tw.orange }} title="Eliminar">×</button>
          </div>
        )}
      </div>
      {section.kind === 'divider' ? (
        <div style={{ borderTop: `1px solid ${tw.rule}`, marginTop: 8 }} />
      ) : section.kind === 'article_card' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            placeholder="Kicker (ej: EN BONDY THINKING)"
            value={section.kicker || ''}
            onChange={(e) => onChange({ kicker: e.target.value })}
            disabled={isSent}
            style={inputStyle()}
          />
          <input
            placeholder="Título del artículo"
            value={section.title || ''}
            onChange={(e) => onChange({ title: e.target.value })}
            disabled={isSent}
            style={inputStyle()}
          />
          <textarea
            placeholder="Excerpt / 1-2 líneas describiendo la nota"
            value={section.excerpt || ''}
            onChange={(e) => onChange({ excerpt: e.target.value })}
            disabled={isSent}
            style={textareaStyle(60)}
          />
          <input
            placeholder="URL completa (ej: https://wearebondy.com/es/thinking/...)"
            value={section.url || ''}
            onChange={(e) => onChange({ url: e.target.value })}
            disabled={isSent}
            style={inputStyle()}
          />
        </div>
      ) : section.kind === 'quote' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            placeholder="Cita"
            value={section.text || ''}
            onChange={(e) => onChange({ text: e.target.value })}
            disabled={isSent}
            style={textareaStyle(70)}
          />
          <input
            placeholder="Atribución (opcional)"
            value={section.attribution || ''}
            onChange={(e) => onChange({ attribution: e.target.value })}
            disabled={isSent}
            style={inputStyle()}
          />
        </div>
      ) : section.kind === 'heading' ? (
        <input
          placeholder="Sub-título"
          value={section.text || ''}
          onChange={(e) => onChange({ text: e.target.value })}
          disabled={isSent}
          style={inputStyle()}
        />
      ) : (
        <>
          <textarea
            placeholder={section.kind === 'intro' ? 'Hola lectora/lector,\n\nArranco con…' : 'Párrafo… podés usar **bold**, *italic*, [link](https://...)'}
            value={section.text || ''}
            onChange={(e) => onChange({ text: e.target.value })}
            disabled={isSent}
            style={textareaStyle(section.kind === 'intro' ? 140 : 110)}
          />
          <div style={{ fontFamily: mono, fontSize: 9, color: tw.inkFaint, marginTop: 4 }}>
            Markdown ligero: <code>**bold**</code> · <code>*italic*</code> · <code>[texto](url)</code> · doble salto = párrafo nuevo
          </div>
        </>
      )}
    </div>
  )
}

function iconBtn(disabled) {
  return {
    width: 28, height: 28, border: `1px solid ${tw.rule}`, background: tw.white,
    color: tw.inkSub, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1, fontFamily: mono, fontSize: 14,
  }
}

function AddSectionRow({ onAdd }) {
  return (
    <div style={{ borderTop: `1px dashed ${tw.rule}`, paddingTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: tw.inkFaint, marginRight: 8, alignSelf: 'center' }}>+ Agregar</span>
      {SECTION_KINDS.map((k) => (
        <button key={k.kind} onClick={() => onAdd(k.kind)} style={btnSecondary(false)}>
          {k.label}
        </button>
      ))}
    </div>
  )
}

function ConfirmModal({ issue, onCancel, onConfirm, sending }) {
  return (
    <div style={modalBackdrop}>
      <div style={modalCard}>
        <h2 style={{ fontFamily: serif, fontSize: 22, margin: '0 0 12px 0', color: tw.inkMid }}>¿Enviar a todos los suscriptores confirmados?</h2>
        <p style={{ fontFamily: ui, fontSize: 14, color: tw.inkSub, lineHeight: 1.6, margin: '0 0 18px 0' }}>
          Se va a enviar este número (<strong>{issue.title}</strong>) en <strong>{issue.lang === 'en' ? 'inglés' : 'español'}</strong> a todos los suscriptores confirmados de ese idioma. Una vez enviado no se puede deshacer.
        </p>
        <div style={{ background: tw.greenTint, border: `1px solid ${tw.green}`, padding: 12, marginBottom: 18, fontFamily: mono, fontSize: 11, color: tw.green }}>
          <strong>Subject:</strong> {issue.subject}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={sending} style={btnSecondary(sending)}>Cancelar</button>
          <button onClick={onConfirm} disabled={sending} style={btnPrimary(sending)}>
            {sending ? 'Enviando…' : 'Confirmar envío'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SendResultModal({ results, onClose }) {
  return (
    <div style={modalBackdrop}>
      <div style={modalCard}>
        <h2 style={{ fontFamily: serif, fontSize: 22, margin: '0 0 12px 0', color: tw.green }}>✓ Envío completado</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={statBox}><div style={statLabel}>Total</div><div style={statValue}>{results.total}</div></div>
          <div style={statBox}><div style={statLabel}>Enviados</div><div style={{ ...statValue, color: tw.green }}>{results.sent}</div></div>
          <div style={statBox}><div style={statLabel}>Fallaron</div><div style={{ ...statValue, color: results.failed ? tw.orange : tw.inkFaint }}>{results.failed}</div></div>
        </div>
        {results.errors?.length > 0 && (
          <details style={{ marginBottom: 16, fontFamily: mono, fontSize: 11, color: tw.inkSub }}>
            <summary style={{ cursor: 'pointer', marginBottom: 8 }}>Ver errores ({results.errors.length})</summary>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {results.errors.map((e, i) => <li key={i}>{e.email}: {e.reason}</li>)}
            </ul>
          </details>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnPrimary(false)}>Listo</button>
        </div>
      </div>
    </div>
  )
}

const modalBackdrop = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(26,26,26,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 100, padding: 20,
}
const modalCard = {
  background: tw.white, padding: 28, maxWidth: 480, width: '100%', border: `1px solid ${tw.rule}`,
}
const statBox = { background: tw.bg, padding: 14, border: `1px solid ${tw.rule}`, textAlign: 'center' }
const statLabel = { fontFamily: mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: tw.inkFaint, marginBottom: 6 }
const statValue = { fontFamily: serif, fontSize: 28, color: tw.inkMid }
