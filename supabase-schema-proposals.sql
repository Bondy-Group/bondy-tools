-- ============================================================
-- BONDY PROPOSALS — Service Agreement tool
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS proposals (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  created_by            TEXT,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','signed','archived')),

  -- Identificador legible (BDY-2026-0001)
  agreement_id          TEXT UNIQUE,

  -- Form data
  language              TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','es')),
  variant               TEXT NOT NULL DEFAULT 'c' CHECK (variant IN ('a','b','c')),
  fee_pct               NUMERIC NOT NULL DEFAULT 14,
  salary_currency       TEXT NOT NULL DEFAULT 'ARS' CHECK (salary_currency IN ('ARS','USD')),
  date_long             TEXT,                       -- string libre, lo formatea el operador
  proposal_date         DATE,                       -- canónico para queries
  year                  TEXT,
  show_timeline         BOOLEAN DEFAULT TRUE,

  -- Cliente
  client_name           TEXT NOT NULL,
  client_legal_name     TEXT,
  client_short_name     TEXT,
  client_contact        TEXT,
  client_contact_role   TEXT,
  client_location       TEXT,
  client_work_mode      TEXT,

  -- Roles (JSONB array)
  roles                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- DNA opcional override (default: usa el DNA estándar de Bondy)
  dna                   JSONB,

  -- Approach / notas internas
  approach_notes        TEXT,
  internal_notes        TEXT,

  -- Tracking
  sent_at               TIMESTAMPTZ,
  signed_at             TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_proposals_status        ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_by    ON proposals(created_by);
CREATE INDEX IF NOT EXISTS idx_proposals_client_name   ON proposals(client_name);
CREATE INDEX IF NOT EXISTS idx_proposals_agreement_id  ON proposals(agreement_id);

-- Trigger: updated_at automático
CREATE OR REPLACE FUNCTION update_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proposals_updated_at_trigger ON proposals;
CREATE TRIGGER proposals_updated_at_trigger
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_proposals_updated_at();

-- Función: generar próximo agreement_id (BDY-YYYY-NNNN)
CREATE OR REPLACE FUNCTION next_agreement_id(p_year TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_next INT;
  v_id   TEXT;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::TEXT);
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(agreement_id FROM 'BDY-' || v_year || '-(\d+)') AS INT)
  ), 0) + 1
  INTO v_next
  FROM proposals
  WHERE agreement_id LIKE 'BDY-' || v_year || '-%';

  v_id := 'BDY-' || v_year || '-' || LPAD(v_next::TEXT, 4, '0');
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- RLS: deshabilitado (acceso vía service role + middleware NextAuth)
ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;
