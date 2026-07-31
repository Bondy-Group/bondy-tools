import './globals.css'
import Script from 'next/script'
import { Providers } from './providers'
import BugReporter from './_components/BugReporter'

export const metadata = {
  title: 'Bondy Tools',
  description: 'Centro de recursos del equipo Bondy',
}

const GA_ID = 'G-4J2J3Q2WGE'
const APOLLO_APP_ID = '663bad8e6f75730300a3e69c'

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* GA4 — misma property que wearebondy.com (cross-subdomain nativo) */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              cookie_domain: 'wearebondy.com',
              cookie_flags: 'SameSite=None;Secure'
            });
          `}
        </Script>

        {/* Apollo.io visitor identification */}
        <Script id="apollo-tracker" strategy="afterInteractive">
          {`
            (function(){var n=Math.random().toString(36).substring(7),o=document.createElement("script");
            o.src="https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache="+n,
            o.async=!0,o.defer=!0,
            o.onload=function(){window.trackingFunctions.onLoad({appId:"${APOLLO_APP_ID}"})},
            document.head.appendChild(o)})();
          `}
        </Script>

        <Providers>{children}</Providers>

        {/* Bichito reporta-bugs — flota en todas las páginas de tools */}
        <BugReporter />
      </body>
    </html>
  )
}
