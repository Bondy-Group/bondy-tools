# Bondy Tools

Interview Report Generator para el equipo de Bondy.

## Setup local

```bash
npm install
cp .env.local.example .env.local
# Completar variables en .env.local
npm run dev
```

## Variables de entorno

Crear `.env.local` con:

```
ANTHROPIC_API_KEY=sk-ant-...
AIRTABLE_API_KEY=pat...
AIRTABLE_CANDIDATES_BASE_ID=appZ2uavuwQLI2foP
AIRTABLE_CLIENTS_BASE_ID=appx2N660HZRJhWN5
```

## Deploy en Vercel

1. Push a GitHub
2. Vercel auto-detecta Next.js y hace deploy
3. Configurar variables de entorno en Vercel Dashboard → Settings → Environment Variables

## Uso

1. **Screening Report**: Pegá resumen + transcripción de Gemini → generá reporte → descargá HTML
2. **Cultural Fit**: Seleccioná empresa → configurá perfil esperado → pegá transcripción → analizá fit
