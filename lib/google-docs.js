// lib/google-docs.js
// Creates a formatted Bondy screening report in Google Docs

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
]

async function getAccessToken() {
  // Load credentials from GOOGLE_SERVICE_ACCOUNT_JSON (base64-encoded full JSON)
  // This avoids Vercel mangling the private key newlines
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!b64) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON env var')

  const sa = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
  const email = sa.client_email
  const privateKey = sa.private_key  // already has real \n from JSON.parse

  // Build JWT
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: email,
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const base64url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  const signingInput = `${base64url(header)}.${base64url(payload)}`

  const { createSign } = await import('crypto')
  let signature
  try {
    const sign = createSign('RSA-SHA256')
    sign.update(signingInput)
    signature = sign.sign({ key: privateKey, format: 'pem' }, 'base64url')
  } catch (signErr) {
    throw new Error(`JWT signing failed: ${signErr.message}`)
  }

  const jwt = `${signingInput}.${signature}`

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
const SIENNA = { red: 0.753, green: 0.416, blue: 0.176 }   // #C06A2D
const INK    = { red: 0.102, green: 0.102, blue: 0.102 }   // #1A1A1A
const MID    = { red: 0.478, green: 0.471, blue: 0.455 }   // #7A7874
const LIGHT  = { red: 0.941, green: 0.922, blue: 0.890 }   // #F0EBE3 (stone bg for header)

// ── Parse report text into structured sections ───────────────
function parseReport(text) {
  const lines = text.split('\n')
  const sections = []
  let currentSection = null
  let headerLines = []
  let inHeader = true

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect header block (before first ##)
    if (inHeader && trimmed.startsWith('##')) {
      inHeader = false
    }

    if (inHeader) {
      if (trimmed && trimmed !== '---') headerLines.push(trimmed)
      continue
    }

    if (trimmed.startsWith('## ')) {
      if (currentSection) sections.push(currentSection)
      currentSection = { title: trimmed.replace('## ', ''), lines: [] }
    } else if (trimmed === '---') {
      // ignore separators
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
  let insertIndex = 1 // Google Docs starts at index 1

  const insert = (text) => {
    requests.push({ insertText: { location: { index: insertIndex }, text } })
    insertIndex += text.length
  }

  const style = (startOffset, endOffset, bold, color, fontSize, fontFamily) => {
    const fields = []
    const fmt = {}
    if (bold !== undefined) { fmt.bold = bold; fields.push('bold') }
    if (color) { fmt.foregroundColor = { color: { rgbColor: color } }; fields.push('foregroundColor') }
    if (fontSize) { fmt.fontSize = { magnitude: fontSize, unit: 'PT' }; fields.push('fontSize') }
    if (fontFamily) { fmt.weightedFontFamily = { fontFamily }; fields.push('weightedFontFamily') }
    if (fields.length === 0) return
    requests.push({
      updateTextStyle: {
        range: { startIndex: startOffset, endIndex: endOffset },
        textStyle: fmt,
        fields: fields.join(','),
      },
    })
  }

  const paraStyle = (startOffset, endOffset, namedStyleType, spaceAbove, spaceBelow, bgColor) => {
    const ps = {}
    const fields = []
    if (namedStyleType) { ps.namedStyleType = namedStyleType; fields.push('namedStyleType') }
    if (spaceAbove !== undefined) { ps.spaceAbove = { magnitude: spaceAbove, unit: 'PT' }; fields.push('spaceAbove') }
    if (spaceBelow !== undefined) { ps.spaceBelow = { magnitude: spaceBelow, unit: 'PT' }; fields.push('spaceBelow') }
    if (bgColor) { ps.shading = { backgroundColor: { color: { rgbColor: bgColor } } }; fields.push('shading') }
    if (fields.length === 0) return
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: startOffset, endIndex: endOffset },
        paragraphStyle: ps,
        fields: fields.join(','),
      },
    })
  }

  // ── LOGO HEADER BLOCK ──────────────────────────────────────
  // Title: "BONDY." in large Playfair Display
  const logoText = 'BONDY.\n'
  const logoStart = insertIndex
  insert(logoText)
  style(logoStart, logoStart + logoText.length - 1, true, SIENNA, 22, 'Playfair Display')
  paraStyle(logoStart, logoStart + logoText.length, null, 0, 4, LIGHT)

  // Tagline
  const tagText = 'THE STANDARD FOR TECHNICAL HIRING SINCE 2008\n'
  const tagStart = insertIndex
  insert(tagText)
  style(tagStart, tagStart + tagText.length - 1, false, MID, 7.5, 'DM Mono')
  paraStyle(tagStart, tagStart + tagText.length, null, 0, 16, LIGHT)

  // Separator line (thin sienna line via horizontal rule simulation)
  const sepText = '────────────────────────────────────────\n'
  const sepStart = insertIndex
  insert(sepText)
  style(sepStart, sepStart + sepText.length - 1, false, SIENNA, 8, 'DM Mono')
  paraStyle(sepStart, sepStart + sepText.length, null, 0, 8)

  // Doc title: "Informe de Screening"
  const docTitleText = 'Informe de Screening\n'
  const docTitleStart = insertIndex
  insert(docTitleText)
  style(docTitleStart, docTitleStart + docTitleText.length - 1, true, INK, 18, 'Playfair Display')
  paraStyle(docTitleStart, docTitleStart + docTitleText.length, null, 4, 12)

  // ── HEADER FIELDS ─────────────────────────────────────────
  for (const line of headerLines) {
    if (!line.trim()) continue
    // Parse "**Label:** Value" or "Label: Value"
    const match = line.match(/^\*\*(.+?):\*\*\s*(.*)$/) || line.match(/^(.+?):\s*(.*)$/)
    if (match) {
      const labelText = match[1] + ': '
      const valueText = (match[2] || '') + '\n'
      const labelStart = insertIndex
      insert(labelText)
      style(labelStart, labelStart + labelText.length, true, INK, 10.5, 'DM Sans')
      const valueStart = insertIndex
      insert(valueText)
      style(valueStart, valueStart + valueText.length - 1, false, INK, 10.5, 'DM Sans')
      paraStyle(labelStart, insertIndex, null, 2, 2)
    } else {
      const lineStart = insertIndex
      insert(line + '\n')
      style(lineStart, lineStart + line.length, false, INK, 10.5, 'DM Sans')
    }
  }

  // Space after header
  const spacer1 = '\n'
  insert(spacer1)

  // ── SECTIONS ──────────────────────────────────────────────
  for (const section of sections) {
    // Section eyebrow line: "— " + title
    const eyebrowText = '— ' + section.title.toUpperCase() + '\n'
    const eyebrowStart = insertIndex
    insert(eyebrowText)
    style(eyebrowStart, eyebrowStart + eyebrowText.length - 1, true, SIENNA, 8.5, 'DM Mono')
    paraStyle(eyebrowStart, eyebrowStart + eyebrowText.length, null, 16, 6)

    // Section content
    for (const line of section.lines) {
      const trimmed = line.trim()
      if (!trimmed) {
        insert('\n')
        continue
      }

      // Bold inline: **text**
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ')
      const isBoldLine = trimmed.startsWith('**') && trimmed.endsWith('**')

      if (isBullet) {
        const content = trimmed.replace(/^[-•]\s+/, '')
        // Parse inline bold: **Label:** value
        const boldMatch = content.match(/^\*\*(.+?):\*\*\s*(.*)$/)
        if (boldMatch) {
          const bulletLabelStart = insertIndex
          insert('• ')
          const lblStart = insertIndex
          insert(boldMatch[1] + ': ')
          style(lblStart, insertIndex, true, INK, 10.5, 'DM Sans')
          const valStart = insertIndex
          insert((boldMatch[2] || '') + '\n')
          style(valStart, insertIndex - 1, false, INK, 10.5, 'DM Sans')
          style(bulletLabelStart, bulletLabelStart + 2, false, SIENNA, 10.5, 'DM Sans')
          paraStyle(bulletLabelStart, insertIndex, null, 2, 2)
        } else {
          const bulletStart = insertIndex
          insert('• ' + content + '\n')
          style(bulletStart, bulletStart + 2, false, SIENNA, 10.5, 'DM Sans')
          style(bulletStart + 2, insertIndex - 1, false, INK, 10.5, 'DM Sans')
          paraStyle(bulletStart, insertIndex, null, 2, 2)
        }
      } else {
        const lineStart = insertIndex
        insert(trimmed + '\n')
        style(lineStart, lineStart + trimmed.length, false, INK, 10.5, 'DM Sans')
        paraStyle(lineStart, insertIndex, null, 2, 6)
      }
    }
  }

  // ── FOOTER ────────────────────────────────────────────────
  insert('\n')
  const footerSepText = '────────────────────────────────────────\n'
  const footerSepStart = insertIndex
  insert(footerSepText)
  style(footerSepStart, footerSepStart + footerSepText.length - 1, false, SIENNA, 8, 'DM Mono')

  const footerDate = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
  const footerText = `Informe generado por Bondy Tools · ${footerDate}${recruiterName ? ' · ' + recruiterName : ''}\n`
  const footerStart = insertIndex
  insert(footerText)
  style(footerStart, footerStart + footerText.length - 1, false, MID, 8, 'DM Mono')
  paraStyle(footerStart, insertIndex, null, 4, 0)

  return requests
}

// ── Main export ───────────────────────────────────────────────
export async function createBondyDoc({ reportText, candidateName, recruiterName, positionName, clientName }) {
  const accessToken = await getAccessToken()
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  // 1. Create empty doc
  const docTitle = [
    candidateName || 'Candidato',
    positionName ? `— ${positionName}` : '',
    clientName ? `· ${clientName}` : '',
    `· ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
  ].filter(Boolean).join(' ')

  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: docTitle }),
  })

  const doc = await createRes.json()
  if (!doc.documentId) throw new Error(`Failed to create doc: ${JSON.stringify(doc)}`)
  const docId = doc.documentId

  // 2. Move to Bondy folder
  if (folderId) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${docId}?addParents=${folderId}&removeParents=root&fields=id,parents`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }

  // 3. Apply Bondy formatting via batchUpdate
  const requests = buildDocRequests(reportText, candidateName, recruiterName)

  await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  })

  // 4. Set page margins (2cm all sides) and default font
  await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
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
