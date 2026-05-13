/**
 * Weekly digest email template — Bondy v4 typewriter brand.
 *
 * Pure HTML string (no React Email dependency). Email clients are notoriously
 * picky, so we use table layouts, inline styles, and a very small subset of CSS.
 *
 * Brand tokens (mirror /busco-trabajo styles):
 *   #FEFCF9  cream background
 *   #1A1A1A  ink
 *   #4A8C40  accent (Bondy green)
 *   #7A7874  faded text
 *   #E8E4DE  rules/borders
 *
 * `Special Elite` and `Courier Prime` self-hosted in the web app aren't
 * loadable in email clients, so we fall back to system serif / mono.
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

function buildJobUrl(role) {
  const base = role.applyUrl || role.source_url || '#'
  if (!base || base === '#') return '#'
  const params = new URLSearchParams({
    utm_source: 'bondy',
    utm_medium: 'email',
    utm_campaign: 'weekly-digest',
    utm_content: `role-${role.id}`,
    ref: 'bondy.tools',
  })
  return base + (base.includes('?') ? '&' : '?') + params.toString()
}

function jobRow(role) {
  const title = escapeHtml(role.title)
  const company = escapeHtml(role.company || '—')
  const meta = [role.modality, role.location, role.seniority].filter(Boolean).map(escapeHtml).join(' · ')
  const salary = role.salary ? escapeHtml(role.salary) : ''
  const area = escapeHtml((role.area || '').split(' / ')[0] || '')
  const url = buildJobUrl(role)

  return `
  <tr>
    <td style="padding:20px 0;border-top:1px solid #E8E4DE;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#7A7874;padding-bottom:6px;">
            ${area}${salary ? ` &nbsp;·&nbsp; <span style="color:#4A8C40;font-weight:bold;">${salary}</span>` : ''}
          </td>
        </tr>
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:600;color:#1A1A1A;line-height:1.3;padding-bottom:4px;">
            <a href="${url}" style="color:#1A1A1A;text-decoration:none;">${title}</a>
          </td>
        </tr>
        <tr>
          <td style="font-family:Arial,sans-serif;font-size:14px;color:#4f4f4f;padding-bottom:8px;">
            ${company}
          </td>
        </tr>
        <tr>
          <td style="font-family:Arial,sans-serif;font-size:13px;color:#7A7874;padding-bottom:10px;">
            ${meta}
          </td>
        </tr>
        <tr>
          <td>
            <a href="${url}" style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#4A8C40;text-decoration:none;border-bottom:1px solid #4A8C40;padding-bottom:2px;">
              Ver y aplicar →
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

/**
 * Render the full email HTML.
 * @param {object} args
 * @param {Array} args.roles - filtered roles for this subscriber
 * @param {string} args.unsubscribeUrl
 * @param {string} args.weekLabel - human readable week range, e.g. "del 4 al 10 de noviembre"
 */
export function renderWeeklyDigest({ roles, unsubscribeUrl, weekLabel, audience = 'candidates' }) {
  const count = roles.length
  const rolesHtml = roles.map(jobRow).join('')
  const isRecruiters = audience === 'recruiters'
  const noun = isRecruiters
    ? `${count === 1 ? 'rol' : 'roles'} de recruiting ${count === 1 ? 'nuevo' : 'nuevos'}`
    : `${count === 1 ? 'rol' : 'roles'} tech ${count === 1 ? 'nuevo' : 'nuevos'}`
  const title = isRecruiters
    ? 'Bondy · Roles de recruiting de la semana'
    : 'Bondy · Roles tech de la semana'

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#FEFCF9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FEFCF9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:bold;color:#1A1A1A;letter-spacing:-0.01em;">
                    Bondy
                    <span style="font-family:'Courier New',monospace;font-size:10px;font-weight:normal;color:#7A7874;letter-spacing:0.18em;text-transform:uppercase;margin-left:8px;">${isRecruiters ? 'Recruiting' : 'Busco trabajo'}</span>
                  </td>
                  <td align="right" style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#7A7874;">
                    ${escapeHtml(weekLabel || '')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding:24px 0 8px;border-top:2px solid #1A1A1A;">
              <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;color:#1A1A1A;margin:0 0 12px;font-weight:700;">
                ${count} ${noun}<br/>
                <em style="color:#4A8C40;font-style:italic;">esta semana.</em>
              </h1>
              <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#4f4f4f;margin:0 0 8px;">
                Curados con el mismo criterio que aplicamos a nuestras búsquedas embebidas. Si no pasan nuestro filtro, no llegan acá.
              </p>
            </td>
          </tr>

          <!-- Roles -->
          <tr>
            <td style="padding-top:8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${rolesHtml || '<tr><td style="padding:32px 0;font-family:Arial,sans-serif;font-size:14px;color:#7A7874;text-align:center;border-top:1px solid #E8E4DE;border-bottom:1px solid #E8E4DE;">Esta semana no entraron roles que pasen tu filtro. Volvemos el lunes que viene.</td></tr>'}
              </table>
            </td>
          </tr>

          <!-- CTA see all -->
          <tr>
            <td style="padding:32px 0 24px;text-align:center;">
              <a href="${HOST}/busco-trabajo/jobs-tech?utm_source=bondy&utm_medium=email&utm_campaign=weekly-digest" style="font-family:'Courier New',monospace;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#FEFCF9;background:#1A1A1A;text-decoration:none;padding:14px 28px;display:inline-block;">
                Ver todos los roles abiertos →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;border-top:1px solid #E8E4DE;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#7A7874;text-align:center;">
              <p style="margin:0 0 8px;">
                Recibís este mail porque te suscribiste en
                <a href="${HOST}/busco-trabajo" style="color:#7A7874;text-decoration:underline;">tools.wearebondy.com/busco-trabajo</a>.
              </p>
              <p style="margin:0 0 12px;">
                <a href="${unsubscribeUrl}" style="color:#7A7874;text-decoration:underline;">Cancelar suscripción</a>
                &nbsp;·&nbsp;
                <a href="https://wearebondy.com" style="color:#7A7874;text-decoration:underline;">wearebondy.com</a>
              </p>
              <p style="margin:0;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#a8a4a0;">
                © ${new Date().getFullYear()} Bondy Group · Buenos Aires
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** Plain text fallback for clients that prefer it. */
export function renderWeeklyDigestText({ roles, unsubscribeUrl, weekLabel, audience = 'candidates' }) {
  const count = roles.length
  const isRecruiters = audience === 'recruiters'
  const noun = isRecruiters
    ? `${count === 1 ? 'rol' : 'roles'} de recruiting ${count === 1 ? 'nuevo' : 'nuevos'}`
    : `${count === 1 ? 'rol' : 'roles'} tech ${count === 1 ? 'nuevo' : 'nuevos'}`
  const header = isRecruiters ? 'BONDY · Recruiting' : 'BONDY · Busco trabajo'
  const allUrl = isRecruiters
    ? `${HOST}/recursos-recruiters/busco-trabajo`
    : `${HOST}/busco-trabajo/jobs-tech`
  const lines = [
    `${header} — ${weekLabel || ''}`,
    '',
    `${count} ${noun} esta semana.`,
    'Curados con el mismo criterio que aplicamos a nuestras búsquedas embebidas.',
    '',
    '─────────────────────────────',
    '',
  ]
  for (const r of roles) {
    lines.push(`▸ ${r.title} — ${r.company || '—'}`)
    const meta = [r.modality, r.location, r.seniority].filter(Boolean).join(' · ')
    if (meta) lines.push(`  ${meta}`)
    if (r.salary) lines.push(`  ${r.salary}`)
    lines.push(`  ${buildJobUrl(r)}`)
    lines.push('')
  }
  lines.push('─────────────────────────────')
  lines.push('')
  lines.push(`Ver todos: ${allUrl}`)
  lines.push(`Cancelar suscripción: ${unsubscribeUrl}`)
  lines.push('')
  lines.push('Bondy Group · Buenos Aires')
  return lines.join('\n')
}
