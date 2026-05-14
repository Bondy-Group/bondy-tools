/**
 * GET /api/session-requests/action
 *
 * Endpoint que disparan los botones del mensaje de Slack en #agentes-bondy.
 * Son URL buttons (mismo patrón que la edge function classify-lead), así que
 * NO necesitamos configurar Interactivity en la Slack App.
 *
 * Query: ?id=<uuid>&action=approve|reject|confirm_payment&consultora=Mara|Lucía&secret=<SESSION_ACTION_SECRET>
 *
 * Hace, según la acción:
 *   approve         pending  → approved  + email de aprobación
 *   reject          pending|approved → rejected + email de rechazo
 *   confirm_payment approved → paid      + email con link de agenda
 * En todos los casos: edita el mensaje de Slack para reflejar el nuevo estado.
 *
 * Devuelve una página HTML simple (se abre en el navegador al clickear).
 */

import {
  getSessionRequest,
  updateSessionRequest,
  PRODUCTOS,
  calendarLink,
  paymentInstructions,
} from '@/lib/session-requests'
import { updateSessionRequestMessage } from '@/lib/slack-sessions'
import { sendEmail } from '@/lib/resend'
import {
  renderApprovalEmail,
  renderPaymentConfirmedEmail,
  renderRejectionEmail,
} from '@/lib/email/session-requests'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACTION_SECRET = process.env.SESSION_ACTION_SECRET || 'bondy-session-action-internal'
const REPLY_TO = process.env.RESEND_REPLY_TO || 'hello@wearebondy.com'

function page({ title, body, tone = 'ok' }) {
  const accent = tone === 'error' ? '#C0392B' : '#4A8C40'
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title>
<style>
body{margin:0;background:#FEFCF9;font-family:'Courier New',monospace;color:#1A1A1A;
  display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}
.box{background:#fff;border:1px solid #E8E4DE;border-radius:12px;padding:36px 40px;max-width:440px;
  box-shadow:0 8px 24px -16px rgba(58,53,48,.2);}
.bar{width:22px;height:2px;background:${accent};margin-bottom:18px;}
h1{font-size:19px;margin:0 0 12px;color:#3A3530;}
p{font-size:13px;line-height:1.7;color:#5A5550;margin:0 0 6px;}
.tag{display:inline-block;margin-top:14px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;
  color:${accent};border:1px solid ${accent};border-radius:999px;padding:3px 10px;}
</style></head><body><div class="box"><div class="bar"></div>
<h1>${title}</h1>${body}</div></body></html>`
}

function html(res, status = 200) {
  return new Response(res, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') || ''
  const action = searchParams.get('action') || ''
  const consultoraParam = searchParams.get('consultora') || ''
  const secret = searchParams.get('secret') || ''

  if (secret !== ACTION_SECRET) {
    return html(page({ title: 'Acceso denegado', tone: 'error', body: '<p>El link no es válido.</p>' }), 401)
  }
  if (!id || !['approve', 'reject', 'confirm_payment'].includes(action)) {
    return html(page({ title: 'Link inválido', tone: 'error', body: '<p>Falta el id o la acción.</p>' }), 400)
  }

  const got = await getSessionRequest(id)
  if (!got.ok) {
    return html(page({ title: 'No encontrada', tone: 'error', body: '<p>No existe esa solicitud.</p>' }), 404)
  }
  const row = got.row

  // ─── Validación de transición ───────────────────────────────────
  const valid =
    (action === 'approve' && row.estado === 'pending') ||
    (action === 'reject' && (row.estado === 'pending' || row.estado === 'approved')) ||
    (action === 'confirm_payment' && row.estado === 'approved')

  if (!valid) {
    return html(
      page({
        title: 'Sin cambios',
        body: `<p>Esta solicitud ya está en estado <strong>${row.estado}</strong>. No se hizo nada.</p>
               <span class="tag">${row.nombre}</span>`,
      }),
    )
  }

  // ─── Aplicar cambio ─────────────────────────────────────────────
  let patch = { decided_at: new Date().toISOString() }
  let emailResult = { skipped: true }
  let title, body

  if (action === 'approve') {
    const consultora =
      consultoraParam === 'Mara' || consultoraParam === 'Lucía'
        ? consultoraParam
        : row.consultora_preferida === 'Lucía'
          ? 'Lucía'
          : 'Mara'
    patch.estado = 'approved'
    patch.consultora_asignada = consultora
    const prod = PRODUCTOS[row.producto] || {}
    const mail = renderApprovalEmail({
      nombre: row.nombre,
      producto: row.producto,
      consultora,
      precio: prod.precio || null,
      precioOriginal: prod.precioOriginal || null,
      paymentInstructions: paymentInstructions(),
    })
    emailResult = await sendEmail({
      to: row.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      from: `${consultora} de Bondy <${REPLY_TO}>`,
      tags: [{ name: 'type', value: 'session-approval' }],
    })
    title = 'Solicitud aprobada'
    body = `<p>Le mandamos a <strong>${row.nombre}</strong> el email de aprobación con las instrucciones de pago.</p>
            <p>Consultora asignada: <strong>${consultora}</strong>.</p>
            <p>Cuando confirmes el pago, volvé al mensaje de Slack y tocá "Confirmar pago".</p>
            <span class="tag">estado: approved</span>`
  } else if (action === 'confirm_payment') {
    const consultora = row.consultora_asignada || (row.consultora_preferida === 'Lucía' ? 'Lucía' : 'Mara')
    patch.estado = 'paid'
    const mail = renderPaymentConfirmedEmail({
      nombre: row.nombre,
      consultora,
      calendarUrl: calendarLink(consultora),
    })
    emailResult = await sendEmail({
      to: row.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      from: `${consultora} de Bondy <${REPLY_TO}>`,
      tags: [{ name: 'type', value: 'session-paid' }],
    })
    title = 'Pago confirmado'
    body = `<p>Le mandamos a <strong>${row.nombre}</strong> el email con el link de la agenda de <strong>${consultora}</strong>.</p>
            ${calendarLink(consultora) ? '' : '<p>⚠️ Ojo: todavía no hay link de calendario cargado en las env vars — el email salió con un texto placeholder.</p>'}
            <span class="tag">estado: paid</span>`
  } else {
    // reject
    patch.estado = 'rejected'
    const consultora = row.consultora_asignada || null
    const mail = renderRejectionEmail({
      nombre: row.nombre,
      consultora,
      paginaOrigen: row.pagina_origen,
    })
    emailResult = await sendEmail({
      to: row.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      from: `Bondy <${REPLY_TO}>`,
      tags: [{ name: 'type', value: 'session-rejection' }],
    })
    title = 'Solicitud rechazada'
    body = `<p>Le mandamos a <strong>${row.nombre}</strong> el email de rechazo.</p>
            <span class="tag">estado: rejected</span>`
  }

  const upd = await updateSessionRequest(id, patch)
  if (!upd.ok) {
    return html(
      page({ title: 'Error al guardar', tone: 'error', body: '<p>No se pudo actualizar el estado. Probá de nuevo.</p>' }),
      500,
    )
  }

  // Editar el mensaje de Slack (best-effort).
  try {
    if (row.slack_message_ts) {
      await updateSessionRequestMessage(row.slack_message_ts, upd.row)
    }
  } catch (e) {
    console.error('[session-action] slack update threw', e)
  }

  if (emailResult && emailResult.ok === false) {
    body += '<p>⚠️ El estado se guardó, pero el email falló al enviarse. Revisá Resend.</p>'
  }

  return html(page({ title, body }))
}
