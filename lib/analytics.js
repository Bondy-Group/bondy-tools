// ─────────────────────────────────────────────────────────────
// lib/analytics.js
// Wrapper liviano sobre gtag (GA4) para events custom.
// Misma property que wearebondy.com (G-4J2J3Q2WGE) — los subdominios
// del mismo apex se trackean nativo en una sola property GA4.
// ─────────────────────────────────────────────────────────────

export function trackEvent(name, params = {}) {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return
  try {
    window.gtag('event', name, params)
  } catch {
    // silent fail — analytics never blocks UX
  }
}
