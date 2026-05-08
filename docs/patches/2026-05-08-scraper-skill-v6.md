---
name: bondy-job-scraper
description: Scraper automático de jobs tech + HR/recruiting de 7 fuentes (GetOnBoard, YC Companies, Remotive, Himalayas, WeWorkRemotely, Greenhouse, Lever) para alimentar la tabla jobs de Supabase. Detecta idioma del aviso (es/en/mixed/unclear) y lo guarda en language_required.
---

Ejecutar el scraper de jobs de Bondy que recolecta ofertas laborales técnicas desde múltiples fuentes y las carga en Supabase.

## Objetivo
Scrape de jobs tech relevantes para Bondy (recruiting técnico LATAM) desde 7 fuentes:
- **GetOnBoard**: API JSON:API paginada, 4 categorías tech. Resuelve company/seniority/tags via endpoints auxiliares.
- **YC Companies**: Lista de empresas YC contratando con filtro LATAM/remote
- **Remotive**: API de jobs remotos, 5 categorías, filtro LATAM
- **Himalayas**: API JSON pública, worldwide/remote, hasta 200 jobs por query
- **WeWorkRemotely**: RSS feeds por categoría, 4 categorías con mapeo correcto
- **Greenhouse**: API pública con `?content=true` para extraer departments/seniority
- **Lever**: API pública para empresas LATAM (dLocal, Despegar, etc.)

Insertar nuevos jobs en la tabla `jobs` de Supabase, evitando duplicados.

## Pasos

1. **Instalar dependencias**: `pip install httpx --break-system-packages -q`

2. **Ejecutar el script** que está inline abajo. El script:
   - Acepta un argumento de modo: `init`, `<fuente>`, o `summary`
   - `init`: pre-carga URLs existentes y catálogo GOB → cachea en `/tmp/scraper_state.json`
   - `<fuente>`: scraps esa fuente, hace upsert, acumula en `/tmp/scraper_results.json`
   - `summary`: imprime tabla agregada
   - **Razón del split**: en sandboxes con timeout corto, un script monolítico no completa. Una fuente por bash call entra cómoda.

3. **Supabase config**:
   - URL: `https://tchppyxhapxtjemxrbqm.supabase.co`
   - Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw`

4. **Escribir el script** a `/home/claude/scraper.py` (el código completo está más abajo en este archivo, dentro del bloque ```python).

5. **Ejecutar paso a paso** (cada bash call es independiente y debe caber holgado en el timeout del runtime):

   ```bash
   # Init (rápido, ~5s) — carga seniorities GOB, resetea state
   cd /home/claude && python3 scraper.py init

   # Cargar URLs existentes en chunks de 1000 × 3 chunks por call (~6-9s/call)
   # Repetir HASTA que el output diga "✓ done"
   cd /home/claude && python3 scraper.py fetch-existing
   cd /home/claude && python3 scraper.py fetch-existing
   # … repetir hasta ✓ done (con 3854 URLs alcanza con 2 calls, margen para crecer)

   # GOB por categoría (4 calls, una por categoría)
   cd /home/claude && python3 scraper.py gob-cat programming
   cd /home/claude && python3 scraper.py gob-cat sysadmin-devops-qa
   cd /home/claude && python3 scraper.py gob-cat data-science-analytics
   cd /home/claude && python3 scraper.py gob-cat machine-learning-ai

   # Resto de fuentes (1 call cada una)
   cd /home/claude && python3 scraper.py yc
   cd /home/claude && python3 scraper.py remotive
   cd /home/claude && python3 scraper.py himalayas
   cd /home/claude && python3 scraper.py wwr
   cd /home/claude && python3 scraper.py greenhouse
   cd /home/claude && python3 scraper.py lever

   # Summary final
   cd /home/claude && python3 scraper.py summary
   ```

   - `init` debe correr primero.
   - `fetch-existing` es **idempotente y acumulativo**: mirá el output de cada call. Si dice `→ continuar`, llamalo de nuevo. Si dice `✓ done`, pasá al siguiente paso. Nunca pases a GOB/sources sin `urls_done`.
   - El orden de las 4 categorías GOB y las 6 fuentes restantes es indistinto.
   - Si una fuente falla por red, seguir con las demás. **No bloquear todo el scraper por una fuente caída.**
   - **NUNCA desactives `resolve_gob_company`** — los nombres de empresas son críticos para morning-prospecting. Si una categoría se cuelga, dejala fallar y seguir; vale más perder esa categoría que tener jobs con company "Unknown".

6. **Reportar resultado** con la tabla por fuente que devuelve `summary`.

## Código del script (`scraper.py`)

```python
import httpx
import uuid
import re
import sys
import json
import os
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

STATE_FILE   = "/tmp/scraper_state.json"
RESULTS_FILE = "/tmp/scraper_results.json"

SUPABASE_URL = "https://tchppyxhapxtjemxrbqm.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw"
GETONBOARD_API = "https://www.getonbrd.com/api/v0"
YC_API        = "https://yc-oss.github.io/api"
REMOTIVE_API  = "https://remotive.com/api/remote-jobs"
HIMALAYAS_API = "https://himalayas.app/jobs/api"

GOB_CATEGORIES      = ["programming", "sysadmin-devops-qa", "data-science-analytics", "machine-learning-ai", "hr"]
REMOTIVE_CATEGORIES = ["software-dev", "data", "devops", "product", "design", "human-resources"]

# WWR: cada slug mapea a SU categoría real (FIX: antes product/design caían a "programming")
WWR_CAT_MAP = {
    "remote-programming-jobs":     "programming",
    "remote-devops-sysadmin-jobs": "sysadmin-devops-qa",
    "remote-product-jobs":         "product",
    "remote-design-jobs":          "design",
}

GREENHOUSE_COMPANIES = [
    "stripe", "twilio", "mongodb", "datadog", "elastic", "okta", "brex",
    "postman", "grammarly", "gusto", "checkr", "amplitude", "mixpanel",
    "contentful", "nubank", "pagerduty", "figma", "vercel", "cloudflare",
    "planetscale", "lattice",
]

# Lever: empresas LATAM con boards públicos en lever.co
LEVER_COMPANIES = ["dlocal", "despegar", "rappi", "kavak", "nuvemshop", "auth0"]

YC_MIN_TEAM = 50
YC_MAX_TEAM = 10000
LATAM_KEYWORDS = [
    "latin america", "latam", "brazil", "brasil", "mexico", "méxico",
    "argentina", "colombia", "chile", "peru", "perú", "uruguay",
    "costa rica", "panama", "panamá", "ecuador", "bolivia",
    "remote", "worldwide", "global", "anywhere", "americas",
]

headers_sb = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=ignore-duplicates",
}

# ─────────────────────────────────────────────
# GOB CATALOGS — pre-carga al inicio (FIX 2026-04-29)
# Antes: GOB_SENIORITY_ID_MAP hardcoded estaba MAL (ID 4 era "Senior", no "Mid-Senior";
#   ID 6 no existe).
# Ahora: cargamos /seniorities (5 items) en memoria al inicio para resolver IDs.
# Tags: la API GOB no expone un mapping ID-numérico → nombre sin auth, así que
#   los tags se extraen desde el título via keyword scan (igual que GH/Lever).
# ─────────────────────────────────────────────
GOB_SENIORITY_MAP = {}   # id (str) -> label normalizado
GOB_COMPANY_CACHE = {}   # id (str) -> name (lazy, solo empresas vistas)

# Mapeo de nombres GOB a labels normalizados que ya usábamos en marzo
SEN_NAME_NORMALIZE = {
    "Sin experiencia": "Junior",
    "Junior":          "Junior",
    "Semi Senior":     "Mid-Senior",
    "Senior":          "Senior",
    "Expert":          "Lead / Staff",
}

def load_gob_catalogs(c):
    """Carga seniorities. Tags NO se cargan porque /tags devuelve IDs string-slug
    incompatibles con los IDs numéricos que vienen embebidos en los jobs.
    En su lugar, los tags se extraen desde el título via keywords (igual que GH/Lever).
    """
    try:
        r = c.get(f"{GETONBOARD_API}/seniorities", headers={"Accept": "application/json"}, timeout=15)
        if r.status_code == 200:
            for s in r.json().get("data", []):
                sid = str(s.get("id"))
                name = s.get("attributes", {}).get("name", "")
                GOB_SENIORITY_MAP[sid] = SEN_NAME_NORMALIZE.get(name, name or "Not specified")
        print(f"[GOB-catalog] {len(GOB_SENIORITY_MAP)} seniorities loaded")
    except Exception as e:
        print(f"[GOB-catalog] Error loading seniorities: {e}")

def resolve_gob_company(c, company_id):
    """Lazy lookup de nombre de empresa por ID, con cache."""
    cid = str(company_id)
    if cid in GOB_COMPANY_CACHE:
        return GOB_COMPANY_CACHE[cid]
    try:
        r = c.get(f"{GETONBOARD_API}/companies/{cid}",
                  headers={"Accept": "application/json"}, timeout=10)
        if r.status_code == 200:
            name = r.json().get("data", {}).get("attributes", {}).get("name", "Unknown")
            GOB_COMPANY_CACHE[cid] = name
            return name
    except Exception:
        pass
    GOB_COMPANY_CACHE[cid] = "Unknown"
    return "Unknown"

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def is_latam_relevant(text):
    return any(k in (text or "").lower() for k in LATAM_KEYWORDS)

def get_existing_urls(c):
    urls = set()
    offset = 0
    while True:
        r = c.get(f"{SUPABASE_URL}/rest/v1/jobs",
                  params={"select": "source_url", "limit": 1000, "offset": offset},
                  headers=headers_sb)
        if r.status_code != 200:
            break
        rows = r.json()
        if not rows:
            break
        for row in rows:
            if row.get("source_url"):
                urls.add(row["source_url"])
        if len(rows) < 1000:
            break
        offset += 1000
    return urls

# ─────────────────────────────────────────────
# Helpers compartidos (GOB, Greenhouse, Lever)
# ─────────────────────────────────────────────
def _extract_seniority(title, content):
    """Heurística para extraer seniority desde título y descripción."""
    t = (title or "").lower()
    if any(k in t for k in ["staff ", "principal ", "distinguished"]):
        return "Lead / Staff"
    if any(k in t for k in ["senior", " sr.", " sr "]):
        return "Senior"
    if any(k in t for k in ["junior", " jr.", " jr ", "entry"]):
        return "Junior"
    if any(k in t for k in ["lead", "manager", "head of"]):
        return "Lead / Staff"
    return "Not specified"

def _extract_techs(content):
    """Extrae tech stack común desde texto (título o descripción)."""
    if not content:
        return []
    text = content.lower()
    KEYWORDS = [
        "python", "javascript", "typescript", "java", "golang", "rust", "ruby", "php",
        "react", "vue", "angular", "node", "django", "rails", "spring", "flask", "laravel",
        "aws", "gcp", "azure", "kubernetes", "docker", "terraform", "postgres", "postgresql",
        "mongodb", "redis", "kafka", "graphql", "rest", "next.js", "nextjs",
        "swift", "kotlin", "android", "ios", "flutter", "react native",
        "spark", "airflow", "snowflake", "databricks", "tensorflow", "pytorch",
        "fullstack", "full-stack", "frontend", "backend", "devops", "sre",
        "data engineer", "data scientist", "machine learning", "ai", "nlp",
    ]
    found = []
    for kw in KEYWORDS:
        if kw in text:
            found.append(kw.strip().rstrip("."))
    seen, out = set(), []
    for k in found:
        if k not in seen:
            seen.add(k); out.append(k)
    return out[:10]

# ─────────────────────────────────────────────
# GetOnBoard
# ─────────────────────────────────────────────
def scrape_gob(c, only_category=None):
    jobs = []
    sen_map_str = {
        "Without experience": "Junior", "1-2 years": "Junior",
        "2-3 years": "Mid-Senior", "3-4 years": "Mid-Senior",
        "Expert": "Lead / Staff", "5-10 years": "Senior", "10+ years": "Senior",
    }
    cats = [only_category] if only_category else GOB_CATEGORIES
    for cat in cats:
        page = 1
        while page <= 5:
            try:
                r = c.get(f"{GETONBOARD_API}/categories/{cat}/jobs",
                          params={"per_page": 100, "page": page},
                          headers={"Accept": "application/json"}, timeout=30)
                if r.status_code != 200:
                    break
                data = r.json()
                jlist = data.get("data", [])
                if not jlist:
                    break
                for j in jlist:
                    a = j.get("attributes", {})

                    # ── Company ──
                    ci = a.get("company", {})
                    cn = "Unknown"
                    if isinstance(ci, dict):
                        cd = ci.get("data", {})
                        if isinstance(cd, dict):
                            if cd.get("attributes"):
                                cn = cd["attributes"].get("name", "Unknown")
                            elif cd.get("id"):
                                cn = resolve_gob_company(c, cd["id"])

                    su = f"https://www.getonbrd.com/jobs/{j.get('id', '')}"

                    raw_countries = a.get("countries", []) or []
                    countries = []
                    for item in raw_countries:
                        if isinstance(item, str):
                            countries.append(item)
                        elif isinstance(item, dict):
                            countries.append(item.get("name") or item.get("id") or str(item))

                    loc = (", ".join(countries) if countries
                           else ("Remote" if a.get("remote") else "Unknown"))

                    # ── Tags (FIX): extraer desde título via keyword scan
                    # (la API no expone un mapping ID-numérico → nombre sin auth)
                    ts = _extract_techs(a.get("title", ""))

                    # ── Seniority (FIX): resolver IDs contra GOB_SENIORITY_MAP ──
                    raw_sen = a.get("seniority", "")
                    sen = "Not specified"
                    if isinstance(raw_sen, dict):
                        sen_data = raw_sen.get("data") or {}
                        sen_id = str(sen_data.get("id")) if sen_data.get("id") is not None else None
                        if sen_id and sen_id in GOB_SENIORITY_MAP:
                            sen = GOB_SENIORITY_MAP[sen_id]
                    elif isinstance(raw_sen, str) and raw_sen:
                        sen = sen_map_str.get(raw_sen, raw_sen)

                    pa = a.get("published_at")
                    if isinstance(pa, (int, float)):
                        pa = datetime.fromtimestamp(pa, tz=timezone.utc).isoformat()
                    elif not isinstance(pa, str):
                        pa = None

                    ir = a.get("remote", False)
                    rm = a.get("remote_modality", "") or ""
                    mod = "remote" if ir else ("hybrid" if "hybrid" in str(rm).lower() else "on-site")

                    jobs.append({
                        "id": str(uuid.uuid4()), "title": a.get("title", "Unknown"),
                        "company": cn, "location": loc, "countries": countries,
                        "modality": mod, "seniority": sen, "tech_stack": ts,
                        "category": cat, "source": "getonboard", "source_url": su,
                        "is_featured": False, "status": "pending",
                        "min_salary": a.get("min_salary"), "max_salary": a.get("max_salary"),
                        "currency": "USD", "published_at": pa,
                        "collected_at": now_iso(), "created_at": now_iso(), "updated_at": now_iso(),
                    })

                mp = data.get("meta", {}).get("total_pages", 1)
                if page >= mp:
                    break
                page += 1
            except Exception as e:
                print(f"[GOB] Error {cat} p{page}: {e}")
                break
    print(f"[GOB] {len(jobs)} jobs ({len(GOB_COMPANY_CACHE)} empresas resueltas)")
    return jobs

# ─────────────────────────────────────────────
# YC Companies
# ─────────────────────────────────────────────
def scrape_yc(c):
    jobs = []
    # FIX (2026-04-29): probar endpoints alternativos en orden
    yc_endpoints = [
        f"{YC_API}/companies/hiring.json",
        f"{YC_API}/hiring.json",
    ]
    raw = None
    for url in yc_endpoints:
        try:
            r = c.get(url, timeout=30)
            if r.status_code == 200:
                raw = r.json()
                print(f"[YC] OK from {url}")
                break
            else:
                print(f"[YC] {url} → {r.status_code}")
        except Exception as e:
            print(f"[YC] {url} error: {e}")
    if not raw:
        print("[YC] No endpoint disponible — fuente saltada")
        return jobs
    try:
        for co in raw:
            ts = co.get("team_size", 0) or 0
            if ts < YC_MIN_TEAM or ts > YC_MAX_TEAM:
                continue
            locs = co.get("all_locations", "") or ""
            regs = co.get("regions", []) or []
            tags = co.get("tags", []) or []
            il = is_latam_relevant(locs)
            irf = "remote" in locs.lower() or any(
                rv.lower() in ("remote", "latam", "latin america", "worldwide", "americas")
                for rv in (regs if isinstance(regs, list) else [])
            )
            if not (il or irf):
                continue
            n = co.get("name", "Unknown")
            sl = co.get("slug", "")
            b = co.get("batch", "")
            ol = co.get("one_liner", "") or ""
            tn = [t.lower() for t in tags if isinstance(t, str)]
            cat = (
                "machine-learning-ai" if any(t in tn for t in ["machine learning", "artificial intelligence", "ai"])
                else "data-science-analytics" if any(t in tn for t in ["data science", "analytics"])
                else "sysadmin-devops-qa" if any(t in tn for t in ["devops", "infrastructure"])
                else "programming"
            )
            jobs.append({
                "id": str(uuid.uuid4()),
                "title": f"[YC {b}] Hiring at {n} -- {ol[:100]}",
                "company": n, "location": locs[:200] or "Remote", "countries": [],
                "modality": "remote" if irf else "hybrid", "seniority": "Senior",
                "tech_stack": tn[:10], "category": cat, "source": "yc",
                "source_url": f"https://www.ycombinator.com/companies/{sl}",
                "is_featured": co.get("top_company", False), "status": "pending",
                "min_salary": None, "max_salary": None, "currency": "USD",
                "published_at": now_iso(),
                "collected_at": now_iso(), "created_at": now_iso(), "updated_at": now_iso(),
            })
    except Exception as e:
        print(f"[YC] Error procesando: {e}")
    print(f"[YC] {len(jobs)} companies")
    return jobs

# ─────────────────────────────────────────────
# Remotive
# ─────────────────────────────────────────────
def scrape_remotive(c):
    jobs = []
    cat_map = {
        "software-dev": "programming", "data": "data-science-analytics",
        "devops": "sysadmin-devops-qa", "product": "product", "design": "design",
        "human-resources": "hr",
    }
    EXCLUDE = ["usa only", "us only", "united states only", "europe only", "eu only",
               "uk only", "canada only", "apac only", "asia only"]
    for cat in REMOTIVE_CATEGORIES:
        try:
            r = c.get(REMOTIVE_API, params={"category": cat, "limit": 200}, timeout=30)
            if r.status_code != 200:
                continue
            for j in r.json().get("jobs", []):
                loc = j.get("candidate_required_location", "") or ""
                ll = loc.lower()
                if any(x in ll for x in EXCLUDE):
                    continue
                if not is_latam_relevant(loc):
                    continue
                su = j.get("url", "") or f"https://remotive.com/remote-jobs/{j.get('id','')}"
                sal = j.get("salary", "") or ""
                mins, maxs = None, None
                nums = re.findall(r"\d+", sal.replace(",", ""))
                if len(nums) >= 2:
                    mins, maxs = int(nums[0]), int(nums[1])
                elif len(nums) == 1:
                    mins = int(nums[0])
                jobs.append({
                    "id": str(uuid.uuid4()), "title": j.get("title", "Unknown"),
                    "company": j.get("company_name", "Unknown"),
                    "location": loc[:200] or "Remote", "countries": [],
                    "modality": "remote", "seniority": "Not specified",
                    "tech_stack": (j.get("tags", []) or [])[:10],
                    "category": cat_map.get(cat, "programming"), "source": "remotive",
                    "source_url": su, "is_featured": False, "status": "pending",
                    "min_salary": mins, "max_salary": maxs, "currency": "USD",
                    "published_at": j.get("publication_date"),
                    "collected_at": now_iso(), "created_at": now_iso(), "updated_at": now_iso(),
                })
        except Exception as e:
            print(f"[Remotive] Error {cat}: {e}")
    print(f"[Remotive] {len(jobs)} jobs")
    return jobs

# ─────────────────────────────────────────────
# Himalayas
# ─────────────────────────────────────────────
def scrape_himalayas(c):
    jobs = []
    search_queries = ["software engineer", "backend", "frontend", "data engineer",
                      "devops", "product manager", "machine learning", "fullstack",
                      # HR / recruiting expansion (2026-05-08)
                      "recruiter", "talent acquisition", "people operations", "human resources"]
    seen_guids = set()
    for q in search_queries:
        try:
            offset = 0
            while offset < 200:
                r = c.get(f"{HIMALAYAS_API}/search",
                          params={"q": q, "worldwide": "true", "limit": 20, "offset": offset},
                          timeout=30)
                if r.status_code == 429:
                    print(f"[Himalayas] Rate limited on '{q}'")
                    break
                if r.status_code != 200:
                    break
                data = r.json()
                jlist = data.get("jobs", [])
                if not jlist:
                    break
                for j in jlist:
                    guid = j.get("guid") or j.get("applicationLink", "")
                    if guid in seen_guids:
                        continue
                    seen_guids.add(guid)
                    loc_list = j.get("locationRestrictions") or []
                    loc = ", ".join(loc_list) if loc_list else "Worldwide / Remote"
                    cats = j.get("categories") or []
                    cat_str = cats[0].lower() if cats else ""
                    title_lc = (j.get("title", "") or "").lower()
                    cat_signal = cat_str + " " + title_lc
                    category = (
                        "hr" if any(k in cat_signal for k in ["recruit", "talent acquisition", "talent-acquisition", "people-op", "people operations", "human-resource", "human resources"])
                        else "machine-learning-ai" if any(k in cat_str for k in ["ml", "machine", "ai", "nlp"])
                        else "data-science-analytics" if "data" in cat_str
                        else "sysadmin-devops-qa" if any(k in cat_str for k in ["devops", "sysadmin", "infra"])
                        else "programming"
                    )
                    pub = j.get("pubDate")
                    if isinstance(pub, (int, float)):
                        pub = datetime.fromtimestamp(pub, tz=timezone.utc).isoformat()
                    elif not isinstance(pub, str):
                        pub = None
                    seniority_raw = j.get("seniority") or []
                    seniority = seniority_raw[0] if seniority_raw else "Not specified"
                    jobs.append({
                        "id": str(uuid.uuid4()), "title": j.get("title", "Unknown"),
                        "company": j.get("companyName", "Unknown"),
                        "location": loc[:200], "countries": loc_list,
                        "modality": "remote",
                        "seniority": seniority,
                        "tech_stack": cats[:10],
                        "category": category, "source": "himalayas",
                        "source_url": guid,
                        "is_featured": False, "status": "pending",
                        "min_salary": j.get("minSalary"), "max_salary": j.get("maxSalary"),
                        "currency": j.get("currency") or "USD",
                        "published_at": pub,
                        "collected_at": now_iso(), "created_at": now_iso(), "updated_at": now_iso(),
                    })
                total = data.get("totalCount", 0)
                offset += 20
                if offset >= min(total, 200):
                    break
        except Exception as e:
            print(f"[Himalayas] Error '{q}': {e}")
    print(f"[Himalayas] {len(jobs)} jobs (deduped by guid)")
    return jobs

# ─────────────────────────────────────────────
# WeWorkRemotely (RSS por categoria)
# FIX (2026-04-29): cada categoría va a SU categoría real
# ─────────────────────────────────────────────
def scrape_wwr(c):
    jobs = []
    for slug, category in WWR_CAT_MAP.items():
        try:
            r = c.get(f"https://weworkremotely.com/categories/{slug}.rss",
                      headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
            if r.status_code != 200:
                print(f"[WWR] {slug}: {r.status_code}")
                continue
            root = ET.fromstring(r.text)
            items = root.findall(".//item")
            for item in items:
                def tag(name):
                    el = item.find(name)
                    return el.text.strip() if el is not None and el.text else ""

                title_raw = tag("title")
                if ": " in title_raw:
                    company, title = title_raw.split(": ", 1)
                else:
                    company, title = "Unknown", title_raw

                guid = tag("guid") or tag("link")
                pub_raw = tag("pubDate")
                pub_iso = None
                if pub_raw:
                    try:
                        from email.utils import parsedate_to_datetime
                        pub_iso = parsedate_to_datetime(pub_raw).isoformat()
                    except Exception:
                        pass

                region = tag("region") or "Remote"
                cat_rss = tag("category") or ""

                if not guid:
                    continue

                jobs.append({
                    "id": str(uuid.uuid4()), "title": title or "Unknown",
                    "company": company, "location": region[:200],
                    "countries": [], "modality": "remote",
                    "seniority": "Not specified",
                    "tech_stack": [cat_rss] if cat_rss else [],
                    "category": category, "source": "weworkremotely",
                    "source_url": guid,
                    "is_featured": False, "status": "pending",
                    "min_salary": None, "max_salary": None, "currency": "USD",
                    "published_at": pub_iso,
                    "collected_at": now_iso(), "created_at": now_iso(), "updated_at": now_iso(),
                })
        except Exception as e:
            print(f"[WWR] Error {slug}: {e}")
    print(f"[WWR] {len(jobs)} jobs")
    return jobs

# ─────────────────────────────────────────────
# Greenhouse
# FIX (2026-04-29): pedir ?content=true y extraer departments + content para tags + seniority
# ─────────────────────────────────────────────
def scrape_greenhouse(c):
    jobs = []
    for company in GREENHOUSE_COMPANIES:
        try:
            r = c.get(f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs",
                      params={"content": "true"}, timeout=30)
            if r.status_code != 200:
                continue
            for j in r.json().get("jobs", []):
                loc = (j.get("location") or {}).get("name", "") or ""
                if not is_latam_relevant(loc):
                    continue
                su = j.get("absolute_url", "") or f"https://boards.greenhouse.io/{company}/jobs/{j.get('id','')}"
                upd = j.get("updated_at")
                title = j.get("title") or "Unknown"
                title_lc = title.lower()

                deps = j.get("departments") or []
                dep_names = " ".join((d.get("name", "") or "") for d in deps).lower() if deps else ""

                category = (
                    "hr" if any(k in title_lc + " " + dep_names for k in ["recruit", "sourcer", "talent acquisition", "people ops", "people operations", "human resources", "talent management", "talent development"])
                    else "machine-learning-ai" if any(k in title_lc + " " + dep_names for k in ["ml ", "machine learning", " ai ", "nlp", "llm"])
                    else "data-science-analytics" if any(k in title_lc + " " + dep_names for k in ["data engineer", "data scientist", "analytics", "analyst"])
                    else "sysadmin-devops-qa" if any(k in title_lc + " " + dep_names for k in ["devops", "sre ", "infrastructure", "platform", "qa ", "test"])
                    else "design" if "design" in dep_names
                    else "product" if "product" in dep_names and "engineer" not in title_lc
                    else "programming"
                )

                content = j.get("content", "") or ""
                techs = _extract_techs(content)
                seniority = _extract_seniority(title, content)

                jobs.append({
                    "id": str(uuid.uuid4()), "title": title,
                    "company": company.capitalize(), "location": loc[:200],
                    "countries": [], "modality": "remote",
                    "seniority": seniority,
                    "tech_stack": techs,
                    "category": category, "source": "greenhouse",
                    "source_url": su,
                    "is_featured": False, "status": "pending",
                    "min_salary": None, "max_salary": None, "currency": "USD",
                    "published_at": upd,
                    "collected_at": now_iso(), "created_at": now_iso(), "updated_at": now_iso(),
                })
        except Exception as e:
            print(f"[Greenhouse] Error {company}: {e}")
    print(f"[Greenhouse] {len(jobs)} jobs (LATAM/remote filtered)")
    return jobs

# ─────────────────────────────────────────────
# Lever (NUEVO 2026-04-29 — fuente recuperada)
# ─────────────────────────────────────────────
def scrape_lever(c):
    jobs = []
    for company in LEVER_COMPANIES:
        try:
            r = c.get(f"https://api.lever.co/v0/postings/{company}",
                      params={"mode": "json"}, timeout=30)
            if r.status_code != 200:
                continue
            for j in r.json():
                country = j.get("country", "") or ""
                cats = j.get("categories", {}) or {}
                loc = cats.get("location", "") or ""
                full_loc = f"{loc} {country}".strip()
                if not is_latam_relevant(full_loc):
                    continue

                title = j.get("text", "Unknown")
                title_lc = title.lower()
                team = (cats.get("team", "") or "").lower()
                department = (cats.get("department", "") or "").lower()
                ctx = title_lc + " " + team + " " + department

                category = (
                    "hr" if any(k in ctx for k in ["recruit", "sourcer", "talent acquisition", "people ops", "people operations", "human resources", "talent management", "talent development"])
                    else "machine-learning-ai" if any(k in ctx for k in ["machine learning", " ai ", "ml ", "nlp"])
                    else "data-science-analytics" if any(k in ctx for k in ["data engineer", "data scientist", "analytics"])
                    else "sysadmin-devops-qa" if any(k in ctx for k in ["devops", "sre ", "infrastructure", "platform", "qa "])
                    else "design" if "design" in team or "design" in department
                    else "product" if "product" in team and "engineer" not in title_lc
                    else "programming"
                )

                seniority = _extract_seniority(title, j.get("descriptionPlain", ""))
                techs = _extract_techs(j.get("descriptionPlain", ""))

                modality = "remote" if "remote" in (cats.get("commitment", "") or "").lower() or "remote" in loc.lower() else "hybrid"

                created = j.get("createdAt")
                if isinstance(created, (int, float)):
                    created = datetime.fromtimestamp(created/1000, tz=timezone.utc).isoformat()

                jobs.append({
                    "id": str(uuid.uuid4()), "title": title,
                    "company": company.replace("-", " ").title(),
                    "location": full_loc[:200] or "Remote", "countries": [],
                    "modality": modality, "seniority": seniority,
                    "tech_stack": techs, "category": category, "source": "lever",
                    "source_url": j.get("hostedUrl", "") or j.get("applyUrl", ""),
                    "is_featured": False, "status": "pending",
                    "min_salary": None, "max_salary": None, "currency": "USD",
                    "published_at": created,
                    "collected_at": now_iso(), "created_at": now_iso(), "updated_at": now_iso(),
                })
        except Exception as e:
            print(f"[Lever] Error {company}: {e}")
    print(f"[Lever] {len(jobs)} jobs (LATAM/remote filtered)")
    return jobs

# ─────────────────────────────────────────────
# Language detection (NUEVO 2026-05-08)
# Title-based heuristic, no external deps. Output goes to jobs.language_required
# (column added in migration applied 2026-05-08). UI uses this for the 'Idioma'
# filter in /busco-trabajo and /recursos-recruiters/busco-trabajo.
# ─────────────────────────────────────────────
_SPANISH_STOPWORDS = {
    "y", "de", "la", "el", "en", "los", "las", "para", "con", "del",
    "un", "una", "por", "que", "se", "su", "sus", "es", "como", "al",
    "buscamos", "trabajo", "experiencia", "tecnología", "tecnologia",
    "desarrollador", "desarrolladora", "ingeniero", "ingeniera",
    "líder", "lider", "responsable", "encargado", "encargada",
    "analista", "consultor", "consultora", "técnico", "tecnico",
    "reclutador", "reclutadora",
}
# Pure English grammar words. Deliberately EXCLUDES developer/engineer/senior/
# junior/lead/manager/experience/team — those are universal anglicisms in LATAM
# tech postings and would push every Spanish title into the English bucket.
_ENGLISH_STOPWORDS = {
    "and", "the", "of", "in", "for", "with", "to", "is", "are",
    "we", "you", "our", "your", "be", "as", "or", "an", "at",
    "looking", "hiring", "joining", "remote", "based",
}

def _detect_language(title):
    """Returns 'es' | 'en' | 'mixed' | 'unclear' from job title alone.
    Heuristic: stopword density + Spanish-accent signal. False positives are
    tolerable — UI exposes 'Sin detectar' as an explicit user-pickable bucket.
    """
    if not title:
        return "unclear"
    t = title.lower()
    words = re.findall(r"[a-zA-Z\u00f1\u00d1\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc\u00c1\u00c9\u00cd\u00d3\u00da\u00dc]+", t)
    if not words:
        return "unclear"
    es_hits = sum(1 for w in words if w in _SPANISH_STOPWORDS)
    en_hits = sum(1 for w in words if w in _ENGLISH_STOPWORDS)
    # Castilian accents are a strong Spanish signal worth ~2 stopwords each.
    if re.search(r"[\u00f1\u00e1\u00e9\u00ed\u00f3\u00fa\u00fc]", t):
        es_hits += 2
    if es_hits == 0 and en_hits == 0:
        return "unclear"
    if es_hits > 0 and en_hits == 0:
        return "es"
    if en_hits > 0 and es_hits == 0:
        return "en"
    if es_hits >= en_hits * 2:
        return "es"
    if en_hits >= es_hits * 2:
        return "en"
    return "mixed"


# ─────────────────────────────────────────────
# Upsert a Supabase
# ─────────────────────────────────────────────
def upsert(c, jobs, existing):
    # Detect required language from title for every job before insertion.
    # Idempotent: respects pre-set values (in case a future source provides
    # the field directly).
    for j in jobs:
        if not j.get("language_required"):
            j["language_required"] = _detect_language(j.get("title", ""))
    new = [j for j in jobs if j.get("source_url") and j["source_url"] not in existing]
    skipped = len(jobs) - len(new)
    if not new:
        return {"inserted": 0, "skipped": skipped, "errors": 0}
    ins, errs = 0, 0
    for i in range(0, len(new), 50):
        batch = new[i : i + 50]
        try:
            r = c.post(f"{SUPABASE_URL}/rest/v1/jobs", headers=headers_sb, json=batch, timeout=30)
            if r.status_code in (200, 201):
                ins += len(batch)
            elif r.status_code == 409:
                for j in batch:
                    try:
                        r2 = c.post(f"{SUPABASE_URL}/rest/v1/jobs", headers=headers_sb, json=j, timeout=15)
                        if r2.status_code in (200, 201):
                            ins += 1
                        else:
                            errs += 1
                    except Exception:
                        errs += 1
            else:
                print(f"[Insert] Error {r.status_code}: {r.text[:200]}")
                errs += len(batch)
        except Exception as e:
            print(f"[Insert] Exception: {e}")
            errs += len(batch)
    return {"inserted": ins, "skipped": skipped, "errors": errs}


# ─────────────────────────────────────────────
# MAIN — ejecución granular por sub-paso (FIX 2026-05-06: timeouts del runtime)
# ─────────────────────────────────────────────
# Razón: el runtime de Cowork tiene timeout corto (~45s). Subdividir cada
# sub-paso pesado para que ningún call individual se acerque al límite.
#
# State persistente (/tmp/scraper_state.json):
#   urls            — set de source_urls existentes en DB (acumulativo)
#   urls_offset     — offset actual de paginación (acumulativo, idempotente)
#   urls_done       — bool, true cuando se terminó de paginar
#   gob_seniority   — map id→label, cargado en init
#   gob_companies   — cache id→name, persistente entre calls
#
# Modos:
#   init               → reset state, cargar GOB seniorities (rápido)
#   fetch-existing     → seguir paginando URLs desde donde quedó (idempotente,
#                        repetible hasta urls_done=true)
#   gob-cat <cat>      → scrape 1 categoría GOB; cat ∈ {programming,
#                        sysadmin-devops-qa, data-science-analytics, machine-learning-ai}
#   yc | remotive | himalayas | wwr | greenhouse | lever → 1 fuente por call
#   summary            → tabla agregada
# ─────────────────────────────────────────────

EXISTING_CHUNK_SIZE = 1000   # 1 chunk = 1 página de Supabase
EXISTING_CHUNKS_PER_CALL = 3 # cuántos chunks hace cada call de fetch-existing

SCRAPERS = {
    "yc":         scrape_yc,
    "remotive":   scrape_remotive,
    "himalayas":  scrape_himalayas,
    "wwr":        scrape_wwr,
    "greenhouse": scrape_greenhouse,
    "lever":      scrape_lever,
}

def load_state():
    if not os.path.exists(STATE_FILE):
        return None
    with open(STATE_FILE) as f:
        return json.load(f)

def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)

def restore_globals_from_state(state):
    GOB_SENIORITY_MAP.update(state.get("gob_seniority", {}))
    GOB_COMPANY_CACHE.update(state.get("gob_companies", {}))

def persist_globals_to_state(state):
    state["gob_seniority"] = GOB_SENIORITY_MAP
    state["gob_companies"] = GOB_COMPANY_CACHE

def cmd_init(c):
    load_gob_catalogs(c)
    state = {
        "urls": [],
        "urls_offset": 0,
        "urls_done": False,
        "gob_seniority": GOB_SENIORITY_MAP,
        "gob_companies": {},
        "ts": now_iso(),
    }
    save_state(state)
    with open(RESULTS_FILE, "w") as f:
        json.dump({}, f)
    print(f"[init] gob_seniorities={len(GOB_SENIORITY_MAP)}  state reset")

def cmd_fetch_existing(c):
    state = load_state()
    if state is None:
        print("[error] falta state — corré 'init' primero"); sys.exit(1)
    if state.get("urls_done"):
        print(f"[fetch-existing] ya completo, urls={len(state['urls'])}")
        return

    urls = set(state["urls"])
    offset = state["urls_offset"]
    chunks_done = 0
    while chunks_done < EXISTING_CHUNKS_PER_CALL:
        r = c.get(f"{SUPABASE_URL}/rest/v1/jobs",
                  params={"select": "source_url",
                          "limit": EXISTING_CHUNK_SIZE,
                          "offset": offset},
                  headers=headers_sb, timeout=30)
        if r.status_code != 200:
            print(f"[fetch-existing] error HTTP {r.status_code}"); break
        rows = r.json()
        if not rows:
            state["urls_done"] = True
            break
        for row in rows:
            if row.get("source_url"):
                urls.add(row["source_url"])
        offset += EXISTING_CHUNK_SIZE
        chunks_done += 1
        if len(rows) < EXISTING_CHUNK_SIZE:
            state["urls_done"] = True
            break

    state["urls"] = list(urls)
    state["urls_offset"] = offset
    save_state(state)
    done_flag = "✓ done" if state["urls_done"] else "→ continuar"
    print(f"[fetch-existing] urls={len(urls)}  offset={offset}  {done_flag}")

def _record_result(source, jobs, nuevos, res):
    results = {}
    if os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE) as f:
            results = json.load(f)
    prev = results.get(source, {"scraped": 0, "nuevos": 0, "inserted": 0, "errors": 0})
    results[source] = {
        "scraped":  prev["scraped"]  + len(jobs),
        "nuevos":   prev["nuevos"]   + len(nuevos),
        "inserted": prev["inserted"] + res["inserted"],
        "errors":   prev["errors"]   + res["errors"],
    }
    with open(RESULTS_FILE, "w") as f:
        json.dump(results, f)

def cmd_gob_cat(c, cat):
    if cat not in GOB_CATEGORIES:
        print(f"[error] cat desconocida: {cat} (válidas: {GOB_CATEGORIES})"); sys.exit(1)
    state = load_state()
    if state is None or not state.get("urls_done"):
        print("[error] urls aún no terminadas — corré 'fetch-existing' hasta done"); sys.exit(1)
    restore_globals_from_state(state)
    existing = set(state["urls"])

    jobs = scrape_gob(c, only_category=cat)
    nuevos = [j for j in jobs if j.get("source_url") not in existing]
    res = upsert(c, jobs, existing)

    persist_globals_to_state(state)
    save_state(state)
    _record_result("gob", jobs, nuevos, res)
    print(f"[gob-cat:{cat}] scraped={len(jobs)}  nuevos={len(nuevos)}  inserted={res['inserted']}  errors={res['errors']}")

def cmd_source(c, source):
    if source not in SCRAPERS:
        print(f"[error] fuente desconocida: {source}"); sys.exit(1)
    state = load_state()
    if state is None or not state.get("urls_done"):
        print("[error] urls aún no terminadas — corré 'fetch-existing' hasta done"); sys.exit(1)
    restore_globals_from_state(state)
    existing = set(state["urls"])

    jobs = SCRAPERS[source](c)
    nuevos = [j for j in jobs if j.get("source_url") not in existing]
    res = upsert(c, jobs, existing)

    _record_result(source, jobs, nuevos, res)
    print(f"[{source}] scraped={len(jobs)}  nuevos={len(nuevos)}  inserted={res['inserted']}  errors={res['errors']}")

def cmd_summary():
    if not os.path.exists(RESULTS_FILE):
        print("[error] no hay resultados — corré las fuentes primero"); sys.exit(1)
    with open(RESULTS_FILE) as f:
        results = json.load(f)
    total_scraped = sum(r["scraped"]  for r in results.values())
    total_nuevos  = sum(r["nuevos"]   for r in results.values())
    total_ins     = sum(r["inserted"] for r in results.values())
    total_err     = sum(r["errors"]   for r in results.values())
    print(f"\nBondy Job Scraper v6 — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"Total scraped={total_scraped}  nuevos={total_nuevos}  inserted={total_ins}  errors={total_err}\n")
    print(f"{'Fuente':<12} {'Scraped':>8} {'Nuevos':>8} {'Insert':>8} {'Errors':>7}")
    for src in ["gob", "yc", "remotive", "himalayas", "wwr", "greenhouse", "lever"]:
        r = results.get(src, {})
        print(f"{src:<12} {r.get('scraped', 0):>8} {r.get('nuevos', 0):>8} {r.get('inserted', 0):>8} {r.get('errors', 0):>7}")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "summary"
    if mode == "summary":
        cmd_summary()
    else:
        with httpx.Client(follow_redirects=True) as c:
            if mode == "init":
                cmd_init(c)
            elif mode == "fetch-existing":
                cmd_fetch_existing(c)
            elif mode == "gob-cat":
                if len(sys.argv) < 3:
                    print("[error] uso: gob-cat <categoria>"); sys.exit(1)
                cmd_gob_cat(c, sys.argv[2])
            else:
                cmd_source(c, mode)
```

## Notas

- Este scraper corre L-V a las 7:00 AM Argentina (antes del morning prospecting de 8:30 AM)
- Si hay errores de conexion, reportar pero no fallar silenciosamente
- Los jobs nuevos quedan con status `pending` para que el morning prospecting los procese

### Cambios v6 (2026-05-08) — HR/recruiting + detección de idioma
1. **HR/recruiting expandido en 4 fuentes**: GetOnBoard agrega `"hr"` a `GOB_CATEGORIES`; Remotive agrega `"human-resources"` a `REMOTIVE_CATEGORIES` con mapeo `"human-resources" → "hr"` en `cat_map`; Himalayas agrega 4 queries (`recruiter`, `talent acquisition`, `people operations`, `human resources`) y reglas de clasificación a `category="hr"`; Greenhouse y Lever clasifican como `category="hr"` cuando el title o department/team menciona recruit/sourcer/talent acquisition/people ops/human resources/talent management/talent development. WWR no se tocó: no tiene una categoría HR limpia en su RSS y meterlo via "Management & Finance" o "Customer Support" introduce mucho ruido.
2. **WWR sin cambio explícito por design**: si la fuente expone una categoría HR identificable en el futuro, agregar slug correspondiente a `WWR_CAT_MAP`.
3. **Detección de idioma**: nueva función `_detect_language(title)` (heurística title-only por stopwords ES/EN + acentos castellanos, sin deps externas) inyectada al inicio de `upsert(c, jobs, existing)`. Cubre las 7 fuentes con un solo punto de cambio. Salidas: `'es' | 'en' | 'mixed' | 'unclear'`. Idempotente — respeta valores pre-seteados.
4. **Sin backfill**: la columna `language_required` se agregó en migración 2026-05-08 con default null. Solo los jobs scrapeados a partir de esta versión van a tener idioma detectado. Si más adelante queremos backfill, hay que correr el detector en standalone sobre los jobs existentes.

### Cambios v5 (2026-05-06) — granularidad fina para runtime con timeout corto
1. **`init` ahora es liviano**: solo carga GOB seniorities (~5s). Antes incluía la paginación completa de URLs (40+ s) y eso no cabía en el timeout del runtime.
2. **`fetch-existing` chunked**: pagina URLs en bloques de 3 chunks × 1000 por call (~6-9s). Idempotente: cada call avanza desde el `urls_offset` persistido. Repetible hasta `urls_done=true`. Con 3854 URLs alcanza con 2 calls, queda margen para crecer.
3. **`gob-cat <categoría>`**: GOB se ejecuta por categoría individual (4 calls), no completo en uno. Antes una sola call de GOB con 4 categorías + resolve_gob_company se colgaba contra el timeout.
4. **`GOB_COMPANY_CACHE` persistente**: el cache id→name de empresas se guarda en `state.json` y se restaura entre calls. `resolve_gob_company` se mantiene activo (las empresas con `attributes` inline siguen sin lookup; las que requieren lookup quedan cacheadas para próximas corridas).
5. **Nunca desactivar `resolve_gob_company`**: nota explícita en el SKILL — los nombres de empresa son críticos para morning-prospecting.
6. **Resultados acumulativos**: `_record_result` suma los GOB de las 4 categorías bajo la misma key `gob` para que el summary final sea idéntico al de v4.

### Cambios v4 (2026-05-06) — fix timeouts del sandbox
1. **Ejecución por fuente**: el script ahora acepta un modo (`init`, `<fuente>`, `summary`) y se invoca 9 veces (1 init + 7 fuentes + summary) en lugar de 1 sola corrida monolítica. Razón: en el sandbox los procesos en background no sobreviven entre bash calls y el script monolítico no completa dentro del timeout.
2. **State cacheado**: URLs existentes + GOB seniority map se persisten a `/tmp/scraper_state.json` durante `init`; cada fuente lo lee de ahí.
3. **Resultados acumulados**: cada fuente escribe a `/tmp/scraper_results.json`; `summary` los agrega en una tabla.
4. **Tolerancia a fallos**: si una fuente falla, las demás siguen corriendo. El reporte final muestra el `errors` por fuente.

### Cambios v3 (2026-04-29) — fixes aplicados por Dana
1. **GOB seniority**: ahora se carga el catálogo `/seniorities` al inicio. Antes el mapa hardcoded estaba mal (ID 4 era "Senior" en realidad, no "Mid-Senior"; ID 6 no existe).
2. **GOB tags**: se extraen desde el título via keyword scan. La API GOB no expone un mapping numérico→nombre sin auth (`/tags` usa slugs string como `"blogger"`, pero los jobs referencian IDs numéricos como `259` — son universos distintos y `/tags/259` da 404).
3. **Greenhouse content=true**: ahora extrae seniority (heurística por título) y tech_stack (keyword scan en descripción).
4. **Greenhouse categories**: incluye `design` y `product` además de los técnicos.
5. **WWR mapeo correcto**: `remote-product-jobs` → `product`, `remote-design-jobs` → `design` (antes ambos caían a "programming").
6. **Lever recuperado**: dLocal, Despegar, Rappi, Kavak, Nuvemshop, Auth0.
7. **YC fallback**: si `/companies/hiring.json` falla, prueba `/hiring.json`.
8. **Helpers compartidos**: `_extract_seniority` y `_extract_techs` se usan en GOB, Greenhouse y Lever.

### Notas de fuentes
- **GetOnBoard**: API JSON:API. Solo se hace pre-carga de `/seniorities` (1 request). Tags por keyword scan en título.
- **Himalayas**: limita a 200 resultados por query para respetar rate limit (429 si se excede)
- **Greenhouse**: lista de empresas curada — agregar más en `GREENHOUSE_COMPANIES`
- **Lever**: lista curada en `LEVER_COMPANIES`. Usa filtro LATAM en location/country.
- **WeWorkRemotely**: solo ~25 jobs por feed (diseño del RSS), pero es fresh diario
