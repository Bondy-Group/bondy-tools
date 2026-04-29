// Server component que carga la propuesta y la renderiza
// sin chrome del panel. Listo para "Save as PDF" del browser.
import { getProposal, rowToRenderData } from '@/lib/proposals'
import ProposalDocument from '../../ProposalDocument'
import PrintToolbar from './PrintToolbar'

export const dynamic = 'force-dynamic'

export default async function ProposalPrintPage({ params }) {
  const row = await getProposal(params.id)
  if (!row) {
    return (
      <div style={{ padding: 32, fontFamily: 'system-ui' }}>
        Proposal not found.
      </div>
    )
  }
  const data = rowToRenderData(row)

  return (
    <>
      <PrintToolbar />
      <ProposalDocument data={data} />
    </>
  )
}

