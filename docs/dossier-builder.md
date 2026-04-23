# Dossier Builder — Spec técnico

**Owner técnico:** Mateo Dev
**Owner producto:** Bruno Comercial + Mara
**Versión:** 1.0 — abril 2026
**Ubicación sugerida en repo:** `bondy-tools/docs/dossier-builder.md`

---

## 1. Contexto y objetivo

El `bondy-job-scraper` ya recolecta señales crudas de búsqueda (tabla `jobs`, ~3.400 filas, 6 fuentes, L-V 7:00 AM). Hoy Bruno investiga empresa + persona + match + score manualmente cada vez que prospecta, lo que gasta muchos tokens y degrada la personalización.

El **Dossier Builder** automatiza la curaduría comercial: toma el feed crudo de `jobs`, lo enriquece con datos de Apollo/Crunchbase, lo matchea contra la base real de candidatos y clientes históricos de Bondy, calcula un score, y deja un "dossier" accionable por empresa en la tabla `lead_dossiers`.

Bruno abre la sesión, lee los top N dossiers con score ≥6, redacta el email hiperpersonalizado, envía, y registra en `Interactions`. **No investiga desde cero.**

---

## 2. Arquitectura

```
┌─────────────────────────┐
│  bondy-job-scraper      │   (existe)
│  L-V 7:00 AM Argentina  │
└────────────┬────────────┘
             ↓
┌─────────────────────────┐
│  jobs table             │   (existe, 3.4k filas)
└────────────┬────────────┘
             ↓
┌─────────────────────────────────────────┐
│  dossier-builder cron                   │   (nuevo)
│  L-V 7:30 AM Argentina                  │
│  - Agrupa jobs por company              │
│  - Dedup vs outreach_contacts           │
│  - Apollo (empresa + contacto + funding)│
│  - Match bondy_candidates               │
│  - Similar bondy_clients                │
│  - Score                                │
│  - INSERT lead_dossiers (status=ready)  │
└────────────┬────────────────────────────┘
             ↓
┌─────────────────────────┐
│  lead_dossiers table    │   (creada, vacía)
└────────────┬────────────┘
             ↓
┌────────────────────────────────────────────┐
│  tools.wearebondy.com/internal/dossier     │   (nuevo)
│  - Tab "Dossiers del día"                  │
│  - Tab "Input manual" (link/CSV/texto)     │
│  - Botón "Research persona" (Haiku)        │
│  - Botón "Marcar procesado"                │
└────────────┬───────────────────────────────┘
             ↓
      Bruno redacta → envía → Interactions
```

---

## 3. Schema `lead_dossiers` (ya desplegado)

Campos clave (ver migration `create_lead_dossiers` en Supabase):

- **Empresa**: `company_name`, `company_website`, `company_industry`, `company_headcount`, `funding_stage`, `last_funding_amount`, `last_funding_date`
- **Evidencia** (desde `jobs`): `active_jobs_count`, `job_ids uuid[]`, `primary_stack text[]`, `roles_summary`, `hiring_velocity`
- **Contacto**: `contact_name`, `contact_role`, `contact_email`, `contact_linkedin`, `contact_apollo_id`, `email_language`
- **Research persona** (on-demand): `person_research_status`, `person_research jsonb`, `person_researched_at`
- **Match Bondy**: `candidate_match_count`, `candidate_match_query`, `similar_past_clients text[]`, `suggested_angle`
- **Score**: 5 dimensiones 1-10 + `score_total` + `score_reason`
- **Flags**: `red_flags text[]`, `timing_signal`
- **Meta**: `source`, `source_input`, `status`, `outreach_contact_id`

Status lifecycle: `enriching` → `ready` → `processed` | `archived` | `discarded`

Unique constraint: `(company_name, contact_email)`.

---

## 4. Cron `dossier-builder` — lógica detallada

**Ruta:** `POST /api/cron/build-dossiers`
**Schedule:** `0 10 * * 1-5` UTC (07:30 Argentina)
**Timeout:** 900s (usar función Vercel de larga duración o Supabase Edge Function)
**Auth:** header `x-cron-secret` validado contra env var

### 4.1 Paso 1 — Seleccionar empresas candidatas

```sql
WITH recent_jobs AS (
  SELECT
    company_name,
    array_agg(id) AS job_ids,
    count(*) AS active_jobs_count,
    array_agg(DISTINCT unnest(tech_stack)) AS primary_stack,
    max(company_headcount) AS company_headcount,
    max(company_website) AS company_website,
    min(published_at) AS earliest_post,
    max(published_at) AS latest_post
  FROM jobs
  WHERE collected_at > now() - interval '7 days'
    AND company_name IS NOT NULL
    AND company_name NOT IN ('Unknown', '')
  GROUP BY company_name
  HAVING count(*) >= 1
)
SELECT rj.*
FROM recent_jobs rj
WHERE NOT EXISTS (
  SELECT 1 FROM outreach_contacts oc
  WHERE lower(oc.company) = lower(rj.company_name)
    AND oc.sent_at > now() - interval '90 days'
)
AND NOT EXISTS (
  SELECT 1 FROM lead_dossiers ld
  WHERE lower(ld.company_name) = lower(rj.company_name)
    AND ld.created_at > now() - interval '30 days'
)
ORDER BY active_jobs_count DESC
LIMIT 50;
```

**Criterios de descarte duro antes de enriquecer** (ahorra Apollo calls):
- `company_name IN lista_competidores` (redbee, silver.dev, howdy, etc — env var `COMPETITOR_BLOCKLIST`)
- `company_name` matchea patrón IT consulting/staffing (regex: `consulting|staffing|recruiting|talent|hire|outsourc`)
- `company_headcount < 30` o `company_headcount > 500` (si el dato existe en `jobs`)

### 4.2 Paso 2 — Enriquecimiento Apollo

Por cada empresa sobreviviente:

```
1. apollo_mixed_companies_search(company_name + website)
   → obtener org_id, industry, estimated_num_employees,
     latest_funding_stage, latest_funding_round_date,
     total_funding, organization_raised (si disponible)
2. apollo_contacts_search con org_id + titles:
   ['Head of Talent', 'VP Talent', 'CHRO', 'Chief People Officer',
    'Head of Engineering', 'VP Engineering', 'CTO']
   → priorizar Head of Talent > VP Talent > CHRO > CTO > VP Eng
3. apollo_people_match(apollo_id) → email verificado
```

**Nota funding:** Apollo devuelve funding data limitada (stage, última ronda, total raised) pero suficiente para el scoring. No se usa Crunchbase.

**IF** Apollo no devuelve funding data:
→ dejar `funding_stage=NULL`, el scoring de `score_icp_fit` usa solo headcount + industry (sin penalizar por falta de funding info).

**IF** Apollo no devuelve contacto con email verificado:
→ marcar dossier `status='enriching'` con nota `apollo_no_contact`, intentar re-enriquecer en el cron siguiente (hasta 3 reintentos, después `status='archived'` con razón).

**IF** Apollo devuelve auth error:
→ fail el cron con alerta a Slack `#agentes-bondy` (Mateo re-autentica manualmente).

### 4.3 Paso 3 — Match con `bondy_candidates`

```sql
SELECT count(*) AS match_count
FROM bondy_candidates
WHERE disponible = true
  AND pipeline_status NOT IN ('hired_elsewhere', 'unresponsive')
  AND seniority = ANY($1)         -- seniorities derivadas de jobs
  AND skills && $2                -- intersección con primary_stack
  AND (
    pais IN ('Argentina', 'Uruguay', 'Chile', 'Colombia', 'México', 'Brasil')
    OR work_model = 'remote'
  );
```

Guardar en `candidate_match_count` (numérico) y `candidate_match_query` (string legible, ej: `"Sr Python + AWS, disponibles LATAM"`).

### 4.4 Paso 4 — Similar past clients

```sql
SELECT array_agg(nombre_display)
FROM bondy_clients
WHERE status IN ('active', 'past_active')
  AND industry = $1                       -- del dossier
  AND hires_total >= 1
ORDER BY fecha_ultima_actividad DESC
LIMIT 3;
```

### 4.5 Paso 5 — Scoring (1-10 cada dimensión)

| Dimensión | Cálculo |
|---|---|
| `score_icp_fit` | headcount en rango 51-500: +5; industry en ICP: +3; funding stage A-C: +2 |
| `score_urgency` | ≥5 jobs últimos 7 días: 10. ≥3: 8. ≥1: 6. 0 externos pero en jobs: 4 |
| `score_accessibility` | email verificado Head of Talent: 10. CTO/VP Eng: 8. otro: 5. sin email: 1 |
| `score_revenue` | headcount*rango_salario del stack: ≥5 hires/año: 10. 2-4: 7. 1: 4 |
| `score_ease_of_close` | similar past clients ≥2: 10. 1: 7. 0 pero match_count>50: 5. otro: 3 |

`score_total = promedio ponderado` (pesos: urgency 30%, icp_fit 25%, accessibility 20%, revenue 15%, ease 10%).

**IF `score_total < 6`** → `status='discarded'`, `discarded_reason` con detalle.
**IF `score_total >= 6`** → `status='ready'`.

### 4.6 Paso 6 — Red flags y timing signal

Red flags a detectar en el pipeline:
- Layoffs recientes (buscar en `market_signals` WHERE company=X AND category='layoff')
- Billing dispute histórico (buscar en `bondy_clients.notas ILIKE '%dispute%'` o `%billing%`)
- Contacto opted-out (flag en `outreach_contacts.notes`)

Timing signal: `hot` si ≥3 jobs en últimos 7 días; `warm` si ≥1 job activo; `cold` si todos `published_at > 30 días`.

### 4.7 Paso 7 — Suggested angle (Haiku, $ bajo)

Llamada única a Haiku con prompt estructurado:

```
Empresa: {company_name} ({industry}, {headcount} empleados, {funding_stage})
Stack: {primary_stack}
Roles abiertos: {roles_summary}
Candidatos Bondy matcheando: {candidate_match_count}
Clientes similares: {similar_past_clients}

Escribí UNA línea (max 140 chars) explicando por qué Bondy es
relevante AHORA para esta empresa. Sin hype, sin buzzwords.
```

Guardar en `suggested_angle`.

---

## 5. UI `tools.wearebondy.com/internal/dossier-workbench`

### 5.1 Tab "Dossiers del día"

Default query:
```sql
SELECT * FROM lead_dossiers
WHERE status = 'ready'
  AND processed_by_bruno_at IS NULL
ORDER BY score_total DESC
LIMIT 20;
```

Cada card muestra:
- Header: company_name · industry · headcount · funding_stage · **score badge**
- Evidencia (collapsed): active_jobs_count + links a job URLs
- Contacto: nombre, rol, email, LinkedIn
- Match Bondy: candidate_match_count + similar_past_clients
- Suggested angle
- Red flags (si hay, badge rojo)
- **Botones:**
  - "🔍 Research persona" → dispara endpoint on-demand (sección 5.3)
  - "✉️ Copy email context" → copia JSON estructurado al clipboard para pegar en Claude
  - "✅ Marcar procesado" → UPDATE status='processed', processed_by_bruno_at=now()
  - "🗑️ Archivar" → UPDATE status='archived' + prompt razón

### 5.2 Tab "Input manual"

Tres sub-modos con el mismo output:

**Link:**
Input textbox → detecta tipo (LinkedIn persona, careers page, artículo, tweet) → endpoint `/api/dossier/from-link` → corre pipeline completo → inserta en `lead_dossiers` con `source='manual_link'` → redirige al dossier creado.

**CSV:**
Upload con columnas flexibles (mínimo `company` o `linkedin` o `domain`). Valida duplicados, enriquece en paralelo (máx 10 concurrentes), devuelve un reporte con éxitos/fallos y links a cada dossier.

**Texto libre:**
Textarea. Endpoint `/api/dossier/from-text` llama a Haiku para extraer entidades (empresas, personas, URLs mencionadas), después corre el pipeline por cada una. Devuelve N dossiers creados.

### 5.3 Endpoint on-demand "Research persona"

`POST /api/dossier/:id/research-person`

1. Lee `contact_linkedin` del dossier
2. Llama a Haiku con web_search habilitado:
   ```
   Buscá información pública sobre {contact_name}, {contact_role} en {company_name}.
   LinkedIn: {contact_linkedin}

   Devolveme JSON con:
   - recent_posts: [{url, date, summary_1line}] (últimos 3 posts relevantes)
   - media_appearances: [{type:podcast|article|talk, url, topic}]
   - hobbies_interests: [string] (si hay evidencia pública)
   - connections_to_mara: [string] (ex-empresas en común con Mara Schmitman/Bondy,
     universidad, menciones de Argentina/LATAM, etc)
   - hook_recommendations: [string] (2-3 ángulos concretos para abrir el email)
   ```
3. Guarda en `person_research jsonb`, `person_research_status='done'`, `person_researched_at=now()`

Timeout: 90s. **IF** falla: `person_research_status='failed'`, mostrar botón "Reintentar".

---

## 6. Inputs/outputs de "Copy email context"

Cuando Bruno aprieta el botón, el clipboard queda con un JSON tipo:

```json
{
  "empresa": { "nombre": "...", "industry": "...", "headcount": 87, "funding": "Series B, $45M, Nov 2025" },
  "evidencia": { "roles": ["2 Sr Backend Python", "1 Data Eng"], "urls": [...] },
  "persona": { "nombre": "...", "rol": "...", "linkedin": "...", "idioma": "es" },
  "research_persona": { "posts": [...], "hooks": [...], "connexiones": [...] },
  "match_bondy": { "candidatos_disponibles": 23, "clientes_similares": ["Newfront"] },
  "angulo_sugerido": "...",
  "red_flags": []
}
```

Bruno pega eso en la sesión de Claude, redacta con personalización máxima, envía, y después marca `procesado`.

---

## 7. Variables de entorno nuevas

```
CRON_SECRET=...
APOLLO_API_KEY=...              (ya existe, reutilizar)
ANTHROPIC_API_KEY=...           (ya existe para Lead Analyzer)
COMPETITOR_BLOCKLIST=redbee,silver.dev,howdy,... (comma-separated)
DOSSIER_DAILY_LIMIT=50
```

---

## 8. Criterios de aceptación

**Cron**
- [ ] Corre L-V 7:30 AM sin intervención
- [ ] Procesa ≥30 empresas por run sin timeout
- [ ] Deja ≥10 dossiers con `status='ready'` y score ≥6 por día en promedio
- [ ] Zero duplicados contra `outreach_contacts` con sent_at <90 días
- [ ] Logs estructurados en Vercel/Supabase

**UI**
- [ ] Tab "Dossiers del día" lista en <2s
- [ ] Botón "Research persona" responde en <90s
- [ ] Input CSV procesa 20 filas en <3 min
- [ ] Botón "Marcar procesado" es idempotente

**Calidad**
- [ ] Hit rate (dossiers usados / dossiers generados) ≥60% en semana 2 de uso
- [ ] Cero falsos positivos de competidores/consultoras IT
- [ ] Cero contactos duplicados a empresas contactadas en últimos 90 días

---

## 9. Fuera de alcance (fase 2)

- Feedback loop automático (Dana Data lo arma después, con 3-4 semanas de data)
- Auto-expansión de `GREENHOUSE_COMPANIES` al scraper
- Dashboard de pipeline completo con conversión por score bucket
- Migración de `person_research` a cron vs on-demand (decidir después de ver costos)

---

## 10. Handoff

Cuando Mateo esté listo para arrancar:
1. Leer este doc
2. Revisar schema de `lead_dossiers` en Supabase (ya deployed)
3. Confirmar acceso a: Apollo API key, repo `bondy-tools`, Vercel project
4. Crear branch `feat/dossier-builder` en `bondy-tools`
5. Cualquier duda → Slack `#agentes-bondy` tagueando a Bruno Comercial
