// lib/google-docs.js
// Creates a formatted Bondy screening report in Google Docs

const SCOPES = 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive'

async function getAccessToken() {
  // Load from base64-encoded full service account JSON
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!b64) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON env var')

  const sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
  const email = sa.client_email
  const privateKey = sa.private_key // real newlines from JSON.parse

  const now = Math.floor(Date.now() / 1000)

  // Build JWT header + payload
  const headerB64 = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const payloadB64 = Buffer.from(JSON.stringify({
    iss: email,
    scope: SCOPES,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const signingInput = `${headerB64}.${payloadB64}`

  // Sign with Node crypto — PKCS8 key needs 'RSA-SHA256' algorithm
  const crypto = await import('crypto')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signingInput, 'utf8')
  const signatureB64 = sign.sign(privateKey, 'base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const jwt = `${signingInput}.${signatureB64}`

  // Exchange for access token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const data = await res.json()
  if (!data.access_token) {
    throw new Error(`Google auth failed: ${JSON.stringify(data)}`)
  }
  return data.access_token
}

// ── Color constants ──────────────────────────────────────────
const SIENNA = { red: 0.753, green: 0.416, blue: 0.176 }
const INK    = { red: 0.102, green: 0.102, blue: 0.102 }
const MID    = { red: 0.478, green: 0.471, blue: 0.455 }
const LIGHT  = { red: 0.941, green: 0.922, blue: 0.890 }

// ── Parse report text into structured sections ───────────────
function parseReport(text) {
  const lines = text.split('\n')
  const sections = []
  let currentSection = null
  let headerLines = []
  let inHeader = true

  for (const line of lines) {
    const trimmed = line.trim()
    if (inHeader && trimmed.startsWith('##')) inHeader = false
    if (inHeader) {
      if (trimmed && trimmed !== '---') headerLines.push(trimmed)
      continue
    }
    if (trimmed.startsWith('## ')) {
      if (currentSection) sections.push(currentSection)
      currentSection = { title: trimmed.replace('## ', ''), lines: [] }
    } else if (trimmed === '---') {
      // ignore
    } else {
      if (currentSection) currentSection.lines.push(line)
    }
  }
  if (currentSection) sections.push(currentSection)
  return { headerLines, sections }
}

// ── Build Google Docs requests ────────────────────────────────
function buildDocRequests(reportText, candidateName, recruiterName) {
  const { headerLines, sections } = parseReport(reportText)
  const requests = []
  let insertIndex = 1

  const insert = (text) => {
    requests.push({ insertText: { location: { index: insertIndex }, text } })
    insertIndex += text.length
  }

  const style = (s, e, bold, color, fontSize, fontFamily) => {
    const fmt = {}
    const fields = []
    if (bold !== undefined) { fmt.bold = bold; fields.push('bold') }
    if (color) { fmt.foregroundColor = { color: { rgbColor: color } }; fields.push('foregroundColor') }
    if (fontSize) { fmt.fontSize = { magnitude: fontSize, unit: 'PT' }; fields.push('fontSize') }
    if (fontFamily) { fmt.weightedFontFamily = { fontFamily }; fields.push('weightedFontFamily') }
    if (!fields.length) return
    requests.push({ updateTextStyle: { range: { startIndex: s, endIndex: e }, textStyle: fmt, fields: fields.join(',') } })
  }

  const para = (s, e, spaceAbove, spaceBelow, bgColor) => {
    const ps = {}
    const fields = []
    if (spaceAbove !== undefined) { ps.spaceAbove = { magnitude: spaceAbove, unit: 'PT' }; fields.push('spaceAbove') }
    if (spaceBelow !== undefined) { ps.spaceBelow = { magnitude: spaceBelow, unit: 'PT' }; fields.push('spaceBelow') }
    if (bgColor) { ps.shading = { backgroundColor: { color: { rgbColor: bgColor } } }; fields.push('shading') }
    if (!fields.length) return
    requests.push({ updateParagraphStyle: { range: { startIndex: s, endIndex: e }, paragraphStyle: ps, fields: fields.join(',') } })
  }

  // HEADER — BONDY.
  const logoText = 'BONDY.\n'
  const ls = insertIndex; insert(logoText)
  style(ls, ls + logoText.length - 1, true, SIENNA, 22, 'Playfair Display')
  para(ls, insertIndex, 0, 4, LIGHT)

  const tagText = 'THE STANDARD FOR TECHNICAL HIRING\n'
  const ts = insertIndex; insert(tagText)
  style(ts, ts + tagText.length - 1, false, MID, 7.5, 'DM Mono')
  para(ts, insertIndex, 0, 14, LIGHT)

  const sepText = '\n'
  insert(sepText)

  const titleText = 'Informe de Screening\n'
  const tts = insertIndex; insert(titleText)
  style(tts, tts + titleText.length - 1, true, INK, 17, 'Playfair Display')
  para(tts, insertIndex, 8, 14)

  // HEADER FIELDS
  for (const line of headerLines) {
    if (!line.trim()) continue
    const match = line.match(/^\*\*(.+?):\*\*\s*(.*)$/) || line.match(/^(.+?):\s*(.*)$/)
    if (match) {
      const lbl = match[1] + ': '
      const val = (match[2] || '') + '\n'
      const lblS = insertIndex; insert(lbl)
      style(lblS, insertIndex, true, INK, 10.5, 'DM Sans')
      const valS = insertIndex; insert(val)
      style(valS, insertIndex - 1, false, INK, 10.5, 'DM Sans')
      para(lblS, insertIndex, 2, 2)
    } else {
      const lineS = insertIndex; insert(line + '\n')
      style(lineS, insertIndex - 1, false, INK, 10.5, 'DM Sans')
    }
  }

  insert('\n')

  // SECTIONS
  for (const section of sections) {
    const eyebrow = '— ' + section.title.toUpperCase() + '\n'
    const es = insertIndex; insert(eyebrow)
    style(es, es + eyebrow.length - 1, true, SIENNA, 8.5, 'DM Mono')
    para(es, insertIndex, 16, 6)

    for (const line of section.lines) {
      const trimmed = line.trim()
      if (!trimmed) { insert('\n'); continue }

      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ')
      if (isBullet) {
        const content = trimmed.replace(/^[-•]\s+/, '')
        const boldMatch = content.match(/^\*\*(.+?):\*\*\s*(.*)$/)
        const bStart = insertIndex
        insert('• ')
        style(bStart, bStart + 2, false, SIENNA, 10.5, 'DM Sans')
        if (boldMatch) {
          const ls2 = insertIndex; insert(boldMatch[1] + ': ')
          style(ls2, insertIndex, true, INK, 10.5, 'DM Sans')
          const vs = insertIndex; insert((boldMatch[2] || '') + '\n')
          style(vs, insertIndex - 1, false, INK, 10.5, 'DM Sans')
        } else {
          const cs = insertIndex; insert(content + '\n')
          style(cs, insertIndex - 1, false, INK, 10.5, 'DM Sans')
        }
        para(bStart, insertIndex, 2, 2)
      } else {
        const lineS = insertIndex; insert(trimmed + '\n')
        style(lineS, lineS + trimmed.length, false, INK, 10.5, 'DM Sans')
        para(lineS, insertIndex, 2, 5)
      }
    }
  }

  // FOOTER
  insert('\n')
  const footerDate = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
  const footerText = `Bondy Tools · ${footerDate}${recruiterName ? ' · ' + recruiterName : ''}\n`
  const fs = insertIndex; insert(footerText)
  style(fs, fs + footerText.length - 1, false, MID, 8, 'DM Mono')
  para(fs, insertIndex, 16, 0)

  return requests
}

// ── Main export ───────────────────────────────────────────────
export async function createBondyDoc({ reportText, candidateName, recruiterName, positionName, clientName }) {
  const accessToken = await getAccessToken()
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  const docTitle = [
    candidateName || 'Candidato',
    positionName ? `— ${positionName}` : '',
    clientName ? `· ${clientName}` : '',
    `· ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
  ].filter(Boolean).join(' ')

  // 1. Create doc
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: docTitle }),
  })
  const doc = await createRes.json()
  if (!doc.documentId) throw new Error(`Failed to create doc: ${JSON.stringify(doc)}`)
  const docId = doc.documentId

  // 2. Move to folder
  if (folderId) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${docId}?addParents=${folderId}&removeParents=root&fields=id`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }

  // 3. Apply formatting
  const requests = buildDocRequests(reportText, candidateName, recruiterName)
  await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  })

  // 4. Page margins
  await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        updateDocumentStyle: {
          documentStyle: {
            marginTop:    { magnitude: 56.7, unit: 'PT' },
            marginBottom: { magnitude: 56.7, unit: 'PT' },
            marginLeft:   { magnitude: 63.0, unit: 'PT' },
            marginRight:  { magnitude: 63.0, unit: 'PT' },
          },
          fields: 'marginTop,marginBottom,marginLeft,marginRight',
        },
      }],
    }),
  })

  return {
    docId,
    docUrl: `https://docs.google.com/document/d/${docId}/edit`,
    docTitle,
  }
}
