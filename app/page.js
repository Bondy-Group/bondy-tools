'use client'

import Link from 'next/link'

const BONDY_ORANGE = '#F47C20'

const sections = [
  {
    href: '/internal',
    emoji: '⚡',
    title: 'Bondy Team',
    subtitle: 'Tools internas',
    description: 'Screening reports, cultural fit, scorecards y todo lo que el equipo de Bondy necesita para hacer su trabajo.',
    available: true,
    color: BONDY_ORANGE,
  },
  {
    href: '/recruitment',
    emoji: '🎯',
    title: 'Recruiters',
    subtitle: 'Recursos y tools',
    description: 'Herramientas y recursos gratuitos para recruiters y equipos de talent acquisition de cualquier organización.',
    available: false,
    color: '#6366f1',
  },
  {
    href: '/hiring',
    emoji: '🏢',
    title: 'Hiring Strategy',
    subtitle: 'Para HMs y VCs',
    description: 'Guías y herramientas para hiring managers y fondos planeando su estrategia de contratación en LATAM.',
    available: false,
    color: '#10b981',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-xl"
              style={{ background: `linear-gradient(135deg, ${BONDY_ORANGE}, #e86c10)` }}
            >
              B
            </div>
            <div>
              <h1 className="text-white font-bold text-2xl">Bondy Tools</h1>
              <p className="text-blue-300 text-sm">tools.wearebondy.com</p>
            </div>
          </div>
          <p className="text-white/60 text-lg max-w-xl">
            Plataforma de herramientas para recruiting, hiring y estrategia de talento en LATAM.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sections.map((s) => (
            <div key={s.href}>
              {s.available ? (
                <Link href={s.href} className="block group">
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                      style={{ background: `${s.color}18` }}>
                      {s.emoji}
                    </div>
                    <h2 className="font-bold text-gray-900 text-lg mb-0.5">{s.title}</h2>
                    <p className="text-xs font-semibold mb-3" style={{ color: s.color }}>{s.subtitle}</p>
                    <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>
                    <div className="mt-5 flex items-center gap-1 text-sm font-semibold" style={{ color: s.color }}>
                      Entrar <span>→</span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm opacity-55">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                    style={{ background: `${s.color}18` }}>
                    {s.emoji}
                  </div>
                  <h2 className="font-bold text-gray-900 text-lg mb-0.5">{s.title}</h2>
                  <p className="text-xs font-semibold mb-3" style={{ color: s.color }}>{s.subtitle}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>
                  <div className="mt-5">
                    <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-400">
                      Próximamente
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
