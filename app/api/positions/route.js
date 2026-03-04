import { NextResponse } from 'next/server'

const BASE_ID = 'appx2N660HZRJhWN5'
const TABLE_ID = 'tblyhB7L0k0S2UOx0'

export async function GET() {
  try {
    const token = process.env.AIRTABLE_TOKEN
    if (!token) return NextResponse.json({ error: 'AIRTABLE_TOKEN not set' }, { status: 500 })

    const formula = encodeURIComponent('OR(Status = "\u{1F4BC}Potencial ", Status = "\u{1F680}On Going ")')
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula=${formula}&fields[]=Opportunity%20name&fields[]=Status&maxRecords=100`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 }, // cache 5 min
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: res.status })
    }

    const data = await res.json()

    const positions = (data.records || []).map(r => ({
      id: r.id,
      name: r.fields['Opportunity name'] || '',
      status: r.fields['Status'] || '',
    }))

    // On Going first, then Potencial, alphabetical within each
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
