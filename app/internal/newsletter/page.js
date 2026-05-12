'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

/* ── Brand v4 typewriter tokens ── */
const tw = {
  bg: '#FEFCF9',
  ink: '#1A1A1A',
  inkMid: '#3A3530',
  inkSub: '#5A5550',
  inkFaint: '#7A7874',
  rule: '#E8E4DE',
  white: '#FFFFFF',
  green: '#4A8C40',
  greenTint: 'rgba(74,140,64,0.06)',
}
const serif = "'Special Elite', Georgia, serif"
const mono = "'Courier Prime', Courier, monospace"
const ui = "'Plus Jakarta Sans', system-ui, sans-serif"

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function NewsletterListPage() {
  const router = useRouter()
  const { status: authStatus } = useSession()
  const [issues, setIssues] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [issuesRes, statsRes] = await Promise.all([
        fetch('/api/newsletter/issues', { cache: 'no-store' }),
        fetch('/api/newsletter/subscribers/stats', { cache: 'no-store' }),
      ])
      if (!issuesRes.ok) throw new Error('Failed to load issues')
      const data = await issuesRes.json()
      setIssues(data.issues || [])
      if (statsRes.ok) {
        const s = await statsRes.json()
        setStats(s.stats || null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authStatus === 'authenticated') load()
  }, [authStatus])

  async function handleNew(lang) {
    setCreating(true)
    try {
      const res = await fetch('/api/newsletter/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: lang === 'es' ? 'Nuevo número sin título' : 'Untitled new issue',
          subject: lang === 'es' ? 'Bondy Thinking' : 'Bondy Thinking',
          lang,
          content: { sections: [{ kind: 'intro', text: '' }] },
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Create failed')
      router.push(`/internal/newsletter/${data.issue.id}`)
    } catch (err) {
      alert(err.message)
    } finally {
      setCreating(false)
    }
  }

  if (authStatus === 'loading') return null

  const drafts = issues.filter((i) => i.status === 'draft')
  const sent = issues.filter((i) => i.status === 'sent')

  return (
    <div style={{ background: tw.bg, minHeight: '100vh', fontFamily: ui, color: tw.ink }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${tw.rule}`, background: tw.white }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Link href="/internal" style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: tw.inkFaint, textDecoration: 'none' }}>
              ← Internal
            </Link>
            <h1 style={{ margin: '6px 0 0 0', fontFamily: serif, fontSize: 26, fontWeight: 400, color: tw.inkMid }}>Bondy Thinking</h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => handleNew('es')}
              disabled={creating}
              style={{
                fontFamily: mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
                background: tw.green, color: '#fff', border: 'none', padding: '10px 18px',
                cursor: creating ? 'wait' : 'pointer',
              }}
            >
              + Nuevo (ES)
            </button>
            <button
              onClick={() => handleNew('en')}
              disabled={creating}
              style={{
                fontFamily: mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
                background: tw.white, color: tw.green, border: `1px solid ${tw.green}`, padding: '10px 18px',
                cursor: creating ? 'wait' : 'pointer',
              }}
            >
              + Nuevo (EN)
            </button>
          </div>
        </div>
      </div>

      {/* Subscriber stats */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 32px 0 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <StatCard label="Confirmados (ES)" value={stats?.es ?? '—'} />
          <StatCard label="Confirmados (EN)" value={stats?.en ?? '—'} />
          <StatCard label="Pendientes confirmar" value={stats?.pending ?? '—'} muted />
          <StatCard label="Cancelados" value={stats?.unsubscribed ?? '—'} muted />
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px' }}>
        {error && (
          <div style={{ padding: 16, background: '#FFF4F0', border: '1px solid #C06A2D', color: '#C06A2D', marginBottom: 24, fontFamily: mono, fontSize: 13 }}>
            {error}
          </div>
        )}
        {loading ? (
          <div style={{ fontFamily: mono, fontSize: 13, color: tw.inkFaint }}>Cargando…</div>
        ) : (
          <>
            <Section title="Borradores" issues={drafts} empty="No hay borradores. Hacé click en + Nuevo para empezar." />
            <div style={{ height: 32 }} />
            <Section title="Enviados" issues={sent} empty="Todavía no enviaste ningún número." sent />
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, muted }) {
  return (
    <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, padding: '18px 20px' }}>
      <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: muted ? tw.inkFaint : tw.green, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: serif, fontSize: 30, color: tw.inkMid, lineHeight: 1 }}>{value}</div>
    </div>
  )
}

function Section({ title, issues, empty, sent }) {
  return (
    <div>
      <h2 style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: tw.inkFaint, margin: '0 0 14px 0' }}>{title} ({issues.length})</h2>
      {issues.length === 0 ? (
        <div style={{ fontFamily: ui, fontSize: 14, color: tw.inkFaint, padding: '24px 0' }}>{empty}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: tw.rule }}>
          {issues.map((i) => (
            <Link
              key={i.id}
              href={`/internal/newsletter/${i.id}`}
              style={{ display: 'block', textDecoration: 'none', color: 'inherit', background: tw.white }}
            >
              <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: '80px 1fr 140px 110px', alignItems: 'center', gap: 16 }}>
                <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: sent ? tw.green : tw.inkFaint }}>
                  {sent ? `№ ${String(i.issue_number || '?').padStart(2, '0')}` : 'DRAFT'}
                </div>
                <div>
                  <div style={{ fontFamily: serif, fontSize: 17, color: tw.inkMid, marginBottom: 4 }}>{i.title}</div>
                  <div style={{ fontFamily: ui, fontSize: 12, color: tw.inkFaint }}>{i.subject || '—'}</div>
                </div>
                <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.inkFaint, textAlign: 'right' }}>
                  {i.lang === 'en' ? '🇺🇸 EN' : '🇦🇷 ES'} · {sent ? `${i.sent_count || 0} envíos` : ''}
                </div>
                <div style={{ fontFamily: mono, fontSize: 10, color: tw.inkFaint, textAlign: 'right' }}>
                  {fmtDate(sent ? i.sent_at : i.updated_at)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
