# Sistema de notificaciones — Bondy

Mapa canónico de cómo cada form del sitio público dispara emails y posts a Slack.
**Última revisión: mayo 2026.**

> ⚠️ Antes de tocar cualquier cosa de Slack o emails, leé este archivo entero.
> El sistema tiene partes en Next.js, partes en Supabase Edge Functions y partes
> en DB triggers — son fáciles de duplicar sin querer.

---

## Resumen de un vistazo

| Form público | Tabla destino | Email a equipo | Email al usuario | Post a Slack |
|---|---|---|---|---|
| `/contact` | `contact_leads` | `hello@` (Resend) | — | `#comercial` con botones de clasificación |
| `/jobs` | `talent_pool` | — | Autoresponder con edit link | (pendiente) `#candidatos-inbound` |
| `/referrals` | `referrals` | — | "Gracias por referir" | (pendiente) `#candidatos-inbound` |
| `/thinking` (newsletter signup) | `newsletter_subscribers` | — | Confirm double opt-in (Resend) | — |
| `/busco-trabajo` (digest signup) | `job_subscribers` (proj bondy-tools) | — | Welcome (Resend) | — |
| `/roles/[slug]` apply | `bondy_applications` | — | — | — |

Para los detalles operativos, ver más abajo.

---

## Stack de servicios

- **Resend** — todo lo de envío de email. Dominio verificado: `wearebondy.com`.
  Sender por defecto: `Bondy Jobs <jobs@wearebondy.com>`.
  Env var: `RESEND_API_KEY` (en Vercel `bondy-tools`).
  Lib: `lib/resend.js`.

- **Slack (Rex)** — la única Slack App que usamos para post programático.
  Bot token: `SLACK_BOT_TOKEN` (en Vercel `bondy-tools` Y en Supabase project env vars).
  Para que un bot postee en un canal nuevo, hay que **invitar a Rex al canal**
  (`/invite @Rex`). Si no está invitado, `chat.postMessage` falla con `not_in_channel`.

- **Supabase Edge Functions** — Deno runtime, conectadas a triggers de DB.
  Las funciones relevantes: `notify-new-lead`, `classify-lead`.

- **DB triggers** — PostgreSQL triggers que invocan edge functions via HTTP.

---

## Flujo detallado por form

### `/contact` (form principal del sitio público — pedir servicio)

```
[Usuario submite el form]
   ↓
POST /api/contact (bondy-new-site)
   ├─ Verifica Turnstile (Cloudflare)
   ├─ INSERT en `contact_leads` ← acá empieza la magia del DB trigger
   └─ POST a tools.wearebondy.com/api/notify-lead (con x-notify-secret)
                ↓
                Envía email a hello@wearebondy.com via Resend
                (Reply-To = email del lead, así Mara/Bruno pueden responder directo)

[En paralelo, automático por DB trigger:]
INSERT en contact_leads
   ↓
TRIGGER on_new_contact_lead (AFTER INSERT)
   ↓
Función notify_new_lead() → HTTP POST a edge function
   ↓
Edge function `notify-new-lead`
   ↓
Slack chat.postMessage a #comercial (CC7KPD9A9) con:
   - Datos del lead
   - 3 botones: Prospect / Spam / Out of scope
   - Cada botón apunta a edge function `classify-lead?id=X&type=Y&secret=Z`
                ↓
                Cuando alguien hace click, classify-lead UPDATEa contact_leads
                con lead_type, classified_at, classification_reason
```

**Reglas importantes para `/contact`:**

- ❌ NO postear a Slack desde `/api/notify-lead` en Next.js. La edge function
  ya lo hace. Si Next.js también postea, vas a tener doble post en `#comercial`.
- ✅ Para cambiar el mensaje, los botones o el canal de Slack: editar la edge
  function `notify-new-lead` en Supabase (no este repo).
- ✅ Para cambiar el email a hello@: editar `app/api/notify-lead/route.js`.
- ✅ Para cambiar la lógica de clasificación: editar la edge function `classify-lead`.

### `/jobs` (talent pool — captura inicial de candidatos)

```
[Usuario submite form en /jobs]
   ↓
POST /api/jobs (bondy-new-site)
   ├─ Honeypot check (campo `website`)
   ├─ Turnstile check
   ├─ UPSERT en `talent_pool` (por email, case-insensitive)
   └─ POST a tools.wearebondy.com/api/notify-talent (async, no bloquea)
                ↓
                1. Email AUTORESPONDER al candidato (Resend)
                   "Recibimos tu perfil — completá los detalles" + edit link único
                2. Intenta postear a Slack #candidatos-inbound
                   (PENDIENTE: env SLACK_CANDIDATES_CHANNEL_ID + canal no creado)
```

**Estado de Slack para /jobs:** ⚠️ No funciona todavía. Falta:
1. Crear canal `#candidatos-inbound` en Slack
2. Invitar a Rex al canal: `/invite @Rex`
3. Agregar env var `SLACK_CANDIDATES_CHANNEL_ID=<ID>` en Vercel bondy-tools
4. Redeploy

Mientras no esté, el autoresponder al candidato SÍ funciona.

### `/referrals`

```
[Usuario submite form en /referrals]
   ↓
POST /api/referrals (bondy-new-site)
   ├─ Honeypot + Turnstile
   ├─ INSERT en `referrals` (bonus_amount=1000 USD)
   └─ POST a tools.wearebondy.com/api/notify-referral (async)
                ↓
                1. Email "Gracias por referir" al referrer (Resend, firma Mara)
                2. Intenta postear a Slack #candidatos-inbound
                   (mismo bloqueo que /jobs)
```

### `/thinking` (newsletter signup)

```
[Usuario submite email en /thinking]
   ↓
POST /api/newsletter/subscribe (bondy-new-site)
   ├─ Genera confirmation_token
   ├─ INSERT en `newsletter_subscribers` (confirmed_at: null)
   └─ POST a tools.wearebondy.com/api/newsletter/send-confirmation
                ↓
                Email "Confirmá tu suscripción" al usuario via Resend
                con link a /[lang]/newsletter/confirm?token=...

[Cuando usuario clickea confirm:]
GET /[lang]/newsletter/confirm?token=...
   ↓
GET /api/newsletter/confirm (bondy-new-site)
   ↓
UPDATE newsletter_subscribers SET confirmed_at = now()
```

Para envío del newsletter cada quince días: editor en `tools.wearebondy.com/internal/newsletter`.

### `/busco-trabajo` (job board digest)

Independiente del resto. Vive 100% en `bondy-tools`.

```
POST /api/job-subscribe (bondy-tools) → INSERT en job_subscribers + welcome email (Resend)

Cron lunes 10am ART:
GET /api/cron/weekly-digest → lista subscribers activos → arma digest con jobs
de los últimos 7 días → manda via Resend → UPDATE last_sent_at, send_count
```

---

## Edge Functions de Supabase (NO TOCAR salvo que sepas)

Listado en proyecto `tchppyxhapxtjemxrbqm`:

| Slug | Trigger | Acción |
|---|---|---|
| `notify-new-lead` | DB trigger `on_new_contact_lead` (INSERT en contact_leads) | Post a Slack `#comercial` con botones |
| `classify-lead` | Click en los botones del post de Slack | UPDATE contact_leads con clasificación |
| `send-email` | (revisar) | (revisar) |
| `sourcing-save` | (revisar) | (revisar) |
| `smooth-processor` | (revisar) | (revisar) |
| `reddit-radar` | (revisar) | (revisar) |

Si vas a tocar una edge function, primero **leéla** desde el dashboard de Supabase
o vía MCP `get_edge_function`. Tienen env vars propias (separadas de Vercel) —
`SLACK_BOT_TOKEN` está duplicado entre Supabase y Vercel.

---

## DB Triggers relevantes

```sql
-- /contact → Slack
CREATE TRIGGER on_new_contact_lead
  AFTER INSERT ON public.contact_leads
  FOR EACH ROW EXECUTE FUNCTION notify_new_lead();
```

La función `notify_new_lead()` es una PL/pgSQL que hace HTTP POST a la edge
function `notify-new-lead`. Para verla:

```sql
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'notify_new_lead';
```

---

## Env vars críticas

### Vercel `bondy-tools`
- `RESEND_API_KEY` — todo el envío de mails
- `NOTIFY_LEAD_SECRET` — protege /api/notify-* contra requests externos
- `SLACK_BOT_TOKEN` — token de Rex, para chat.postMessage
- `SLACK_COMERCIAL_CHANNEL_ID=CC7KPD9A9` — opcional, default hardcoded
- `SLACK_CANDIDATES_CHANNEL_ID` — ⚠️ FALTA configurar (talent_pool + referrals)
- `NEXT_PUBLIC_SUPABASE_URL` (tiene trailing `\n`, hay `.trim()` en código)
- `SUPABASE_SERVICE_ROLE_KEY`

### Vercel `bondy-new-site`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TURNSTILE_SECRET_KEY` — anti-spam
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `NOTIFY_LEAD_SECRET` — mismo que en bondy-tools
- `TOOLS_BASE_URL=https://tools.wearebondy.com`

### Supabase (proyecto tchppyxhapxtjemxrbqm)
- `SLACK_BOT_TOKEN` — duplicado de Vercel, para edge functions
- `CLASSIFY_SECRET` — protege classify-lead

---

## Antipatterns y bugs históricos

### ❌ Mandar leads de /contact vía Gmail OAuth (resuelto)
- Token expiraba silencioso → leads no llegaban a hello@.
- Migración a Resend: mayo 2026.

### ❌ Doble post en #comercial (resuelto)
- En una iteración intermedia, `notify-lead` de Next.js también posteaba a Slack.
- Como ya hay DB trigger que dispara la edge function `notify-new-lead`, eso
  creaba dos posts por cada lead. Se sacó el Slack post de notify-lead.

### ❌ Confirm email del newsletter via Gmail OAuth (resuelto)
- Mismo problema que `/contact`. Migrado a Resend mayo 2026.

### ⚠️ Spam acumulado en contact_leads / referrals / job_applications (limpio mayo 2026)
- 32 leads, 13 referrals, 1 job_application marcados como spam manualmente.
- Después se agregó: honeypot en todos los forms + Turnstile en /jobs.

---

## Cómo agregar una nueva notificación a Slack

Hay dos patrones válidos. Elegí UNO, no mezcles.

**Patrón A: DB trigger → Edge function**
- Pro: corre solo, no depende del Next.js endpoint que metió el row.
- Contra: lógica en Supabase, lejos del repo.
- Cuándo: cuando hay un INSERT en una tabla y el post a Slack es siempre el mismo.
- Ejemplo actual: `notify-new-lead`.

**Patrón B: Next.js endpoint llama a Slack directo**
- Pro: lógica en el repo, fácil de tocar.
- Contra: si tenés dos endpoints que escriben en la misma tabla, podés olvidarte
  el post en uno de los dos.
- Cuándo: cuando solo un path inserta en la tabla.
- Ejemplo actual: `notify-talent` (cuando esté configurado).

**Regla:** si elegiste A, NO hagas también B para la misma tabla. Si elegiste
B, podés eventualmente migrar a A si aparece otro path de inserción.
