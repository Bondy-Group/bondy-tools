# Patches a aplicar a skills (read-only desde el deploy env)

Esta carpeta tiene archivos completos listos para reemplazar SKILL.md de
skills de Bondy. La razón es que `/mnt/skills/user/...` es read-only desde
el entorno donde ejecuta Mateo Dev, así que cualquier modificación a una
skill queda acá como artifact y Mara (o un Claude futuro con write access)
las pega en su lugar.

## Cómo aplicar

1. Abrí el archivo de patch.
2. Reemplazá todo el contenido de `/mnt/skills/user/<skill-name>/SKILL.md`
   con el contenido del patch.
3. Verificá la versión en el changelog para confirmar que se aplicó.

## Patches actuales

### `2026-05-08-scraper-skill-v6.md`
**Skill afectada:** `bondy-job-scraper`
**Versión:** v6
**Cambios respecto a v5:**
- Expansión HR/recruiting en 4 fuentes (GetOnBoard, Remotive, Himalayas, Greenhouse, Lever)
- Detección de idioma title-based en `upsert()` → popula `jobs.language_required`
- Sin cambios en YC ni WWR (ver changelog del archivo para razones)

**Pre-requisitos ya aplicados en producción:**
- ✅ Migración SQL: `ALTER TABLE jobs ADD COLUMN language_required TEXT` (2026-05-08)
- ✅ UI: filtro "Idioma" en `/busco-trabajo` y `/recursos-recruiters/busco-trabajo`
- ✅ UI: filtro de área "Recruiting" en `/busco-trabajo` (los roles HR van a aparecer ahí también)

**Después de aplicar y correr el scraper una vez, verificar:**

```sql
-- Distribución de idiomas en la última corrida
SELECT language_required, COUNT(*)
FROM jobs
WHERE collected_at > NOW() - INTERVAL '24 hours'
GROUP BY language_required
ORDER BY 2 DESC;

-- Cantidad de roles HR scrapeados en la última corrida
SELECT source, COUNT(*) AS hr_jobs
FROM jobs
WHERE category = 'hr'
  AND collected_at > NOW() - INTERVAL '24 hours'
GROUP BY source
ORDER BY 2 DESC;
```
