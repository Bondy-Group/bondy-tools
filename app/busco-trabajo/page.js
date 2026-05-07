import { fetchOpenRoles, formatUpdateLabel, formatTodayLabel, AREAS, MODALITIES, SENIORITIES, SOURCES, LOCATIONS } from '@/lib/scraper-jobs'
import BuscoTrabajoClient from './Client'
import './styles.css'

export const metadata = {
  title: 'Busco Trabajo · Bondy',
  description:
    'Roles tech en LATAM, actualizados a diario. Curados con el mismo criterio que aplicamos a nuestras búsquedas embebidas.',
}

export const revalidate = 1800 // 30 min

export default async function BuscoTrabajoPage() {
  const { roles, lastUpdate, newToday, activeSources } = await fetchOpenRoles({ days: 3, limit: 500 })
  const updateLabel = formatUpdateLabel(lastUpdate)
  const todayLabel = formatTodayLabel()
  // If the catalog gave us an active-sources list, use it; otherwise fall back to
  // the static SOURCES export so the filter never shows up empty.
  const visibleSources = (activeSources && activeSources.length > 0) ? activeSources : SOURCES

  return (
    <BuscoTrabajoClient
      initialRoles={roles}
      updateLabel={updateLabel}
      todayLabel={todayLabel}
      newToday={newToday}
      areas={AREAS}
      modalities={MODALITIES}
      seniorities={SENIORITIES}
      sources={visibleSources}
      locations={LOCATIONS}
    />
  )
}
