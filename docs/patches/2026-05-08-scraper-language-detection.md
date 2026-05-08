# Patch para skill `bondy-job-scraper` — detección de idioma

**Estado:** pendiente de aplicar a `/mnt/skills/user/bondy-job-scraper/SKILL.md`
**Contexto:** la columna `language_required` en `jobs` ya existe (migración aplicada
2026-05-08) y el filtro "Idioma" está live en `/busco-trabajo` y
`/recursos-recruiters/busco-trabajo`. Pero hasta que el scraper empiece a
poblarla, el filtro va a mostrar todo bajo "Sin detectar".

## Decisión de diseño

Detección **solo desde `title`**, no desde description. Razón: el `descriptionPlain`
hoy se procesa adentro de cada uno de los 7 fetchers y no se preserva en el dict
que llega a `upsert()`. Tocar los 7 fetchers para preservarlo multiplica el riesgo
de regresión por cada fuente. El title alcanza para una primera aproximación
útil; si más adelante queremos precisión mayor, el upgrade a "title + description"
es una mejora natural.

Una sola función nueva (`_detect_language`) + 4 líneas adicionales en `upsert()`
cubren las 7 fuentes con cero cambios en los fetchers.

## Heurística

Stopwords gramaticales puras + presencia de acentos castellanos. Excluimos
palabras "técnicas" (developer, engineer, senior, junior, lead, manager) porque
son anglicismos universales en avisos LATAM y sesgarían todo a inglés.

Salidas:
- `'es'` — títulos en español ("Desarrollador Backend Senior")
- `'en'` — títulos en inglés ("Senior Backend Developer")
- `'mixed'` — mezcla balanceada de stopwords ES+EN
- `'unclear'` — título sin grammar words ("Backend Sr · Remote")

## Bloque 1 — Función de detección (agregar arriba de `upsert`, ~línea 712)

```python
# ─────────────────────────────────────────────
# Language detection (title-based, no deps)
# ─────────────────────────────────────────────
_SPANISH_STOPWORDS = {
    "y", "de", "la", "el", "en", "los", "las", "para", "con", "del",
    "un", "una", "por", "que", "se", "su", "sus", "es", "como", "al",
    "buscamos", "trabajo", "experiencia", "tecnología", "tecnologia",
    "desarrollador", "desarrolladora", "ingeniero", "ingeniera",
    "líder", "lider", "responsable", "encargado", "encargada",
    "analista", "consultor", "consultora", "técnico", "tecnico",
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
```

> **Nota:** `re` ya está importado al tope del script (lo usan otros helpers).
> Si por alguna razón no estuviera, agregar `import re` al header.

## Bloque 2 — Inyección en `upsert` (modificar la función existente, ~línea 715)

**Antes:**

```python
def upsert(c, jobs, existing):
    new = [j for j in jobs if j.get("source_url") and j["source_url"] not in existing]
    skipped = len(jobs) - len(new)
```

**Después:**

```python
def upsert(c, jobs, existing):
    # Detect required language from title for every job before insertion.
    # Idempotent: respects pre-set values (in case a future source provides
    # the field directly).
    for j in jobs:
        if not j.get("language_required"):
            j["language_required"] = _detect_language(j.get("title", ""))
    new = [j for j in jobs if j.get("source_url") and j["source_url"] not in existing]
    skipped = len(jobs) - len(new)
```

## Verificación post-patch

Después de aplicar y correr el scraper una vez:

```sql
SELECT language_required, COUNT(*)
FROM jobs
WHERE collected_at > NOW() - INTERVAL '24 hours'
GROUP BY language_required
ORDER BY 2 DESC;
```

Lo esperado en una corrida normal: distribución dominada por `'en'` (la mayoría
de las fuentes — Greenhouse, Lever, YC, Remotive — son USA-centric), con `'es'`
chico pero presente (GetOnBoard mayormente), `'mixed'` marginal, y `'unclear'`
con los títulos cortos tipo "Senior Backend Engineer".

## Si la precisión es mala (rollback / ajustes)

Si los avisos en español terminan clasificados como `'en'` por culpa de títulos
estilo "Backend Developer Sr · Remoto", la función está aislada y se puede
ajustar agregando palabras al `_SPANISH_STOPWORDS` o cambiando los umbrales.
La columna `language_required` puede limpiarse con:

```sql
UPDATE jobs SET language_required = NULL WHERE collected_at > '2026-05-08';
```

(Esto fuerza que la próxima corrida reclasifique solo los que importan, sin
tocar los legacy null.)
