import { fetchOpenRoles, AREAS, MODALITIES, SENIORITIES, SOURCES, LOCATIONS } from '@/lib/scraper-jobs'
import BuscoTrabajoClient from './Client'
import './styles.css'

export const metadata = {
  title: 'Busco Trabajo · Bondy',
  description:
    'Roles tech en LATAM, actualizados a diario. Curados con el mismo criterio que aplicamos a nuestras búsquedas embebidas.',
}

export const revalidate = 1800 // 30 min

export default async function BuscoTrabajoPage() {
  const roles = await fetchOpenRoles({ days: 60, limit: 500 })

  return (
    <BuscoTrabajoClient
      initialRoles={roles}
      areas={AREAS}
      modalities={MODALITIES}
      seniorities={SENIORITIES}
      sources={SOURCES}
      locations={LOCATIONS}
    />
  )
}
