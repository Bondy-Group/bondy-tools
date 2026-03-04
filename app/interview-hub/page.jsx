'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

const ORANGE = '#E05C00'
const MONO = 'DM Mono, monospace'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(isoString) {
  if (!isoString) return null
  const d = new Date(isoString)
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (isSameDay(d, today)) return 'Hoy'
  if (isSameDay(d, tomorrow)) return 'Mañana'
  if (isSameDay(d, yesterday)) return 'Ayer'
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function toDateInput(date) {
  return date.toISOString().split('T')[0]
}

const STATUS_CONFIG = {
  scheduled:   { label: 'Agendada',   color: '#6b7280', bg: '#f3f4f6' },
  in_progress: { label: 'En curso',   color: '#d97706', bg: '#fef3c7' },
  completed:   { label: 'Completada', color: '#16a34a', bg: '#f0fdf4' },
  cancelled:   { label: 'Cancelada',  color: '#ef4444', bg: '#fef2f2' },
}

// ─── Components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled
  return (
    <span style={{
      fontSize: '10px', fontFamily: MONO, fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: '4px',
      color: cfg.color, background: cfg.bg,
    }}>
      {cfg.label}
    </span>
  )
}

function InterviewCard({ interview }) {
  const time = formatTime(interview.scheduled_at)

  return (
    <Link href={`/interview-hub/${interview.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'white',
        border: '1.5px solid #EBEBEB',
        borderRadius: '14px',
        padding: '20px 24px',
        cursor: 'pointer',
        transition: 'all 0.18s',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = ORANGE
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(224,92,0,0.1)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = '#EBEBEB'
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.transform = 'none'
        }}
      >
        {/* Hora */}
        <div style={{ minWidth: '52px', textAlign: 'center', flexShrink: 0 }}>
          {time
            ? <span style={{ fontSize: '20px', fontWeight: 800, color: '#111', fontFamily: MONO, letterSpacing: '-0.02em' }}>{time}</span>
            : <span style={{ fontSize: '11px', color: '#bbb', fontFamily: MONO }}>—</span>
          }
        </div>

        {/* Separador */}
        <div style={{ width: '1px', height: '48px', background: '#EBEBEB', flexShrink: 0 }} />

        {/* Info principal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {interview.candidate_name}
            </span>
            <StatusBadge status={interview.status} />
          </div>
          <div style={{ fontSize: '12px', color: '#666', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span>{interview.position}</span>
            <span style={{ color: '#ddd' }}>·</span>
            <span style={{ color: ORANGE, fontWeight: 600 }}>{interview.client_name}</span>
          </div>
          {interview.recruiter_name && (
            <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px', fontFamily: MONO }}>
              {interview.recruiter_name}
            </div>
          )}
        </div>

        {/* Indicadores */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          {interview.ai_insights && (
            <span title="Insights generados" style={{ fontSize: '14px' }}>⚡</span>
          )}
          {interview.generated_questions && (
            <span title="Preguntas listas" style={{ fontSize: '14px' }}>📋</span>
          )}
          {interview.cv_url && (
            <span title="CV disponible" style={{ fontSize: '14px' }}>📄</span>
          )}
          <span style={{ color: '#ccc', fontSize: '16px' }}>›</span>
        </div>
      </div>
    </Link>
  )
}

function EmptyDay() {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 20px',
      border: '1.5px dashed #EBEBEB', borderRadius: '14px',
      color: '#aaa',
    }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>📅</div>
      <p style={{ fontSize: '14px', margin: 0, fontWeight: 600, color: '#888' }}>Sin entrevistas para este día</p>
      <p style={{ fontSize: '12px', marginTop: '6px', color: '#bbb', fontFamily: MONO }}>
        Creá una nueva entrevista con el botón de abajo
      </p>
    </div>
  )
}

// ─── Modal: nueva entrevista ─────────────────────────────────────────────────

function NewInterviewModal({ onClose, onCreated, defaultDate, sessionUserName }) {
  const [form, setForm] = useState({
    recruiter_name: sessionUserName || '',
    candidate_name: '',
    candidate_email: '',
    linkedin_url: '',
    position: '',
    client_name: '',
    scheduled_at: defaultDate ? `${defaultDate}T10:00` : '',
  })
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/positions')
      .then(r => r.json())
      .then(d => setPositions(d.positions || []))
      .catch(() => {})
  }, [])

  const handlePositionChange = (value) => {
    if (value === '__exploratory__') {
      set('position', 'Call exploratoria')
      set('client_name', '')
    } else {
      const pos = positions.find(p => p.id === value)
      if (pos) set('position', pos.name)
    }
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleCreate = async () => {
    if (!form.candidate_name.trim()) return setError('Ingresá el nombre del candidato')
    if (!form.position.trim()) return setError('Seleccioná una posición')
    if (!form.candidate_email.trim() && !form.linkedin_url.trim())
      return setError('Ingresá al menos el email o el LinkedIn del candidato')

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error creando entrevista')
      onCreated(data.interview)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', border: '1.5px solid #EBEBEB', borderRadius: '10px',
    padding: '10px 14px', fontSize: '14px', outline: 'none',
    fontFamily: 'inherit', background: 'white', color: '#111',
    boxSizing: 'border-box',
  }
  const labelStyle = {
    display: 'block', fontSize: '10px', fontWeight: 600, color: '#555',
    marginBottom: '6px', letterSpacing: '0.08em', textTransform: 'uppercase',
    fontFamily: MONO,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'white', borderRadius: '18px', padding: '32px',
        width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#111' }}>Nueva entrevista</h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#aaa', fontFamily: MONO }}>Agendá una entrevista al Hub</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '20px', padding: '4px' }}>✕</button>
        </div>

        {/* Campos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Recruiter</label>
              <input
                value={form.recruiter_name}
                onChange={e => set('recruiter_name', e.target.value)}
                placeholder={sessionUserName || 'Tu nombre'}
                style={{ ...inputStyle, color: form.recruiter_name === sessionUserName ? '#888' : '#111' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Fecha y hora</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Candidato <span style={{ color: '#ef4444' }}>*</span></label>
            <input value={form.candidate_name} onChange={e => set('candidate_name', e.target.value)} placeholder="Nombre completo" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Email del candidato</label>
              <input type="email" value={form.candidate_email} onChange={e => set('candidate_email', e.target.value)} placeholder="email@candidato.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>LinkedIn</label>
              <input value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} placeholder="linkedin.com/in/..." style={inputStyle} />
            </div>
          </div>
          <p style={{ margin: '-8px 0 0', fontSize: '11px', color: '#aaa', fontFamily: MONO }}>
            * Al menos email o LinkedIn es requerido
          </p>

          <div>
            <label style={labelStyle}>Posición <span style={{ color: '#ef4444' }}>*</span></label>
            <select
              defaultValue=""
              onChange={e => handlePositionChange(e.target.value)}
              style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px' }}
            >
              <option value="" disabled>— Seleccioná una posición —</option>
              <option value="__exploratory__">📞 Sin posición (call exploratoria)</option>
              {positions.filter(p => p.status.includes('On Going')).length > 0 && (
                <option disabled>── 🚀 On Going ──</option>
              )}
              {positions.filter(p => p.status.includes('On Going')).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              {positions.filter(p => p.status.includes('Potencial')).length > 0 && (
                <option disabled>── 💼 Potencial ──</option>
              )}
              {positions.filter(p => p.status.includes('Potencial')).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Cliente</label>
            <input value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Nombre del cliente (opcional)" style={inputStyle} />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', color: '#dc2626', fontSize: '13px' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button onClick={onClose} style={{ padding: '10px 20px', border: '1.5px solid #EBEBEB', borderRadius: '10px', background: 'white', color: '#666', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
              Cancelar
            </button>
            <button onClick={handleCreate} disabled={loading}
              style={{ padding: '10px 24px', border: 'none', borderRadius: '10px', background: loading ? '#ccc' : `linear-gradient(135deg, ${ORANGE}, #F47C20)`, color: 'white', cursor: loading ? 'wait' : 'pointer', fontSize: '14px', fontWeight: 700, boxShadow: loading ? 'none' : '0 4px 16px rgba(224,92,0,0.3)' }}>
              {loading ? 'Creando...' : 'Crear entrevista'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function InterviewHubPage() {
  const today = toDateInput(new Date())
  const { data: session } = useSession()
  const sessionUserName = session?.user?.name || ''
  const [selectedDate, setSelectedDate] = useState(today)
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const dateLabel = formatDateLabel(selectedDate)

  const fetchInterviews = async (date) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/interviews?date=${date}`)
      const data = await res.json()
      setInterviews(data.interviews || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInterviews(selectedDate)
  }, [selectedDate])

  const navigateDay = (delta) => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    setSelectedDate(toDateInput(d))
  }

  const handleCreated = (interview) => {
    setShowModal(false)
    // Si la entrevista es del mismo día, actualizar lista
    const interviewDate = interview.scheduled_at
      ? interview.scheduled_at.split('T')[0]
      : null
    if (interviewDate === selectedDate) {
      setInterviews(prev => [...prev, interview].sort((a, b) => {
        if (!a.scheduled_at) return 1
        if (!b.scheduled_at) return -1
        return new Date(a.scheduled_at) - new Date(b.scheduled_at)
      }))
    }
  }

  const byStatus = {
    in_progress: interviews.filter(i => i.status === 'in_progress'),
    scheduled: interviews.filter(i => i.status === 'scheduled'),
    completed: interviews.filter(i => i.status === 'completed'),
    cancelled: interviews.filter(i => i.status === 'cancelled'),
  }
  const orderedInterviews = [
    ...byStatus.in_progress,
    ...byStatus.scheduled,
    ...byStatus.completed,
    ...byStatus.cancelled,
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ display: 'block', width: '20px', height: '2px', background: ORANGE }} />
            <span style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: ORANGE, fontFamily: MONO }}>Bondy</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: '#111', letterSpacing: '-0.02em' }}>
            Interview Hub
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#888' }}>
            Preparación y gestión de entrevistas
          </p>
        </div>

        {/* Navegación de fecha */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '28px', padding: '16px 20px',
          background: 'white', borderRadius: '14px', border: '1.5px solid #EBEBEB',
        }}>
          <button onClick={() => navigateDay(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '18px', padding: '4px 8px', borderRadius: '8px' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            ‹
          </button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#111' }}>{dateLabel}</div>
            <div style={{ fontSize: '11px', color: '#aaa', fontFamily: MONO, marginTop: '2px' }}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {selectedDate !== today && (
              <button onClick={() => setSelectedDate(today)}
                style={{ fontSize: '11px', fontFamily: MONO, padding: '5px 10px', border: '1px solid #EBEBEB', borderRadius: '6px', background: 'white', color: '#666', cursor: 'pointer' }}>
                Hoy
              </button>
            )}
            <button onClick={() => navigateDay(1)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: '18px', padding: '4px 8px', borderRadius: '8px' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              ›
            </button>
          </div>
        </div>

        {/* Stats rápidas */}
        {interviews.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
              const count = byStatus[status]?.length || 0
              if (count === 0) return null
              return (
                <div key={status} style={{
                  padding: '8px 14px', borderRadius: '8px', background: cfg.bg,
                  fontSize: '12px', fontWeight: 700, color: cfg.color, fontFamily: MONO,
                }}>
                  {count} {cfg.label.toLowerCase()}{count !== 1 ? 's' : ''}
                </div>
              )
            })}
          </div>
        )}

        {/* Lista de entrevistas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.3s ease' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#aaa', fontSize: '14px' }}>
              Cargando...
            </div>
          ) : orderedInterviews.length === 0 ? (
            <EmptyDay />
          ) : (
            orderedInterviews.map(i => <InterviewCard key={i.id} interview={i} />)
          )}
        </div>

        {/* Botón nueva entrevista */}
        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}>
          <button onClick={() => setShowModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 28px', border: 'none',
              background: `linear-gradient(135deg, ${ORANGE}, #F47C20)`,
              color: 'white', borderRadius: '12px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 700,
              boxShadow: '0 4px 20px rgba(224,92,0,0.3)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(224,92,0,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(224,92,0,0.3)' }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span>
            Nueva entrevista
          </button>
        </div>

      </div>

      {showModal && (
        <NewInterviewModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
          defaultDate={selectedDate}
          sessionUserName={sessionUserName}
        />
      )}
    </div>
  )
}
