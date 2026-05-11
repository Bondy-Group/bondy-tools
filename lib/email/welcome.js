/**
 * Welcome email — first touchpoint after subscribing to the /busco-trabajo
 * weekly digest. Sent immediately after a successful POST /api/job-subscribe.
 *
 * Goals:
 *   - Confirm to the subscriber that the signup worked (reduces "did it
 *     work?" anxiety while they wait until Monday for the first digest).
 *   - Set expectations: 1 email per week, Mondays 10am ART, last 7 days of
 *     roles, plain-text-ish design, easy to unsubscribe.
 *   - Surface the unsubscribe link from day one (CAN-SPAM friendly + good
 *     deliverability signal).
 *
 * Brand: same typewriter/crema v4 system used in the digest itself, so the
 * subscriber recognizes the look the following Monday.
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

function prefsLine(prefs) {
  const p = prefs || {}
  const parts = []
  if (Array.isArray(p.areas) && p.areas.length) parts.push(`Áreas: ${p.areas.join(', ')}`)
  if (Array.isArray(p.seniorities) && p.seniorities.length) parts.push(`Seniority: ${p.seniorities.join(', ')}`)
  if (Array.isArray(p.modalities) && p.modalities.length) parts.push(`Modalidad: ${p.modalities.join(', ')}`)
  return parts.join(' · ')
}

export function renderWelcomeEmail({ unsubscribeUrl, preferences }) {
  const safeUnsub = escapeHtml(unsubscribeUrl)
  const prefs = prefsLine(preferences)
  const prefsBlock = prefs
    ? `<tr><td style="padding:24px 40px 0 40px;"><p style="margin:0; font-family:'Courier New', monospace; font-size:12px; line-height:1.7; color:#7A7874;"><span style="color:#4A8C40;">Tus filtros →</span> ${escapeHtml(prefs)}</p></td></tr>`
    : `<tr><td style="padding:24px 40px 0 40px;"><p style="margin:0; font-family:'Courier New', monospace; font-size:12px; line-height:1.7; color:#7A7874;"><span style="color:#4A8C40;">Tus filtros →</span> ninguno · vas a recibir todos los roles de la semana</p></td></tr>`

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Listo. Te sumamos.</title>
</head>
<body style="margin:0; padding:0; background:#FEFCF9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
<span style="display:none; overflow:hidden; line-height:1px; opacity:0; max-height:0; max-width:0;">Confirmamos tu suscripción al digest semanal de Bondy.</span>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#FEFCF9; padding:40px 20px;">
  <tr>
    <td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px; background:#FFFFFF; border:1px solid #E8E4DE;">
        <tr>
          <td style="padding:40px 40px 8px 40px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="padding-right:10px;">
                  <span style="display:inline-block; width:18px; height:1px; background:#4A8C40; vertical-align:middle;"></span>
                </td>
                <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:#4A8C40; font-weight:500;">
                  BONDY · BUSCO TRABAJO
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 0 40px;">
            <h1 style="margin:0; font-family:Georgia, 'Times New Roman', serif; font-size:34px; line-height:1.15; color:#1A1A1A; font-weight:700;">
              Listo. <em style="font-style:italic; color:#4A8C40;">Te sumamos.</em>
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 0 40px;">
            <p style="margin:0; font-size:15px; line-height:1.65; color:#4f4f4f;">
              Acabás de suscribirte al digest semanal de Bondy con los roles tech nuevos en LATAM. Un solo mail, los lunes a las 10am ART, con lo que entró en los últimos 7 días.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 0 40px;">
            <p style="margin:0; font-size:15px; line-height:1.65; color:#4f4f4f;">
              El primer digest te llega <strong>este lunes</strong>. Si no aparece, fijate en spam y marcalo como "no es spam" para que las próximas semanas lleguen bien.
            </p>
          </td>
        </tr>
        ${prefsBlock}
        <tr>
          <td style="padding:32px 40px 0 40px;">
            <hr style="border:none; border-top:1px solid #E8E4DE; margin:0;">
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 0 40px;">
            <p style="margin:0; font-family:Georgia, 'Times New Roman', serif; font-style:italic; font-size:14px; color:#1A1A1A; line-height:1.6;">
              Sin afiliados, sin spam, sin recomendaciones automáticas. Solo los roles que vimos esa semana.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 40px 40px;">
            <p style="margin:0; font-size:12px; color:#7A7874; line-height:1.7;">
              ¿No te suscribiste vos o querés cancelar? <a href="${safeUnsub}" style="color:#4A8C40; text-decoration:underline;">Cancelar suscripción</a>
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0 0; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:#7A7874; font-family:'Courier New', monospace;">
        BONDY · wearebondy.com
      </p>
    </td>
  </tr>
</table>
</body>
</html>`
}

export function renderWelcomeEmailText({ unsubscribeUrl, preferences }) {
  const prefs = prefsLine(preferences)
  return [
    'BONDY · BUSCO TRABAJO',
    '',
    'Listo. Te sumamos.',
    '',
    'Acabás de suscribirte al digest semanal de Bondy con los roles tech nuevos en LATAM. Un solo mail, los lunes a las 10am ART, con lo que entró en los últimos 7 días.',
    '',
    'El primer digest te llega este lunes. Si no aparece, fijate en spam y marcalo como "no es spam" para que las próximas semanas lleguen bien.',
    '',
    prefs ? `Tus filtros: ${prefs}` : 'Tus filtros: ninguno (vas a recibir todos los roles de la semana)',
    '',
    '---',
    '',
    'Sin afiliados, sin spam, sin recomendaciones automáticas. Solo los roles que vimos esa semana.',
    '',
    `Cancelar suscripción: ${unsubscribeUrl}`,
    '',
    'BONDY · wearebondy.com',
  ].join('\n')
}
