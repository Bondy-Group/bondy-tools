'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

const tw = {
  bg: '#FEFCF9', ink: '#1A1A1A', inkMid: '#3A3530', inkSub: '#5A5550',
  inkFaint: '#7A7874', rule: '#E8E4DE', white: '#FFFFFF', green: '#4A8C40',
}
const serif = "'Special Elite', Georgia, serif"
const mono = "'Courier Prime', Courier, monospace"
const notebookBg = [
  'linear-gradient(90deg, transparent 68px, rgba(210,100,80,0.10) 68px, rgba(210,100,80,0.10) 69.5px, transparent 69.5px)',
  'repeating-linear-gradient(180deg, transparent 0px, transparent 31px, rgba(100,140,200,0.09) 31px, rgba(100,140,200,0.09) 32px)',
].join(',')

export default function ApplicationsPage() {
  const { status: authStatus, data: session } = useSession()
  const [apps, setApps] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ role_id: '', status: '', q: '' })

  async function loadApps() {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      for (const [k, v] of Object.entries(filters)) if (v) qs.append(k, v)
      const res = await fetch('/api/bondy-applications?' + qs.toString(), { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setApps(data.applications || [])
    } catch (err) {
      setError(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function loadRoles() {
    try {
      const res = await fetch('/api/bondy-roles', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setRoles(data.roles || [])
    } catch {}
  }

  useEffect(() => {
    if (authStatus === 'authenticated') {
      loadApps()
      loadRoles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus])

  useEffect(() => {
    if (authStatus !== 'authenticated') return
    const id = setTimeout(loadApps, 250)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.role_id, filters.status, filters.q])

  async function downloadCV(appId) {
    try {
      const res = await fetch(`/api/bondy-applications/${appId}/cv`, { cache: 'no-store' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'No se pudo obtener el CV')
        return
      }
      const { url } = await res.json()
      window.open(url, '_blank', 'noopener')
    } catch (err) {
      alert('Error obteniendo el CV')
    }
  }

  if (authStatus === 'loading') return <Centered>Cargando sesión…</Centered>

  return (
    <div style={{ minHeight: '100vh', background: tw.bg, backgroundImage: notebookBg, fontFamily: mono, color: tw.ink }}>
      <Header session={session} />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: 'clamp(1.5rem,3vw,2rem) clamp(1rem,3vw,2.5rem)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: tw.green, marginBottom: '0.5rem' }}>
              — Admin · Aplicaciones
            </div>
            <h1 style={{ fontFamily: serif, fontSize: 'clamp(2rem,4.5vw,3rem)', lineHeight: 1.05, color: tw.inkMid, margin: 0, opacity: 0.93 }}>
              Aplicaciones entrantes.
            </h1>
            <p style={{ fontSize: '13px', color: tw.inkFaint, marginTop: '0.6rem', maxWidth: '560px' }}>
              Cada aplicación enviada desde wearebondy.com/roles. CVs con link temporal (1hs).
            </p>
          </div>
          <Link href="/internal/job-board" style={{ ...btnGhost, textDecoration: 'none', display: 'inline-block' }}>
            ← Ver búsquedas
          </Link>
        </div>

        {/* Filters */}
        <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Buscar por nombre o email…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            style={{ ...inputBase, flex: '1 1 240px', minWidth: '220px' }}
          />
          <select value={filters.role_id} onChange={(e) => setFilters((f) => ({ ...f, role_id: e.target.value }))} style={{ ...inputBase, width: 'auto', flex: '0 0 auto' }}>
            <option value="">Búsqueda (todas)</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>#{r.position_number} · {r.title}</option>
            ))}
          </select>
          <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} style={{ ...inputBase, width: 'auto', flex: '0 0 auto' }}>
            <option value="">Status (todos)</option>
            <option value="new">new</option>
            <option value="reviewed">reviewed</option>
            <option value="advanced">advanced</option>
            <option value="rejected">rejected</option>
          </select>
          <button onClick={() => setFilters({ role_id: '', status: '', q: '' })} style={btnGhost}>Limpiar</button>
        </div>

        {loading ? (
          <Centered>Cargando…</Centered>
        ) : error ? (
          <Centered error>{error}</Centered>
        ) : apps.length === 0 ? (
          <Centered>Sin aplicaciones con estos filtros.</Centered>
        ) : (
          <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8F5F0', borderBottom: `1px solid ${tw.rule}` }}>
                  <Th>Fecha</Th>
                  <Th>Candidato</Th>
                  <Th>Búsqueda</Th>
                  <Th>Status</Th>
                  <Th>CV</Th>
                  <Th>LinkedIn</Th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${tw.rule}`, verticalAlign: 'top' }}>
                    <Td muted>
                      {new Date(a.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                      <div style={{ fontSize: '10px', color: tw.inkFaint }}>
                        {new Date(a.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </Td>
                    <Td>
                      <div style={{ fontFamily: serif, fontSize: '14px', color: tw.inkMid }}>{a.full_name}</div>
                      <a href={`mailto:${a.email}`} style={{ fontSize: '11px', color: tw.green, textDecoration: 'none' }}>{a.email}</a>
                      {a.notes && (
                        <div style={{ fontSize: '11px', color: tw.inkFaint, marginTop: 4, fontStyle: 'italic', maxWidth: 260 }}>
                          "{a.notes}"
                        </div>
                      )}
                    </Td>
                    <Td>
                      {a.role ? (
                        <>
                          <div style={{ fontSize: '12px', color: tw.inkSub }}>{a.role.title}</div>
                          <div style={{ fontSize: '10px', color: tw.inkFaint }}>
                            {a.role.client_visible ? a.role.client_name : (a.role.client_blurb || 'Confidential')}
                            {a.role.seniority ? ` · ${a.role.seniority}` : ''}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: tw.inkFaint }}>—</span>
                      )}
                    </Td>
                    <Td>
                      <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: tw.inkSub }}>
                        {a.status}
                      </span>
                    </Td>
                    <Td>
                      {a.cv_storage_path ? (
                        <button onClick={() => downloadCV(a.id)} style={btnMini}>
                          Descargar PDF ↓
                        </button>
                      ) : (
                        <span style={{ color: tw.inkFaint, fontSize: '11px' }}>—</span>
                      )}
                    </Td>
                    <Td>
                      {a.linkedin_url ? (
                        <a href={a.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: tw.green, fontSize: '11px' }}>
                          Abrir ↗
                        </a>
                      ) : (
                        <span style={{ color: tw.inkFaint, fontSize: '11px' }}>—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* Shared primitives (same as job-board page) */
function Header({ session }) {
  return (
    <div style={{ borderBottom: `1px solid ${tw.rule}`, background: 'rgba(254,252,249,0.95)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0.9rem clamp(1rem,3vw,2.5rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/internal" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
          <svg width="22" height="22" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <rect x="4" y="5" width="14" height="12" rx="2.5" fill="#1A1A1A"/>
            <rect x="22" y="5" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".18"/>
            <rect x="4" y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".42"/>
            <rect x="22" y="22" width="14" height="12" rx="2.5" fill="#4A8C40"/>
          </svg>
          <span style={{ fontFamily: serif, fontSize: 15, letterSpacing: '0.04em' }}>BONDY · Tools</span>
        </Link>
        <span style={{ fontSize: '11px', letterSpacing: '0.1em', color: tw.inkFaint }}>{session?.user?.email}</span>
      </div>
    </div>
  )
}
function Th({ children }) {
  return <th style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tw.inkFaint, textAlign: 'left', padding: '12px 14px', fontWeight: 400 }}>{children}</th>
}
function Td({ children, muted }) {
  return <td style={{ padding: '12px 14px', color: muted ? tw.inkFaint : tw.inkSub, fontSize: '13px' }}>{children}</td>
}
function Centered({ children, error }) {
  return <div style={{ padding: '3rem 1rem', textAlign: 'center', color: error ? '#B84A3A' : tw.inkFaint, fontSize: '13px' }}>{children}</div>
}

const inputBase = {
  fontFamily: mono, fontSize: '13px', color: tw.ink, background: tw.white,
  border: `1px solid ${tw.rule}`, padding: '8px 12px', outline: 'none', boxSizing: 'border-box',
}
const btnGhost = {
  fontFamily: mono, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase',
  background: 'transparent', color: tw.inkSub, border: `1px solid ${tw.rule}`, padding: '10px 16px', cursor: 'pointer',
}
const btnMini = {
  fontFamily: mono, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
  background: 'transparent', color: tw.inkSub, border: `1px solid ${tw.rule}`, padding: '5px 10px', cursor: 'pointer',
}
