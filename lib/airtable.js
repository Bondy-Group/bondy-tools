const Airtable = require('airtable')

const getCandidatesBase = () => {
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_CANDIDATES_BASE_ID)
  return base
}

const getClientsBase = () => {
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_CLIENTS_BASE_ID)
  return base
}

// Search candidates by name
export async function searchCandidates(query) {
  const base = getCandidatesBase()
  const formula = `OR(SEARCH(LOWER("${query}"), LOWER({Name})), SEARCH(LOWER("${query}"), LOWER({Lastname})), SEARCH(LOWER("${query}"), LOWER({Name & Lastname})))`
  
  const records = await base('Base General').select({
    filterByFormula: formula,
    fields: ['Name & Lastname', 'Name', 'Lastname', 'Email', 'Seniority', 'Profile', 'Status'],
    maxRecords: 10,
  }).firstPage()

  return records.map(r => ({
    id: r.id,
    name: r.fields['Name & Lastname'] || `${r.fields['Name'] || ''} ${r.fields['Lastname'] || ''}`.trim(),
    email: r.fields['Email'] || '',
    seniority: r.fields['Seniority'] || '',
    profile: r.fields['Profile'] || '',
    status: r.fields['Status'] || '',
  }))
}

// Save interview report to candidate record
export async function saveInterviewReport(recordId, reportText) {
  const base = getCandidatesBase()
  await base('Base General').update(recordId, {
    'Reporte Agente entrevista': reportText,
  })
  return true
}

// Get all active clients/accounts
export async function getClients() {
  const base = getClientsBase()
  
  const records = await base('Accounts').select({
    fields: ['Name', 'Industry', 'Size', 'Tech'],
    sort: [{ field: 'Name', direction: 'asc' }],
    maxRecords: 100,
  }).firstPage()

  return records.map(r => ({
    id: r.id,
    name: r.fields['Name'] || '',
    industry: r.fields['Industry'] || '',
    size: r.fields['Size'] || '',
    tech: r.fields['Tech'] || '',
  })).filter(c => c.name)
}
