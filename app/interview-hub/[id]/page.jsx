'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const ORANGE = '#E05C00'
const MONO = 'DM Mono, monospace'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateTime(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

const STATUS_LABELS = {
  scheduled:   'Agendada',
  in_progress: 'En curso',
  completed:   'Completada',
  cancelled:   'Cancelada',
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ label, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
      {icon && <span>{icon}</span>}
      <span style={{ display: 'block', width: '14px', height: '1.5px', background: ORANGE }} />
      <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: ORANGE, fontFamily: MONO, fontWeight: 700 }}>
        {label}
      </span>
    </div>
  )
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'white', border: '1.5px solid #EBEBEB',
      borderRadius: '14px', padding: '24px',
      ...style,
    }}>
      {children}
    </div>
  )
}

// Tarjeta de insights IA
function InsightsCard({ insights, loading, onGenerate }) {
  if (loading) {
    return (
      <Card>
        <SectionHeader label="Insights del candidato" icon="⚡" />
        <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: '13px', fontFamily: MONO }}>
          Generando insights...
        </div>
      </Card>
    )
  }

  if (!insights) {
    return (
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <SectionHeader label="Insights del candidato" icon="⚡" />
          <button onClick={onGenerate}
            style={{ padding: '8px 16px', border: `1.5px solid ${ORANGE}`, borderRadius: '8px', background: 'white', color: ORANGE, cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: MONO }}>
            Generar con IA
          </button>
        </div>
        <p style={{ fontSize: '13px', color: '#bbb', margin: 0, fontFamily: MONO }}>
          Subí el CV o LinkedIn para generar insights automáticos
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <SectionHeader label="Insights del candidato" icon="⚡" />
        <button onClick={onGenerate}
          style={{ padding: '6px 12px', border: '1px solid #EBEBEB', borderRadius: '6px', background: 'white', color: '#888', cursor: 'pointer', fontSize: '11px', fontFamily: MONO }}>
          ↻ Regenerar
        </button>
      </div>

      {insights.highlights?.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            ✅ Destacado
          </p>
          {insights.highlights.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
              <span style={{ color: '#16a34a', flexShrink: 0, marginTop: '1px' }}>•</span>
              <span style={{ fontSize: '13px', color: '#333', lineHeight: '1.5' }}>{h}</span>
            </div>
          ))}
        </div>
      )}

      {insights.gaps?.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b', fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            🔍 A explorar
          </p>
          {insights.gaps.map((g, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
              <span style={{ color: '#f59e0b', flexShrink: 0, marginTop: '1px' }}>•</span>
              <span style={{ fontSize: '13px', color: '#333', lineHeight: '1.5' }}>{g}</span>
            </div>
          ))}
        </div>
      )}

      {insights.topics_to_explore?.length > 0 && (
        <div>
          <p style={{ fontSize: '10px', fontWeight: 700, color: '#4A90D9', fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            💬 Temas a profundizar
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {insights.topics_to_explore.map((t, i) => (
              <span key={i} style={{ fontSize: '12px', background: '#EFF6FF', color: '#4A90D9', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

// Preguntas por skill + notas de sesión
function SessionSkillCard({ skillName, skillType, questions, whatToLookFor, note, onNoteChange }) {
  const [expanded, setExpanded] = useState(true)
  const istech = skillType === 'technical'

  return (
    <div style={{
      border: `1.5px solid ${expanded ? (istech ? '#fed7aa' : '#bfdbfe') : '#EBEBEB'}`,
      borderRadius: '12px', overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      {/* Header del skill */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', cursor: 'pointer',
          background: expanded ? (istech ? '#fff7ed' : '#eff6ff') : 'white',
          transition: 'background 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px' }}>{istech ? '🔧' : '💬'}</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>{skillName}</span>
          <span style={{
            fontSize: '9px', fontFamily: MONO, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '2px 6px', borderRadius: '4px',
            color: istech ? ORANGE : '#4A90D9',
            background: istech ? '#ffedd5' : '#dbeafe',
          }}>
            {istech ? 'Técnico' : 'Blando'}
          </span>
          {note && <span style={{ fontSize: '11px', color: '#16a34a' }}>✓</span>}
        </div>
        <span style={{ color: '#999', fontSize: '14px', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
      </div>

      {expanded && (
        <div style={{ padding: '16px 18px', borderTop: `1px solid ${istech ? '#fed7aa' : '#bfdbfe'}`, background: 'white' }}>
          {/* Preguntas sugeridas */}
          {questions?.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#888', fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                Preguntas sugeridas
              </p>
              {questions.map((q, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '10px', marginBottom: '8px',
                  padding: '10px 12px', background: '#fafafa', borderRadius: '8px',
                  border: '1px solid #f0f0f0',
                }}>
                  <span style={{ color: '#ccc', fontFamily: MONO, fontSize: '11px', marginTop: '1px', flexShrink: 0 }}>{i + 1}.</span>
                  <span style={{ fontSize: '13px', color: '#333', lineHeight: '1.5' }}>{q}</span>
                </div>
              ))}
            </div>
          )}

          {/* Qué buscar */}
          {whatToLookFor && (
            <div style={{ marginBottom: '14px', padding: '10px 12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#16a34a', fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>
                Qué buscar
              </p>
              <p style={{ fontSize: '12px', color: '#166534', margin: 0, lineHeight: '1.5' }}>{whatToLookFor}</p>
            </div>
          )}

          {/* Notas de sesión */}
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, color: '#555', fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
              Notas <span style={{ color: '#aaa' }}>(durante la entrevista)</span>
            </p>
            <textarea
              value={note || ''}
              onChange={e => onNoteChange(skillName, e.target.value)}
              placeholder={`Anotá lo que observe sobre ${skillName}...`}
              style={{
                width: '100%', border: '1.5px solid #EBEBEB', borderRadius: '8px',
                padding: '10px 12px', fontSize: '13px', outline: 'none',
                fontFamily: 'inherit', background: 'white', color: '#111',
                resize: 'vertical', minHeight: '80px', lineHeight: '1.6',
                boxSizing: 'border-box', transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = ORANGE}
              onBlur={e => e.target.style.borderColor = '#EBEBEB'}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function InterviewDetailPage() {
  const { id } = useParams()

  const [interview, setInterview] = useState(null)
  const [scorecard, setScorecard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [prepLoading, setPrepLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [notes, setNotes] = useState({}) // { skillName: "nota..." }
  const [activeTab, setActiveTab] = useState('prep') // 'prep' | 'session'

  // Cargar entrevista
  useEffect(() => {
    if (!id) return
    fetch(`/api/interviews?id=${id}`)
      .then(r => r.json())
      .then(data => {
        const iv = data.interview
        setInterview(iv)
        setNotes(iv.session_notes || {})
        // Cargar scorecard si hay
        if (iv.scorecard_id || iv.client_name) {
          const url = iv.scorecard_id
            ? `/api/scorecards?id=${iv.scorecard_id}`
            : `/api/scorecards?client=${encodeURIComponent(iv.client_name)}`
          fetch(url)
            .then(r => r.json())
            .then(d => setScorecard(d.scorecard || null))
            .catch(() => {})
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  // Generar prep con IA
  const handleGeneratePrep = useCallback(async () => {
    if (!interview) return
    setPrepLoading(true)
    try {
      const res = await fetch('/api/interviews/prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interview_id: interview.id,
          position: interview.position,
          client_name: interview.client_name,
          scorecard_data: scorecard?.scorecard_data || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setInterview(prev => ({
        ...prev,
        ai_insights: data.ai_insights,
        generated_questions: data.generated_questions,
      }))
    } catch (e) {
      console.error('Prep error:', e)
    } finally {
      setPrepLoading(false)
    }
  }, [interview, scorecard])

  // Auto-save notas (con debounce manual)
  const saveNotes = useCallback(async (updatedNotes) => {
    if (!interview?.id) return
    setSaving(true)
    try {
      await fetch('/api/interviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: interview.id, session_notes: updatedNotes }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error('Save notes error:', e)
    } finally {
      setSaving(false)
    }
  }, [interview?.id])

  const handleNoteChange = (skillName, value) => {
    const updated = { ...notes, [skillName]: value }
    setNotes(updated)
    // Debounce: guardar 1.5s después de dejar de escribir
    clearTimeout(window._notesSaveTimeout)
    window._notesSaveTimeout = setTimeout(() => saveNotes(updated), 1500)
  }

  // Cambiar status
  const handleStatusChange = async (newStatus) => {
    if (!interview) return
    try {
      const res = await fetch('/api/interviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: interview.id, status: newStatus }),
      })
      const data = await res.json()
      setInterview(data.interview)
    } catch (e) {
      console.error('Status change error:', e)
    }
  }

  // Ir al generador de reporte (Interview-Report-Gen1 de Lucía Palomeque)
  const handleGoToReport = () => {
    const REPORT_URL = 'https://interview-report-gen1.vercel.app'

    // Construir JD sintético a partir de los datos disponibles
    const jdParts = []
    if (interview.position) jdParts.push(`Posición: ${interview.position}`)
    if (interview.client_name) jdParts.push(`Empresa: ${interview.client_name}`)
    if (scorecard?.scorecard_data?.skills?.length) {
      const techSkillsText = scorecard.scorecard_data.skills
        .filter(s => s.skill_type === 'technical')
        .map(s => s.name).join(', ')
      const softSkillsText = scorecard.scorecard_data.skills
        .filter(s => s.skill_type === 'soft')
        .map(s => s.name).join(', ')
      if (techSkillsText) jdParts.push(`Skills técnicos requeridos: ${techSkillsText}`)
      if (softSkillsText) jdParts.push(`Soft skills requeridos: ${softSkillsText}`)
    }
    const jdText = jdParts.join('\n')

    // Notas de sesión condensadas
    const notesText = Object.entries(notes)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `[${k}]: ${v}`)
      .join('\n\n')

    // Datos del candidato
    const candidateInfo = [
      interview.candidate_name && `Candidato: ${interview.candidate_name}`,
      interview.linkedin_url && `LinkedIn: ${interview.linkedin_url}`,
    ].filter(Boolean).join('\n')

    // Armar URL con params para pre-carga
    const params = new URLSearchParams()
    if (jdText) params.set('jd', jdText)
    if (notesText) params.set('notes', notesText)
    if (candidateInfo) params.set('candidate', candidateInfo)

    window.open(`${REPORT_URL}?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', color: '#aaa' }}>
        Cargando...
      </div>
    )
  }

  if (!interview) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', color: '#aaa' }}>
        Entrevista no encontrada. <Link href="/interview-hub" style={{ color: ORANGE, marginLeft: '8px' }}>Volver</Link>
      </div>
    )
  }

  const skills = scorecard?.scorecard_data?.skills || []
  const techSkills = skills.filter(s => s.skill_type === 'technical')
  const softSkills = skills.filter(s => s.skill_type === 'soft')
  const questionsBySkill = interview.generated_questions?.questions_by_skill || {}
  const notesCount = Object.values(notes).filter(v => v.trim()).length

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px', fontSize: '13px', color: '#aaa' }}>
          <Link href="/interview-hub" style={{ color: ORANGE, textDecoration: 'none', fontWeight: 600 }}>
            ← Interview Hub
          </Link>
          <span>/</span>
          <span>{interview.candidate_name}</span>
        </div>

        {/* Header de la entrevista */}
        <Card style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: 800, color: '#111', letterSpacing: '-0.02em' }}>
                {interview.candidate_name}
              </h1>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#555', fontWeight: 600 }}>{interview.position}</span>
                <span style={{ color: '#ddd' }}>·</span>
                <span style={{ fontSize: '14px', color: ORANGE, fontWeight: 700 }}>{interview.client_name}</span>
                {interview.scheduled_at && (
                  <>
                    <span style={{ color: '#ddd' }}>·</span>
                    <span style={{ fontSize: '13px', color: '#888', fontFamily: MONO }}>{formatDateTime(interview.scheduled_at)}</span>
                  </>
                )}
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#aaa', fontFamily: MONO }}>
                Recruiter: {interview.recruiter_name}
              </div>
            </div>

            {/* Status + links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
              {/* Status selector */}
              <select
                value={interview.status}
                onChange={e => handleStatusChange(e.target.value)}
                style={{
                  border: '1.5px solid #EBEBEB', borderRadius: '8px', padding: '6px 12px',
                  fontSize: '12px', fontFamily: MONO, fontWeight: 700, cursor: 'pointer',
                  background: 'white', color: '#555', outline: 'none',
                  appearance: 'none',
                }}
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>

              {/* Links del candidato */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {interview.linkedin_url && (
                  <a href={interview.linkedin_url.startsWith('http') ? interview.linkedin_url : `https://${interview.linkedin_url}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: '#4A90D9', textDecoration: 'none', fontFamily: MONO, fontWeight: 600 }}>
                    LinkedIn ↗
                  </a>
                )}
                {interview.cv_url && (
                  <a href={interview.cv_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: ORANGE, textDecoration: 'none', fontFamily: MONO, fontWeight: 600 }}>
                    CV ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs: Prep / Sesión */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '20px', border: '1.5px solid #EBEBEB', borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
          {[
            { key: 'prep', label: '⚡ Preparación', desc: 'Antes de la entrevista' },
            { key: 'session', label: `📝 Sesión${notesCount > 0 ? ` (${notesCount})` : ''}`, desc: 'Durante la entrevista' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: '14px 20px', border: 'none', cursor: 'pointer',
                background: activeTab === tab.key ? ORANGE : 'white',
                color: activeTab === tab.key ? 'white' : '#666',
                transition: 'all 0.18s', textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{tab.label}</div>
              <div style={{ fontSize: '11px', opacity: 0.75, fontFamily: MONO, marginTop: '2px' }}>{tab.desc}</div>
            </button>
          ))}
        </div>

        {/* TAB: PREP ────────────────────────────────────────────────────── */}
        {activeTab === 'prep' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.25s ease' }}>

            {/* Insights IA */}
            <InsightsCard
              insights={interview.ai_insights}
              loading={prepLoading}
              onGenerate={handleGeneratePrep}
            />

            {/* Scorecard info */}
            {scorecard && (
              <Card>
                <SectionHeader label="Scorecard cargado" icon="📋" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#111' }}>{scorecard.scorecard_name}</span>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#888', fontFamily: MONO }}>
                    <span>🔧 {techSkills.length} técnicos</span>
                    <span>💬 {softSkills.length} blandos</span>
                  </div>
                </div>

                {/* Preview de skills */}
                <div style={{ display: 'grid', gridTemplateColumns: techSkills.length > 0 && softSkills.length > 0 ? '1fr 1fr' : '1fr', gap: '12px' }}>
                  {techSkills.length > 0 && (
                    <div style={{ background: '#fff7ed', borderRadius: '10px', padding: '12px' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: ORANGE, fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>Técnicos</p>
                      {techSkills.map((s, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', borderBottom: i < techSkills.length - 1 ? '1px solid #fed7aa' : 'none' }}>
                          <span style={{ color: '#444' }}>{s.name}</span>
                          <span style={{ color: '#aaa', fontFamily: MONO }}>{s.weight}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {softSkills.length > 0 && (
                    <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '12px' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#4A90D9', fontFamily: MONO, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>Blandos</p>
                      {softSkills.map((s, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px', borderBottom: i < softSkills.length - 1 ? '1px solid #bfdbfe' : 'none' }}>
                          <span style={{ color: '#444' }}>{s.name}</span>
                          <span style={{ color: '#aaa', fontFamily: MONO }}>{s.weight}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Botón generar preguntas */}
                {!interview.generated_questions && skills.length > 0 && (
                  <button
                    onClick={handleGeneratePrep}
                    disabled={prepLoading}
                    style={{
                      marginTop: '16px', width: '100%', padding: '10px',
                      border: `1.5px solid ${ORANGE}`, borderRadius: '10px',
                      background: 'white', color: ORANGE, cursor: prepLoading ? 'wait' : 'pointer',
                      fontSize: '13px', fontWeight: 700, fontFamily: MONO,
                      opacity: prepLoading ? 0.6 : 1,
                    }}
                  >
                    {prepLoading ? 'Generando preguntas...' : '⚡ Generar preguntas por competencia'}
                  </button>
                )}

                {interview.generated_questions && skills.length > 0 && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '13px', color: '#16a34a' }}>
                    ✅ Preguntas listas — pasá a la tab <strong>Sesión</strong> para usarlas durante la entrevista
                  </div>
                )}
              </Card>
            )}

            {!scorecard && (
              <Card style={{ border: '1.5px dashed #EBEBEB' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#bbb', textAlign: 'center', fontFamily: MONO }}>
                  Sin scorecard para {interview.client_name} — la IA generará preguntas genéricas
                </p>
              </Card>
            )}
          </div>
        )}

        {/* TAB: SESIÓN ──────────────────────────────────────────────────── */}
        {activeTab === 'session' && (
          <div style={{ animation: 'fadeIn 0.25s ease' }}>

            {/* Indicador de guardado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>
                Tomá notas por competencia durante la entrevista. Se guardan automáticamente.
              </p>
              <span style={{ fontSize: '11px', fontFamily: MONO, color: saved ? '#16a34a' : saving ? '#f59e0b' : '#ccc' }}>
                {saved ? '✓ Guardado' : saving ? 'Guardando...' : ''}
              </span>
            </div>

            {/* Skills con notas */}
            {skills.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {/* Primero técnicos, después blandos */}
                {[...techSkills, ...softSkills].map(skill => {
                  const skillQuestions = questionsBySkill[skill.name]
                  return (
                    <SessionSkillCard
                      key={skill.name}
                      skillName={skill.name}
                      skillType={skill.skill_type}
                      questions={skillQuestions?.questions || []}
                      whatToLookFor={skillQuestions?.what_to_look_for || null}
                      note={notes[skill.name] || ''}
                      onNoteChange={handleNoteChange}
                    />
                  )
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {/* Sin scorecard: nota general */}
                <Card>
                  <SectionHeader label="Notas generales" />
                  <textarea
                    value={notes['general'] || ''}
                    onChange={e => handleNoteChange('general', e.target.value)}
                    placeholder="Tomá notas generales sobre la entrevista..."
                    style={{
                      width: '100%', border: '1.5px solid #EBEBEB', borderRadius: '8px',
                      padding: '12px 14px', fontSize: '14px', outline: 'none',
                      fontFamily: 'inherit', background: 'white', color: '#111',
                      resize: 'vertical', minHeight: '200px', lineHeight: '1.7',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = ORANGE}
                    onBlur={e => e.target.style.borderColor = '#EBEBEB'}
                  />
                </Card>
              </div>
            )}

            {/* Botón ir al reporte */}
            <Card style={{ background: 'linear-gradient(135deg, #fff7ed, #fff)', border: `1.5px solid ${ORANGE}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#111' }}>
                    ¿Terminó la entrevista?
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#888', fontFamily: MONO }}>
                    Las notas{notesCount > 0 ? ` (${notesCount} skills)` : ''} se pre-cargan en el generador de reporte
                  </p>
                </div>
                <button
                  onClick={() => {
                    handleStatusChange('completed')
                    handleGoToReport()
                  }}
                  style={{
                    padding: '12px 24px', border: 'none',
                    background: `linear-gradient(135deg, ${ORANGE}, #F47C20)`,
                    color: 'white', borderRadius: '10px', cursor: 'pointer',
                    fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap',
                    boxShadow: '0 4px 16px rgba(224,92,0,0.3)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  <span>Generar reporte</span>
                  <span style={{ fontSize: '10px', opacity: 0.85, fontFamily: MONO }}>↗ Lucía</span>
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

