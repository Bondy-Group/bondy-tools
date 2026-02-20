import { NextResponse } from 'next/server'
import { getClients } from '@/lib/airtable'

export async function GET() {
  try {
    const clients = await getClients()
    return NextResponse.json({ clients })
  } catch (error) {
    console.error('Clients error:', error)
    return NextResponse.json({ error: error.message || 'Error al cargar clientes' }, { status: 500 })
  }
}
