/**
 * Emails de Sesiones de Carrera — consultoría de carrera 1 a 1.
 *
 * Tres emails, todos automáticos, disparados desde los botones del mensaje
 * de Slack en #agentes-bondy:
 *   - renderApprovalEmail        estado pending  → approved
 *   - renderPaymentConfirmedEmail estado approved → paid
 *   - renderRejectionEmail        estado pending/approved → rejected
 *
 * Sistema visual typewriter/crema v4 — mismo que el welcome del digest,
 * así el candidato reconoce la marca. Copy tal cual el brief de Alex.
 */

const HOST = 'https://tools.wearebondy.com'

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Nombre completo de la consultora (la lógica usa el valor corto Mara/Lucía).
function fullName(consultora) {
  return consultora === 'Lucía' ? 'Lucía Palomeque' : 'Mara Schmitman'
}

// Firma de la consultora — Special Elite (con fallback Courier) + verde acento.
function signatureHtml(consultora) {
  const name = fullName(consultora)
  const role = consultora === 'Lucía' ? 'Head of Delivery · Bondy' : 'Founder · Bondy'
  return `<tr><td style="padding:32px 40px 40px 40px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tr><td style="border-top:1px solid #E8E4DE; padding-top:20px;">
        <p style="margin:0; font-family:'Courier New', monospace; font-size:14px; color:#1A1A1A; font-weight:700;">${escapeHtml(name)}</p>
        <p style="margin:2px 0 0 0; font-family:'Courier New', monospace; font-size:11px; color:#7A7874;">${escapeHtml(role)}</p>
        <a href="https://wearebondy.com" style="display:inline-block; margin-top:8px; font-family:'Courier New', monospace; font-size:11px; color:#4A8C40; text-decoration:none;">wearebondy.com</a>
      </td></tr>
    </table>
  </td></tr>`
}

function shell({ preheader, kicker, bodyRows, consultora }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(kicker)}</title>
</head>
<body style="margin:0; padding:0; background:#FEFCF9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
<span style="display:none; overflow:hidden; line-height:1px; opacity:0; max-height:0; max-width:0;">${escapeHtml(preheader)}</span>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#FEFCF9; padding:40px 20px;">
  <tr><td align="center">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px; background:#FFFFFF; border:1px solid #E8E4DE;">
      <tr><td style="padding:40px 40px 8px 40px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
          <td style="padding-right:10px;"><span style="display:inline-block; width:18px; height:1px; background:#4A8C40; vertical-align:middle;"></span></td>
          <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:#4A8C40; font-weight:500;">BONDY · SESIONES DE CARRERA</td>
        </tr></table>
      </td></tr>
      ${bodyRows}
      ${signatureHtml(consultora)}
    </table>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;">
      <tr><td style="padding:18px 40px; font-family:'Courier New', monospace; font-size:10px; color:#A8A6A2; text-align:center;">
        © 2026 Bondy Group · Buenos Aires
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

function para(text, opts = {}) {
  const color = opts.muted ? '#7A7874' : '#3A3530'
  return `<tr><td style="padding:${opts.pt || 16}px 40px 0 40px;">
    <p style="margin:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:15px; line-height:1.7; color:${color};">${text}</p>
  </td></tr>`
}

function block(label, value) {
  return `<tr><td style="padding:20px 40px 0 40px;">
    <div style="background:#FBFAF8; border-left:3px solid #4A8C40; padding:14px 18px;">
      <p style="margin:0; font-family:'Courier New', monospace; font-size:9px; letter-spacing:1.5px; text-transform:uppercase; color:#7A7874;">${escapeHtml(label)}</p>
      <p style="margin:5px 0 0 0; font-family:'Courier New', monospace; font-size:13px; line-height:1.6; color:#1A1A1A;">${value}</p>
    </div>
  </td></tr>`
}

// ─── 1 · APROBACIÓN ────────────────────────────────────────────────
export function renderApprovalEmail({ nombre, producto, consultora, precio, precioOriginal, paymentInstructions }) {
  const n = escapeHtml((nombre || '').split(' ')[0] || nombre)
  const consultoraNombre = escapeHtml(fullName(consultora))
  const precioLine = precio
    ? `Con la promo de <strong>50% OFF</strong> sale <strong>${escapeHtml(precio)}</strong>${precioOriginal ? ` (en vez de ${escapeHtml(precioOriginal)})` : ''} y se abona antes de la primera sesión.`
    : `El precio lo definimos en la primera charla según lo que necesites.`
  const bodyRows = [
    para(`Hola ${n},`, { pt: 28 }),
    para('Leímos tu solicitud y queremos avanzar.'),
    para(`Pediste <strong>${escapeHtml(producto)}</strong> con <strong>${consultoraNombre}</strong>. ${precioLine}`),
    para('Para reservar, primero el pago:'),
    block('Cómo pagar', escapeHtml(paymentInstructions).replace(/\n/g, '<br>')),
    para('Cuando confirmemos que entró, te llega el link para elegir día y horario en la agenda de ' + consultoraNombre + '. Suele ser dentro del día hábil.'),
    para('Cualquier duda, respondé este mismo mail.', { muted: true }),
  ].join('')
  const precioTextLine = precio
    ? `Con la promo de 50% OFF sale ${precio}${precioOriginal ? ` (en vez de ${precioOriginal})` : ''} y se abona antes de la primera sesión.`
    : 'El precio lo definimos en la primera charla según lo que necesites.'
  return {
    subject: 'Avanzamos con tu sesión de carrera',
    html: shell({
      preheader: 'Leímos tu solicitud y queremos avanzar.',
      kicker: 'Avanzamos con tu sesión de carrera',
      bodyRows,
      consultora,
    }),
    text: [
      `Hola ${nombre},`, '',
      'Leímos tu solicitud y queremos avanzar.', '',
      `Pediste ${producto} con ${fullName(consultora)}. ${precioTextLine}`, '',
      'Para reservar, primero el pago:', paymentInstructions, '',
      `Cuando confirmemos que entró, te llega el link para elegir día y horario en la agenda de ${fullName(consultora)}. Suele ser dentro del día hábil.`, '',
      'Cualquier duda, respondé este mismo mail.',
    ].join('\n'),
  }
}

// ─── 2 · PAGO CONFIRMADO ───────────────────────────────────────────
export function renderPaymentConfirmedEmail({ nombre, consultora, calendarUrl }) {
  const n = escapeHtml((nombre || '').split(' ')[0] || nombre)
  const calBlock = calendarUrl
    ? `<tr><td style="padding:20px 40px 0 40px;">
        <a href="${escapeHtml(calendarUrl)}" style="display:inline-block; background:#4A8C40; color:#FFFFFF; font-family:'Courier New', monospace; font-size:12px; letter-spacing:1px; text-transform:uppercase; text-decoration:none; padding:13px 26px;">Reservar mi sesión →</a>
      </td></tr>`
    : block('Link de agenda', 'Te lo pasamos por este mismo mail en el día hábil.')
  const bodyRows = [
    para(`Hola ${n},`, { pt: 28 }),
    para('Confirmamos tu pago. Ya podés reservar.'),
    calBlock,
    para('Elegí el día y horario que mejor te quede. Nos vemos ahí.', { pt: 20 }),
  ].join('')
  return {
    subject: 'Tu pago está confirmado, reservá tu sesión',
    html: shell({
      preheader: 'Confirmamos tu pago. Ya podés reservar.',
      kicker: 'Tu pago está confirmado',
      bodyRows,
      consultora,
    }),
    text: [
      `Hola ${nombre},`, '',
      'Confirmamos tu pago. Ya podés reservar.', '',
      calendarUrl || 'Te pasamos el link de la agenda por este mismo mail en el día hábil.', '',
      'Elegí el día y horario que mejor te quede. Nos vemos ahí.',
    ].join('\n'),
  }
}

// ─── 3 · RECHAZO ───────────────────────────────────────────────────
export function renderRejectionEmail({ nombre, consultora, paginaOrigen }) {
  const n = escapeHtml((nombre || '').split(' ')[0] || nombre)
  const recursosUrl = paginaOrigen === 'recursos-recruiters'
    ? `${HOST}/recursos-recruiters`
    : `${HOST}/busco-trabajo`
  const bodyRows = [
    para(`Hola ${n},`, { pt: 28 }),
    para('Gracias por escribirnos y por contarnos en qué estás.'),
    para('Leímos tu solicitud y por ahora no vamos a avanzar con una sesión. No siempre somos las indicadas para cada caso, y preferimos decírtelo antes que tomar algo donde no podemos aportar lo que necesitás.'),
    para(`Si te sirve, en <a href="${escapeHtml(recursosUrl)}" style="color:#4A8C40; text-decoration:none;">${escapeHtml(recursosUrl.replace('https://', ''))}</a> tenés el job board abierto y nuestros recursos.`),
    para('Te deseamos lo mejor en la búsqueda.', { muted: true }),
  ].join('')
  return {
    subject: 'Tu solicitud de sesión de carrera',
    html: shell({
      preheader: 'Sobre tu solicitud de sesión de carrera.',
      kicker: 'Tu solicitud de sesión de carrera',
      bodyRows,
      consultora: consultora || 'Mara',
    }),
    text: [
      `Hola ${nombre},`, '',
      'Gracias por escribirnos y por contarnos en qué estás.', '',
      'Leímos tu solicitud y por ahora no vamos a avanzar con una sesión. No siempre somos las indicadas para cada caso, y preferimos decírtelo antes que tomar algo donde no podemos aportar lo que necesitás.', '',
      `Si te sirve, en ${recursosUrl} tenés el job board abierto y nuestros recursos.`, '',
      'Te deseamos lo mejor en la búsqueda.',
    ].join('\n'),
  }
}
