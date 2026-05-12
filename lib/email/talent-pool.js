/**
 * Talent Pool — autoresponder email
 *
 * Estructura:
 *   1. Confirmación: recibimos tu perfil ✓
 *   2. Resumen: lo que ingresaste (read-only)
 *   3. CTA: completá/editá tu perfil → link único válido 90 días
 *   4. Privacidad: tus datos no se comparten sin autorización
 *
 * Brand v4 typewriter — cream + green + Special Elite.
 */

const COLORS = {
  bg: '#FEFCF9',
  card: '#FFFFFF',
  ink: '#3A3530',
  sub: '#5A5550',
  faint: '#7A7874',
  rule: '#E8E4DE',
  green: '#4A8C40',
  greenTint: 'rgba(74,140,64,0.06)',
}
const FONT_SERIF = `'Special Elite', 'Courier Prime', Georgia, serif`
const FONT_BODY = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function summaryRow(label, value) {
  if (!value) return ''
  return `<tr>
    <td style="padding:8px 0; vertical-align:top; width:140px; font-family:${FONT_BODY}; font-size:10px; letter-spacing:1.4px; text-transform:uppercase; color:${COLORS.faint};">${escapeHtml(label)}</td>
    <td style="padding:8px 0; vertical-align:top; font-family:${FONT_BODY}; font-size:14px; color:${COLORS.ink};">${escapeHtml(value)}</td>
  </tr>`
}

function summaryBlock(snapshot) {
  if (!snapshot) return ''
  const rows = [
    summaryRow('Nombre', snapshot.name),
    summaryRow('Email', snapshot.email),
    summaryRow('LinkedIn', snapshot.linkedin_url),
    summaryRow('Posición actual', snapshot.current_position),
    summaryRow('Empresa actual', snapshot.current_company),
    summaryRow('Años de experiencia', snapshot.years_experience),
    summaryRow('Área principal', snapshot.primary_area),
    summaryRow(
      'Ubicación',
      [snapshot.location_city, snapshot.location_country].filter(Boolean).join(', ')
    ),
    summaryRow('Pitch', snapshot.pitch ? String(snapshot.pitch).slice(0, 250) : null),
  ].join('')
  return rows || ''
}

export function renderTalentAutoresponder({ name, email, editUrl, snapshot, isNew }) {
  const safeUrl = escapeHtml(editUrl)
  const greeting = name ? `Hola ${escapeHtml(String(name).split(' ')[0])},` : 'Hola,'
  const headline = isNew ? 'Recibimos tu perfil' : 'Actualizamos tu perfil'
  const subhead = isNew
    ? 'Bienvenida/o al talent pool de Bondy. Tu información ya está en nuestra base.'
    : 'Acabamos de actualizar tu perfil con la información que enviaste.'

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${headline}</title>
</head>
<body style="margin:0; padding:0; background:${COLORS.bg}; font-family:${FONT_BODY};">
  <span style="display:none; overflow:hidden; line-height:1px; opacity:0; max-height:0; max-width:0;">${headline} en Bondy. Completá los detalles para que podamos encontrar mejores matchs.</span>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${COLORS.bg}; padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px; background:${COLORS.card}; border:1px solid ${COLORS.rule};">
        <tr><td style="padding:40px 40px 0 40px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding-right:10px;"><span style="display:inline-block; width:18px; height:1px; background:${COLORS.green}; vertical-align:middle;"></span></td>
              <td style="font-family:${FONT_BODY}; font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:${COLORS.green}; font-weight:500;">BONDY · TALENT POOL</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 40px 0 40px;">
          <h1 style="margin:0; font-family:${FONT_SERIF}; font-size:30px; line-height:1.2; color:${COLORS.ink}; font-weight:normal;">${headline}</h1>
        </td></tr>
        <tr><td style="padding:18px 40px 0 40px;">
          <p style="margin:0; font-size:15px; line-height:1.7; color:${COLORS.sub};">${greeting}</p>
          <p style="margin:14px 0 0 0; font-size:15px; line-height:1.7; color:${COLORS.sub};">${subhead}</p>
        </td></tr>

        <tr><td style="padding:28px 40px 0 40px;">
          <div style="background:${COLORS.greenTint}; border-left:2px solid ${COLORS.green}; padding:18px 20px;">
            <p style="margin:0 0 6px 0; font-family:${FONT_BODY}; font-size:10px; letter-spacing:1.6px; text-transform:uppercase; color:${COLORS.green}; font-weight:500;">Próximo paso</p>
            <p style="margin:0; font-family:${FONT_SERIF}; font-size:16px; line-height:1.5; color:${COLORS.ink};">Completá tu perfil para que podamos encontrar mejores oportunidades.</p>
            <p style="margin:8px 0 0 0; font-size:13px; line-height:1.65; color:${COLORS.sub};">
              Te falta agregar: skills, nivel de inglés, expectativa salarial, modalidad preferida y disponibilidad. Cuanto más completo, mejores matchs.
            </p>
          </div>
        </td></tr>

        <tr><td style="padding:24px 40px 0 40px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="background:${COLORS.green};">
            <a href="${safeUrl}" style="display:inline-block; padding:14px 28px; font-size:11px; letter-spacing:1.4px; text-transform:uppercase; color:#FFFFFF; text-decoration:none; font-weight:500;">Completar mi perfil →</a>
          </td></tr></table>
          <p style="margin:14px 0 0 0; font-size:11px; color:${COLORS.faint};">Este link es único y válido por 90 días. No se requiere login.</p>
        </td></tr>

        <tr><td style="padding:32px 40px 0 40px;"><hr style="border:none; border-top:1px solid ${COLORS.rule}; margin:0;"></td></tr>

        <tr><td style="padding:24px 40px 0 40px;">
          <p style="margin:0 0 12px 0; font-family:${FONT_BODY}; font-size:10px; letter-spacing:1.6px; text-transform:uppercase; color:${COLORS.faint}; font-weight:500;">Resumen de lo que recibimos</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            ${summaryBlock(snapshot)}
          </table>
        </td></tr>

        <tr><td style="padding:32px 40px 0 40px;"><hr style="border:none; border-top:1px solid ${COLORS.rule}; margin:0;"></td></tr>

        <tr><td style="padding:22px 40px 0 40px;">
          <p style="margin:0; font-family:${FONT_SERIF}; font-size:14px; color:${COLORS.ink}; line-height:1.5;">
            Tus datos son privados. No los compartimos con clientes sin autorización tuya.
          </p>
        </td></tr>
        <tr><td style="padding:14px 40px 0 40px;">
          <p style="margin:0; font-size:12px; color:${COLORS.sub}; line-height:1.6;">
            Si tenés preguntas, respondé este email — te lee una persona del equipo de Bondy.
          </p>
        </td></tr>
        <tr><td style="padding:28px 40px 40px 40px;">
          <p style="margin:0; font-size:12px; color:${COLORS.sub};">Lucía Palomeque · Head of Delivery</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0 0; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:${COLORS.faint};">BONDY · wearebondy.com</p>
    </td></tr>
  </table>
</body>
</html>`
}

export function renderTalentAutoresponderText({ name, email, editUrl, snapshot, isNew }) {
  const headline = isNew ? 'Recibimos tu perfil en Bondy' : 'Actualizamos tu perfil en Bondy'
  const lines = [
    headline,
    '═'.repeat(headline.length),
    '',
    name ? `Hola ${String(name).split(' ')[0]},` : 'Hola,',
    '',
    isNew
      ? 'Bienvenida/o al talent pool de Bondy. Tu información ya está en nuestra base.'
      : 'Acabamos de actualizar tu perfil con la información que enviaste.',
    '',
    'PRÓXIMO PASO',
    'Completá tu perfil (skills, inglés, salario, modalidad, disponibilidad) acá:',
    editUrl,
    '',
    'El link es único y válido por 90 días. No se requiere login.',
    '',
    'RESUMEN',
  ]
  if (snapshot) {
    const map = [
      ['Nombre', snapshot.name],
      ['Email', snapshot.email],
      ['LinkedIn', snapshot.linkedin_url],
      ['Posición actual', snapshot.current_position],
      ['Empresa', snapshot.current_company],
      ['Años', snapshot.years_experience],
      ['Área', snapshot.primary_area],
      ['Ubicación', [snapshot.location_city, snapshot.location_country].filter(Boolean).join(', ')],
      ['Pitch', snapshot.pitch ? String(snapshot.pitch).slice(0, 200) : null],
    ]
    for (const [k, v] of map) {
      if (v) lines.push(`  ${k}: ${v}`)
    }
  }
  lines.push(
    '',
    'Tus datos son privados. No los compartimos con clientes sin autorización tuya.',
    'Si tenés preguntas, respondé este email.',
    '',
    'Lucía Palomeque · Head of Delivery',
    'Bondy · wearebondy.com'
  )
  return lines.join('\n')
}
