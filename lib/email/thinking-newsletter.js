/**
 * Bondy Thinking — email templates
 *
 * Dos renderers acá:
 *   - renderConfirmation: double opt-in email, dispara al suscribirse
 *   - renderIssue: render de un issue del newsletter (content jsonb → HTML)
 *
 * Ambos usan el sistema typewriter v4 de Bondy (cream + green + Special Elite).
 * Inline CSS, table-based layout (Outlook + Gmail-safe).
 */

const HOST = 'https://wearebondy.com'

export function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Markdown-light inline: **bold**, *italic*, [text](url)
// Usado para parrafos del issue. Newlines preservadas dentro del párrafo.
function inlineMd(s) {
  if (!s) return ''
  let out = escapeHtml(s)
  // links: [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => {
    const safeU = u.replace(/"/g, '%22')
    return `<a href="${safeU}" style="color:#4A8C40; text-decoration:underline;">${t}</a>`
  })
  // bold
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#3A3530;">$1</strong>')
  // italic
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
  return out
}

const COLORS = {
  bg: '#FEFCF9',
  card: '#FFFFFF',
  ink: '#3A3530',
  sub: '#5A5550',
  faint: '#7A7874',
  rule: '#E8E4DE',
  green: '#4A8C40',
}

const FONT_SERIF = `'Special Elite', 'Courier Prime', Georgia, serif`
const FONT_BODY = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`

// ───────────────────────────────────────────────────────────
// CONFIRMATION EMAIL (double opt-in)
// ───────────────────────────────────────────────────────────
export function renderConfirmation({ lang, confirmUrl }) {
  const isES = lang === 'es'
  const L = isES
    ? {
        preheader: 'Confirmá tu suscripción a Bondy Thinking.',
        kicker: 'BONDY THINKING',
        title: 'Confirmá tu suscripción',
        intro:
          'Gracias por suscribirte a Bondy Thinking — nuestras notas editoriales sobre recruiting técnico, el mercado de engineering en LATAM y cómo trabajamos.',
        instruction: 'Para completar la suscripción, hacé click acá:',
        cta: 'Confirmar suscripción',
        fallbackText: 'Si el botón no funciona, copiá este link en tu navegador:',
        cadence: 'Una perspectiva cada dos semanas. Sin spam, sin venta.',
        notYou: 'Si no te suscribiste, ignorá este mail — no pasa nada.',
        signoff: 'Mara Schmitman · Founder',
      }
    : {
        preheader: 'Confirm your Bondy Thinking subscription.',
        kicker: 'BONDY THINKING',
        title: 'Confirm your subscription',
        intro:
          'Thanks for subscribing to Bondy Thinking — our editorial notes on technical hiring, the LATAM engineering market, and how we work.',
        instruction: 'To complete your subscription, click here:',
        cta: 'Confirm subscription',
        fallbackText: "If the button doesn't work, copy this link in your browser:",
        cadence: 'A perspective every other week. No spam, no sales pitch.',
        notYou: "If you didn't subscribe, just ignore this email.",
        signoff: 'Mara Schmitman · Founder',
      }

  const safeUrl = escapeHtml(confirmUrl)

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${L.title}</title>
</head>
<body style="margin:0; padding:0; background:${COLORS.bg}; font-family:${FONT_BODY};">
  <span style="display:none; overflow:hidden; line-height:1px; opacity:0; max-height:0; max-width:0;">${L.preheader}</span>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${COLORS.bg}; padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px; background:${COLORS.card}; border:1px solid ${COLORS.rule};">
        <tr><td style="padding:40px 40px 8px 40px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding-right:10px;"><span style="display:inline-block; width:18px; height:1px; background:${COLORS.green}; vertical-align:middle;"></span></td>
              <td style="font-family:${FONT_BODY}; font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:${COLORS.green}; font-weight:500;">${L.kicker}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px 0 40px;">
          <h1 style="margin:0; font-family:${FONT_SERIF}; font-size:32px; line-height:1.15; color:${COLORS.ink}; font-weight:normal;">${L.title}</h1>
        </td></tr>
        <tr><td style="padding:24px 40px 0 40px;">
          <p style="margin:0; font-size:15px; line-height:1.65; color:${COLORS.sub};">${L.intro}</p>
        </td></tr>
        <tr><td style="padding:24px 40px 0 40px;">
          <p style="margin:0; font-size:15px; line-height:1.65; color:${COLORS.sub};">${L.instruction}</p>
        </td></tr>
        <tr><td style="padding:28px 40px 0 40px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="background:${COLORS.green};">
            <a href="${safeUrl}" style="display:inline-block; padding:14px 28px; font-size:11px; letter-spacing:1.4px; text-transform:uppercase; color:#FFFFFF; text-decoration:none; font-weight:500;">${L.cta} →</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:28px 40px 0 40px;">
          <p style="margin:0 0 6px 0; font-size:12px; color:${COLORS.faint};">${L.fallbackText}</p>
          <p style="margin:0; font-size:12px; color:${COLORS.faint}; word-break:break-all;">
            <a href="${safeUrl}" style="color:${COLORS.green}; text-decoration:underline;">${safeUrl}</a>
          </p>
        </td></tr>
        <tr><td style="padding:32px 40px 0 40px;"><hr style="border:none; border-top:1px solid ${COLORS.rule}; margin:0;"></td></tr>
        <tr><td style="padding:20px 40px 0 40px;">
          <p style="margin:0; font-family:${FONT_SERIF}; font-size:14px; color:${COLORS.ink}; line-height:1.5;">${L.cadence}</p>
        </td></tr>
        <tr><td style="padding:16px 40px 0 40px;">
          <p style="margin:0; font-size:12px; color:${COLORS.faint}; line-height:1.6;">${L.notYou}</p>
        </td></tr>
        <tr><td style="padding:28px 40px 40px 40px;">
          <p style="margin:0; font-size:12px; color:${COLORS.sub};">${L.signoff}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0 0; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:${COLORS.faint};">BONDY · wearebondy.com</p>
    </td></tr>
  </table>
</body>
</html>`
}

export function renderConfirmationText({ lang, confirmUrl }) {
  if (lang === 'es') {
    return `Confirmá tu suscripción a Bondy Thinking.

Gracias por suscribirte. Para completar la suscripción, hacé click acá:
${confirmUrl}

Una perspectiva cada dos semanas. Sin spam, sin venta.

Si no te suscribiste, ignorá este mail.

— Mara Schmitman · Founder
Bondy · wearebondy.com`
  }
  return `Confirm your Bondy Thinking subscription.

Thanks for subscribing. To complete it, click here:
${confirmUrl}

A perspective every other week. No spam, no sales pitch.

If you didn't subscribe, just ignore this email.

— Mara Schmitman · Founder
Bondy · wearebondy.com`
}

// ───────────────────────────────────────────────────────────
// ISSUE EMAIL (cada número del newsletter)
// ───────────────────────────────────────────────────────────

/**
 * content.sections = [
 *   { kind: 'intro', text: '...' }                                  // hello + intro markdown-light
 *   { kind: 'heading', text: '...' }                                // sub-header dentro del issue
 *   { kind: 'paragraph', text: '...' }                              // párrafo con inline md
 *   { kind: 'article_card', title, excerpt, url, kicker? }         // card que linkea a un artículo de /thinking
 *   { kind: 'quote', text: '...', attribution?: '...' }
 *   { kind: 'divider' }
 * ]
 */
function renderSection(section, lang) {
  const isES = lang !== 'en'
  switch (section.kind) {
    case 'intro':
    case 'paragraph': {
      const html = inlineMd(section.text || '').replace(/\n\n/g, '</p><p style="margin:18px 0 0 0; font-size:16px; line-height:1.75; color:#3A3530;">').replace(/\n/g, '<br/>')
      return `<tr><td style="padding:${section.kind === 'intro' ? '8' : '22'}px 40px 0 40px;">
        <p style="margin:0; font-size:16px; line-height:1.75; color:#3A3530;">${html}</p>
      </td></tr>`
    }
    case 'heading':
      return `<tr><td style="padding:32px 40px 0 40px;">
        <h2 style="margin:0; font-family:${FONT_SERIF}; font-size:22px; line-height:1.25; color:${COLORS.ink}; font-weight:normal;">${escapeHtml(section.text || '')}</h2>
      </td></tr>`
    case 'article_card': {
      const url = escapeHtml(section.url || '#')
      const title = escapeHtml(section.title || '')
      const excerpt = escapeHtml(section.excerpt || '')
      const kicker = escapeHtml(section.kicker || (isES ? 'EN BONDY THINKING' : 'IN BONDY THINKING'))
      const cta = isES ? 'Leer la nota' : 'Read it'
      return `<tr><td style="padding:32px 40px 0 40px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-left:2px solid ${COLORS.green};">
          <tr><td style="padding:4px 0 4px 18px;">
            <div style="font-family:${FONT_BODY}; font-size:10px; letter-spacing:2px; text-transform:uppercase; color:${COLORS.green}; font-weight:500; margin-bottom:8px;">${kicker}</div>
            <a href="${url}" style="text-decoration:none; color:inherit;">
              <div style="font-family:${FONT_SERIF}; font-size:20px; line-height:1.25; color:${COLORS.ink}; margin-bottom:8px;">${title}</div>
              ${excerpt ? `<div style="font-size:14px; line-height:1.65; color:${COLORS.sub};">${excerpt}</div>` : ''}
              <div style="margin-top:10px; font-family:${FONT_BODY}; font-size:11px; letter-spacing:1.4px; text-transform:uppercase; color:${COLORS.green};">${cta} →</div>
            </a>
          </td></tr>
        </table>
      </td></tr>`
    }
    case 'quote': {
      const text = escapeHtml(section.text || '')
      const attr = section.attribution ? `<div style="margin-top:10px; font-family:${FONT_BODY}; font-size:12px; color:${COLORS.faint};">— ${escapeHtml(section.attribution)}</div>` : ''
      return `<tr><td style="padding:28px 40px 0 40px;">
        <div style="font-family:${FONT_SERIF}; font-size:18px; line-height:1.5; color:${COLORS.ink}; font-style:italic; padding-left:18px; border-left:2px solid ${COLORS.rule};">"${text}"${attr}</div>
      </td></tr>`
    }
    case 'divider':
      return `<tr><td style="padding:32px 40px 0 40px;"><hr style="border:none; border-top:1px solid ${COLORS.rule}; margin:0;"></td></tr>`
    default:
      return ''
  }
}

function renderSectionText(section) {
  switch (section.kind) {
    case 'intro':
    case 'paragraph':
      return section.text || ''
    case 'heading':
      return `\n${(section.text || '').toUpperCase()}\n`
    case 'article_card':
      return `→ ${section.title || ''}\n${section.excerpt || ''}\n${section.url || ''}`
    case 'quote':
      return `"${section.text || ''}"${section.attribution ? ` — ${section.attribution}` : ''}`
    case 'divider':
      return '\n---\n'
    default:
      return ''
  }
}

export function renderIssue({ issue, unsubscribeUrl, webViewUrl }) {
  const lang = issue.lang === 'en' ? 'en' : 'es'
  const isES = lang === 'es'
  const sections = Array.isArray(issue?.content?.sections) ? issue.content.sections : []
  const sectionsHtml = sections.map((s) => renderSection(s, lang)).join('')

  const L = isES
    ? {
        kicker: 'BONDY THINKING',
        issueLabel: issue.issue_number ? `№ ${String(issue.issue_number).padStart(2, '0')}` : '',
        webView: 'Ver en el navegador',
        unsubscribe: 'Cancelar suscripción',
        cadence: 'Una perspectiva cada dos semanas. Sin spam, sin venta.',
        signoff: 'Mara Schmitman · Founder',
      }
    : {
        kicker: 'BONDY THINKING',
        issueLabel: issue.issue_number ? `№ ${String(issue.issue_number).padStart(2, '0')}` : '',
        webView: 'View in browser',
        unsubscribe: 'Unsubscribe',
        cadence: 'A perspective every other week. No spam, no sales pitch.',
        signoff: 'Mara Schmitman · Founder',
      }

  const safeUnsub = escapeHtml(unsubscribeUrl || '')
  const safeWeb = escapeHtml(webViewUrl || '')

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(issue.subject || issue.title || 'Bondy Thinking')}</title>
</head>
<body style="margin:0; padding:0; background:${COLORS.bg}; font-family:${FONT_BODY};">
  ${issue.preheader ? `<span style="display:none; overflow:hidden; line-height:1px; opacity:0; max-height:0; max-width:0;">${escapeHtml(issue.preheader)}</span>` : ''}
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${COLORS.bg}; padding:40px 20px;">
    <tr><td align="center">
      ${safeWeb ? `<p style="margin:0 0 16px 0; font-size:10px; letter-spacing:1.4px; text-transform:uppercase; color:${COLORS.faint};">
        <a href="${safeWeb}" style="color:${COLORS.faint}; text-decoration:underline;">${L.webView}</a>
      </p>` : ''}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px; background:${COLORS.card}; border:1px solid ${COLORS.rule};">
        <tr><td style="padding:36px 40px 0 40px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding-right:10px;"><span style="display:inline-block; width:18px; height:1px; background:${COLORS.green}; vertical-align:middle;"></span></td>
                    <td style="font-family:${FONT_BODY}; font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:${COLORS.green}; font-weight:500;">${L.kicker}</td>
                  </tr>
                </table>
              </td>
              <td align="right" style="font-family:${FONT_BODY}; font-size:10px; letter-spacing:2px; color:${COLORS.faint};">${L.issueLabel}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 40px 0 40px;">
          <h1 style="margin:0; font-family:${FONT_SERIF}; font-size:30px; line-height:1.2; color:${COLORS.ink}; font-weight:normal;">${escapeHtml(issue.title || '')}</h1>
        </td></tr>
        <tr><td style="padding:18px 40px 0 40px;"><hr style="border:none; border-top:1px solid ${COLORS.rule}; margin:0;"></td></tr>
        ${sectionsHtml}
        <tr><td style="padding:40px 40px 0 40px;"><hr style="border:none; border-top:1px solid ${COLORS.rule}; margin:0;"></td></tr>
        <tr><td style="padding:24px 40px 0 40px;">
          <p style="margin:0; font-family:${FONT_SERIF}; font-size:14px; color:${COLORS.ink}; line-height:1.5;">${L.cadence}</p>
        </td></tr>
        <tr><td style="padding:16px 40px 0 40px;">
          <p style="margin:0; font-size:12px; color:${COLORS.sub};">${L.signoff}</p>
        </td></tr>
        <tr><td style="padding:28px 40px 36px 40px;">
          <p style="margin:0; font-size:11px; color:${COLORS.faint}; line-height:1.6;">
            ${safeUnsub ? `<a href="${safeUnsub}" style="color:${COLORS.faint}; text-decoration:underline;">${L.unsubscribe}</a> · ` : ''}<a href="${HOST}" style="color:${COLORS.faint}; text-decoration:underline;">wearebondy.com</a>
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0 0; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:${COLORS.faint};">BONDY · wearebondy.com</p>
    </td></tr>
  </table>
</body>
</html>`
}

export function renderIssueText({ issue, unsubscribeUrl }) {
  const sections = Array.isArray(issue?.content?.sections) ? issue.content.sections : []
  const body = sections.map(renderSectionText).join('\n\n')
  const isES = issue.lang !== 'en'
  return `BONDY THINKING${issue.issue_number ? ` · № ${String(issue.issue_number).padStart(2, '0')}` : ''}

${issue.title || ''}
${'='.repeat(Math.min((issue.title || '').length, 50))}

${body}

—
${isES ? 'Una perspectiva cada dos semanas. Sin spam, sin venta.' : 'A perspective every other week. No spam, no sales pitch.'}
Mara Schmitman · Founder

${unsubscribeUrl ? `${isES ? 'Cancelar suscripción' : 'Unsubscribe'}: ${unsubscribeUrl}` : ''}
wearebondy.com`
}
