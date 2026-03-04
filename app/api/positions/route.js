import { NextResponse } from 'next/server'

const BASE_ID = 'appx2N660HZRJhWN5'
const OPPS_TABLE = 'tblyhB7L0k0S2UOx0'
const ACCOUNTS_TABLE = 'tblQ0wu6Gk4QPUQqT'

export async function GET() {
  try {
    const token = process.env.AIRTABLE_TOKEN
    if (!token) return NextResponse.json({ error: 'AIRTABLE_TOKEN not set' }, { status: 500 })

    // Traer oportunidades On Going / Potencial con el campo Account
    const formula = encodeURIComponent('OR(Status = "\u{1F4BC}Potencial ", Status = "\u{1F680}On Going ")')
    const url = `https://api.airtable.com/v0/${BASE_ID}/${OPPS_TABLE}?filterByFormula=${formula}&fields[]=Opportunity%20name&fields[]=Status&fields[]=Account&maxRecords=100`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    const data = await res.json()
    const records = data.records || []

    // Juntar todos los account IDs únicos
    const accountIds = [...new Set(
      records.flatMap(r => r.fields['Account'] || [])
    )]

    // Fetch de accounts en paralelo (máx 10 a la vez)
    const accountMap = {}
    if (accountIds.length > 0) {
      const chunks = []
      for (let i = 0; i < accountIds.length; i += 10) chunks.push(accountIds.slice(i, i + 10))
      await Promise.all(chunks.map(async (chunk) => {
        const filterIds = chunk.map(id => `RECORD_ID()="${id}"`).join(',')
        const accFormula = encodeURIComponent(`OR(${filterIds})`)
        const accUrl = `https://api.airtable.com/v0/${BASE_ID}/${ACCOUNTS_TABLE}?filterByFormula=${accFormula}&fields[]=Name&maxRecords=50`
        const accRes = await fetch(accUrl, { headers: { Authorization: `Bearer ${token}` } })
        if (accRes.ok) {
          const accData = await accRes.json()
          ;(accData.records || []).forEach(r => { accountMap[r.id] = r.fields['Name'] || '' })
        }
      }))
    }

    const positions = records.map(r => {
      const accountId = (r.fields['Account'] || [])[0]
      return {
        id: r.id,
        name: r.fields['Opportunity name'] || '',
        status: r.fields['Status'] || '',
        client_name: accountId ? (accountMap[accountId] || '') : '',
      }
    })

    positions.sort((a, b) => {
      const aOn = a.status.includes('On Going')
      const bOn = b.status.includes('On Going')
      if (aOn && !bOn) return -1
      if (!aOn && bOn) return 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({ positions })
  } catch (err) {
    console.error('[positions]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
