'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwHgZDqZ7Q-NMfqX7xTpXr_WwRx5ukqtojpsNZh8AEvvm2mn6JzUrShze7CIxcGnwWNvg/exec'

const NAME_ALIASES = {
  'Laura': 'Laura Schmitman',
  'Laura Schmitman': 'Laura Schmitman',
  'Lau': 'Laura Schmitman',
  'Mara': 'Mara Schmitman',
  'Mara Schmitman': 'Mara Schmitman',
  'Rodri': 'Rodrigo Lopez Paiva',
  'Rodrigo Lopez Paiva': 'Rodrigo Lopez Paiva',
  'Lucia': 'Lucia Palomeque',
  'Lu': 'Lucia Palomeque',
  'Lucia Palomeque': 'Lucia Palomeque',
  'Ximena': 'Ximena Ubellart',
  'Xime': 'Ximena Ubellart',
  'Ximena Ubellart': 'Ximena Ubellart',
  'Faca': 'Faca',
}

const USERS = [
  'Laura Schmitman',
  'Mara Schmitman',
  'Rodrigo Lopez Paiva',
  'Lucia Palomeque',
  'Ximena Ubellart',
]

const serif = "'Special Elite', Georgia, serif"
const mono = "'Courier Prime', Courier, monospace"
const ui = "'Plus Jakarta Sans', system-ui, sans-serif"
const tw = {
  bg: '#FEFCF9',
  inkMid: '#3A3530',
  inkSub: '#5A5550',
  inkFaint: '#7A7874',
  rule: '#E8E4DE',
  green: '#4A8C40',
  white: '#FFFFFF',
}

function normalizeName(n) {
  if (!n) return ''
  return NAME_ALIASES[String(n).trim()] || String(n).trim()
}

function formatAmt(n, moneda) {
  if (!n || isNaN(n) || Number(n) === 0) return '—'
  const currency = String(moneda || 'USD').trim().toUpperCase() === 'ARG' ? 'ARS' : 'USD'
  const decimals = currency === 'ARS' ? 0 : 2
  return currency + ' ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
}

function fmtDate(val) {
  if (!val) return '—'
  if (typeof val === 'string' && val.includes('-')) return val
  const d = new Date((val - 25569) * 86400 * 1000)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function StatusDot({ estado }) {
  const lower = String(estado || '').toLowerCase()
  const color = lower.includes('pagado') ? '#3d6b4f' : lower.includes('impago') ? '#c0392b' : '#b87333'
  return <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, marginRight: 4 }} />
}

function RoleBadge({ role }) {
  const styles = {
    Recruiter: { background: '#d4e8da', color: '#2d5a3d', border: '1px solid #a8ccb4' },
    Sourcer: { background: '#e8dfc8', color: '#6b5a2d', border: '1px solid #c8b888' },
    'DM 10%': { background: '#e8d4f0', color: '#5a2d7a', border: '1px solid #c4a8d8' },
  }
  const s = styles[role] || styles.Recruiter
  return (
    <span style={{ ...s, fontSize: 10, padding: '2px 8px', borderRadius: 20, fontFamily: mono, fontWeight: 500, letterSpacing: '0.5px' }}>
      {role}
    </span>
  )
}

function Card({ r, user, isPaid, isDMCard, invoiceSent, onInvoice }) {
  const isRecruiter = !isDMCard && normalizeName(r.recruiter) === user
  const role = isDMCard ? 'DM 10%' : isRecruiter ? 'Recruiter' : 'Sourcer'
  const monto = isDMCard ? r.monto10 : isRecruiter ? r.comisionRecruiter : r.comisionSourcer
  const key = isDMCard ? `${r.ref}__DM` : `${r.ref}__${role}`
  const alreadySent = invoiceSent[key]
  const estadoCliente = String(r.estado || '').toLowerCase()
  const hasPendingPayment = estadoCliente.includes('esperando')

  const cardBg = alreadySent ? '#eaf3ec' : hasPendingPayment ? '#FEFCF9' : tw.white
  const cardBorder = alreadySent ? '#a8ccb4' : hasPendingPayment ? '#c8b888' : tw.rule

  return (
    <div style={{
      background: cardBg,
      border: `1px solid ${cardBorder}`,
      borderRadius: 8,
      padding: '16px 20px',
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: 16,
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: ui, fontSize: 15, fontWeight: 500, color: tw.inkMid }}>
          {r.ref}
          <RoleBadge role={role} />
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: mono, fontSize: 11, color: tw.inkSub, display: 'flex', alignItems: 'center' }}>
            <span style={{ color: tw.inkFaint, marginRight: 4 }}>estado cliente</span>
            <StatusDot estado={r.estado} />
            {r.estado || '—'}
          </span>
          {r.invoiceDate && <span style={{ fontFamily: mono, fontSize: 11, color: tw.inkSub }}><span style={{ color: tw.inkFaint }}>invoice </span>{fmtDate(r.invoiceDate)}</span>}
          {r.paymentDate && <span style={{ fontFamily: mono, fontSize: 11, color: tw.inkSub }}><span style={{ color: tw.inkFaint }}>pago </span>{fmtDate(r.paymentDate)}</span>}
          {r.obs && <span style={{ fontFamily: mono, fontSize: 11, color: tw.inkSub }}><span style={{ color: tw.inkFaint }}>obs </span>{r.obs}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
        <span style={{ fontFamily: mono, fontSize: 22, fontWeight: 600, color: isPaid ? tw.inkFaint : tw.green }}>
          {formatAmt(monto, r.moneda)}
        </span>
        {!isPaid && (
          <button
            onClick={() => !alreadySent && onInvoice({ ref: r.ref, role, amount: monto, person: isDMCard ? 'Lucia Palomeque' : user, moneda: r.moneda || 'USD', key })}
            style={{
              background: alreadySent ? '#d4e8da' : 'transparent',
              border: alreadySent ? '1px solid #a8ccb4' : `1px solid ${tw.rule}`,
              color: alreadySent ? '#2d5a3d' : tw.inkSub,
              padding: '6px 12px',
              borderRadius: 6,
              fontFamily: ui,
              fontSize: 12,
              cursor: alreadySent ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap',
            }}
          >
            {alreadySent ? '✓' : '↑'} {alreadySent ? 'Invoice enviado' : 'Marcar invoice enviado'}
          </button>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ children, style }) {
  return (
    <div style={{
      fontFamily: mono,
      fontSize: 10,
      color: tw.inkFaint,
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
      marginBottom: 10,
      paddingBottom: 8,
      borderBottom: `1px solid ${tw.rule}`,
      ...style,
    }}>{children}</div>
  )
}

export default function SeguimientoPagos() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email)

  const [selectedUser, setSelectedUser] = useState('')
  const [allData, setAllData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [invoiceSent, setInvoiceSent] = useState({})
  const [modal, setModal] = useState(null) // { ref, role, amount, person, moneda, key }
  const [modalEmail, setModalEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        setInvoiceSent(JSON.parse(localStorage.getItem('invoiceSent') || '{}'))
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (!selectedUser) return
    setLoading(true)
    setError(null)
    fetch(`${SCRIPT_URL}?action=getData`)
      .then(r => r.json())
      .then(data => { setAllData(data); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [selectedUser])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function confirmInvoice() {
    if (!modal) return
    setSending(true)
    try {
      const url = `${SCRIPT_URL}?action=sendInvoice` +
        `&ref=${encodeURIComponent(modal.ref)}` +
        `&person=${encodeURIComponent(modal.person)}` +
        `&role=${encodeURIComponent(modal.role)}` +
        `&amount=${modal.amount}` +
        `&email=${encodeURIComponent(modalEmail)}`
      await fetch(url)
    } catch {}
    const updated = { ...invoiceSent, [modal.key]: true }
    setInvoiceSent(updated)
    if (typeof window !== 'undefined') localStorage.setItem('invoiceSent', JSON.stringify(updated))
    setModal(null)
    setSending(false)
    showToast('✓ Notificación enviada correctamente')
  }

  // Derived data
  const isDM = selectedUser === 'Lucia Palomeque'

  const myRows = allData.filter(r => {
    const rec = normalizeName(r.recruiter)
    const src = normalizeName(r.sourcer)
    return rec === selectedUser || src === selectedUser
  })

  const dmRows = isDM ? allData.filter(r => {
    const estado10 = String(r.estado10 || '').trim().toLowerCase()
    return estado10 !== 'incluido' && r.monto10 > 0
  }) : []

  // Summary
  let pendienteUSD = 0, pendienteARS = 0, cobradoUSD = 0, cobradoARS = 0, pendienteCount = 0
  myRows.forEach(r => {
    const isRec = normalizeName(r.recruiter) === selectedUser
    const monto = isRec ? (r.comisionRecruiter || 0) : (r.comisionSourcer || 0)
    const paid = isRec ? r.estadoPagoRecruiters : r.estadoPagoSourcer
    const isARS = String(r.moneda || '').trim().toUpperCase() === 'ARG'
    if (paid && String(paid).toLowerCase().includes('pagado')) {
      isARS ? cobradoARS += Number(monto) : cobradoUSD += Number(monto)
    } else if (monto > 0) {
      isARS ? pendienteARS += Number(monto) : pendienteUSD += Number(monto)
      pendienteCount++
    }
  })
  dmRows.forEach(r => {
    const estado10 = String(r.estado10 || '').trim().toLowerCase()
    const monto = Number(r.monto10) || 0
    const isARS = String(r.moneda || '').trim().toUpperCase() === 'ARG'
    if (estado10 === 'facturado') {
      isARS ? cobradoARS += monto : cobradoUSD += monto
    } else {
      isARS ? pendienteARS += monto : pendienteUSD += monto
      pendienteCount++
    }
  })

  const pending = myRows.filter(r => {
    const isRec = normalizeName(r.recruiter) === selectedUser
    const paid = isRec ? r.estadoPagoRecruiters : r.estadoPagoSourcer
    return !paid || !String(paid).toLowerCase().includes('pagado')
  })
  const paid = myRows.filter(r => {
    const isRec = normalizeName(r.recruiter) === selectedUser
    const paidVal = isRec ? r.estadoPagoRecruiters : r.estadoPagoSourcer
    return paidVal && String(paidVal).toLowerCase().includes('pagado')
  })
  const dmPending = dmRows.filter(r => String(r.estado10 || '').trim().toLowerCase() !== 'facturado')
  const dmPaid = dmRows.filter(r => String(r.estado10 || '').trim().toLowerCase() === 'facturado')

  if (status === 'loading') return null

  return (
    <main style={{ background: tw.bg, minHeight: '100vh', fontFamily: ui }}>

      {/* Nav */}
      <nav style={{
        borderBottom: `1px solid ${tw.rule}`,
        padding: '0 clamp(1.25rem,5vw,4rem)',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(254,252,249,0.97)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: serif, fontSize: 16, color: '#1A1A1A', letterSpacing: '0.04em' }}>BONDY</span>
          <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: tw.green, border: `1px solid rgba(74,140,64,0.3)`, padding: '3px 8px' }}>
            Internal
          </span>
          <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.inkFaint }}>
            / Seguimiento de Pagos
          </span>
        </div>
        <Link href="/internal" style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.inkFaint, textDecoration: 'none' }}>
          ← Volver
        </Link>
      </nav>

      <div style={{ padding: '2.5rem clamp(1.25rem,5vw,4rem)', maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
            <div style={{ width: 20, height: 1, background: tw.green }} />
            <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green }}>
              Panel interno · recruiters & sourcers
            </span>
          </div>
          <h1 style={{ fontFamily: serif, fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', lineHeight: 1.1, color: tw.inkMid, marginBottom: '0.25rem' }}>
            Seguimiento de Pagos
          </h1>
          <svg width="160" height="8" viewBox="0 0 160 8" fill="none" style={{ display: 'block', marginBottom: '1rem' }}>
            <path d="M0 4 Q40 1 80 4 Q120 7 160 4" stroke="#4A8C40" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </div>

        {/* User selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
          <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: tw.inkFaint }}>
            Viendo como
          </span>
          <select
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            style={{
              background: '#F0EBE0',
              border: `1px solid ${tw.rule}`,
              color: tw.inkMid,
              padding: '8px 14px',
              borderRadius: 6,
              fontFamily: ui,
              fontSize: 14,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">— seleccioná tu nombre —</option>
            {USERS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        {/* Summary */}
        {selectedUser && !loading && !error && (myRows.length > 0 || dmRows.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 10, marginBottom: '2rem' }}>
            {[
              {
                label: 'Pendiente de cobro',
                value: [pendienteUSD > 0 ? formatAmt(pendienteUSD, 'USD') : null, pendienteARS > 0 ? formatAmt(pendienteARS, 'ARG') : null].filter(Boolean).join(' / ') || '—',
                sub: `${pendienteCount} búsqueda${pendienteCount !== 1 ? 's' : ''}`,
                accent: true,
              },
              {
                label: 'Ya cobrado',
                value: [cobradoUSD > 0 ? formatAmt(cobradoUSD, 'USD') : null, cobradoARS > 0 ? formatAmt(cobradoARS, 'ARG') : null].filter(Boolean).join(' / ') || '—',
                sub: 'este período',
              },
              {
                label: 'Total búsquedas',
                value: myRows.length + (isDM ? dmRows.length : 0),
                sub: `como recruiter o sourcer${isDM ? ' + DM' : ''}`,
              },
            ].map(card => (
              <div key={card.label} style={{
                background: tw.white,
                border: `1px solid ${tw.rule}`,
                borderTop: card.accent ? `2px solid ${tw.green}` : `1px solid ${tw.rule}`,
                borderRadius: 8,
                padding: 18,
              }}>
                <div style={{ fontFamily: mono, fontSize: 10, color: tw.inkFaint, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{card.label}</div>
                <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 600, color: card.accent ? tw.green : tw.inkMid }}>{card.value}</div>
                <div style={{ fontFamily: ui, fontSize: 12, color: tw.inkSub, marginTop: 4 }}>{card.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {!selectedUser && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: tw.inkFaint, fontFamily: ui, fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>👆</div>
            Seleccioná tu nombre para ver tus búsquedas y montos
          </div>
        )}

        {selectedUser && loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: tw.inkFaint, fontFamily: mono, fontSize: 13 }}>
            Cargando datos...
          </div>
        )}

        {selectedUser && error && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: tw.inkFaint, fontFamily: ui, fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            No se pudo conectar con Google Sheets.
            <div style={{ fontSize: 12, marginTop: 8 }}>Verificá que el Apps Script esté deployado.</div>
          </div>
        )}

        {selectedUser && !loading && !error && myRows.length === 0 && dmRows.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: tw.inkFaint, fontFamily: ui, fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>🔍</div>
            No hay búsquedas registradas para {selectedUser}
          </div>
        )}

        {selectedUser && !loading && !error && (
          <>
            {pending.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <SectionTitle>{pending.length} búsqueda{pending.length !== 1 ? 's' : ''} pendiente{pending.length !== 1 ? 's' : ''}</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pending.map(r => <Card key={`${r.ref}-pending`} r={r} user={selectedUser} isPaid={false} isDMCard={false} invoiceSent={invoiceSent} onInvoice={setModal} />)}
                </div>
              </div>
            )}

            {dmPending.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <SectionTitle style={{ marginTop: pending.length > 0 ? 24 : 0 }}>10% DM — pendiente de facturar</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dmPending.map(r => <Card key={`${r.ref}-dmpending`} r={r} user={selectedUser} isPaid={false} isDMCard={true} invoiceSent={invoiceSent} onInvoice={setModal} />)}
                </div>
              </div>
            )}

            {paid.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <SectionTitle style={{ marginTop: 24 }}>{paid.length} cobrada{paid.length !== 1 ? 's' : ''}</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {paid.map(r => <Card key={`${r.ref}-paid`} r={r} user={selectedUser} isPaid={true} isDMCard={false} invoiceSent={invoiceSent} onInvoice={setModal} />)}
                </div>
              </div>
            )}

            {dmPaid.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <SectionTitle style={{ marginTop: paid.length > 0 ? 8 : 24 }}>10% DM — facturado</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dmPaid.map(r => <Card key={`${r.ref}-dmpaid`} r={r} user={selectedUser} isPaid={true} isDMCard={true} invoiceSent={invoiceSent} onInvoice={setModal} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{
            background: '#F0EBE0',
            border: `1px solid ${tw.rule}`,
            borderRadius: 12,
            padding: 28,
            width: '100%',
            maxWidth: 420,
            margin: 24,
          }}>
            <h2 style={{ fontFamily: serif, fontSize: 18, color: tw.inkMid, marginBottom: 6 }}>Confirmar envío de invoice</h2>
            <p style={{ fontFamily: ui, fontSize: 13, color: tw.inkSub, marginBottom: 20, lineHeight: 1.6 }}>
              Al confirmar, se enviará una notificación al administrador y recibirás una copia en tu mail.
            </p>
            <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, borderRadius: 6, padding: 14, marginBottom: 20 }}>
              <div style={{ fontFamily: ui, fontSize: 14, fontWeight: 500, color: tw.inkMid }}>{modal.ref}</div>
              <div style={{ fontFamily: mono, fontSize: 20, fontWeight: 600, color: tw.green, margin: '4px 0' }}>{formatAmt(modal.amount, modal.moneda)}</div>
              <div style={{ fontFamily: ui, fontSize: 12, color: tw.inkSub }}>{modal.person} · {modal.role}</div>
            </div>
            <input
              type="email"
              placeholder="Tu mail para la confirmación"
              value={modalEmail}
              onChange={e => setModalEmail(e.target.value)}
              style={{
                width: '100%',
                background: tw.white,
                border: `1px solid ${tw.rule}`,
                color: tw.inkMid,
                padding: '9px 12px',
                borderRadius: 6,
                fontFamily: ui,
                fontSize: 14,
                outline: 'none',
                marginBottom: 14,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModal(null)}
                style={{ padding: '8px 18px', borderRadius: 6, fontFamily: ui, fontSize: 14, cursor: 'pointer', background: 'transparent', border: `1px solid ${tw.rule}`, color: tw.inkSub }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmInvoice}
                disabled={sending}
                style={{ padding: '8px 18px', borderRadius: 6, fontFamily: ui, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: tw.green, color: '#fff', border: 'none', opacity: sending ? 0.5 : 1 }}
              >
                {sending ? 'Enviando...' : 'Enviar notificación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: tw.white,
          border: `1px solid ${tw.rule}`,
          borderLeft: `3px solid ${tw.green}`,
          padding: '12px 16px',
          borderRadius: 8,
          fontFamily: ui,
          fontSize: 13,
          color: tw.inkMid,
          zIndex: 200,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}>
          {toast}
        </div>
      )}
    </main>
  )
}
