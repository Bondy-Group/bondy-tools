-- ============================================================
-- BONDY TOOLS - Supabase Schema
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- Tabla principal: reportes de entrevistas
CREATE TABLE IF NOT EXISTS interview_reports (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at              TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Candidato
  candidate_name          TEXT,
  candidate_email         TEXT,
  candidate_airtable_id   TEXT,           -- para cruzar con Airtable cuando corresponda

  -- Reporte
  report_type             TEXT NOT NULL CHECK (report_type IN ('screening', 'cultural')),
  report_content          TEXT NOT NULL,  -- el reporte generado por la IA

  -- Contexto de la entrevista
  client_name             TEXT,
  job_description         TEXT,
  linkedin_url            TEXT,
  recruiter_name          TEXT,
  raw_transcript          TEXT,           -- transcripción original (opcional guardarla)

  -- Metadata
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Index para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_interview_reports_candidate_email ON interview_reports(candidate_email);
CREATE INDEX IF NOT EXISTS idx_interview_reports_client_name ON interview_reports(client_name);
CREATE INDEX IF NOT EXISTS idx_interview_reports_report_type ON interview_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_interview_reports_created_at ON interview_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interview_reports_airtable_id ON interview_reports(candidate_airtable_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_interview_reports_updated_at
  BEFORE UPDATE ON interview_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - desactivado por defecto para uso interno
-- Si en el futuro querés acceso por recruiter, activar y configurar políticas
ALTER TABLE interview_reports DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Vista útil para el historial (sin raw_transcript para performance)
-- ============================================================
CREATE OR REPLACE VIEW interview_reports_summary AS
SELECT
  id,
  created_at,
  candidate_name,
  candidate_email,
  candidate_airtable_id,
  report_type,
  client_name,
  linkedin_url,
  recruiter_name,
  LEFT(report_content, 300) AS report_preview,
  updated_at
FROM interview_reports
ORDER BY created_at DESC;

-- Add scorecard columns if not exist
ALTER TABLE interview_reports
  ADD COLUMN IF NOT EXISTS scorecard_id TEXT,
  ADD COLUMN IF NOT EXISTS scorecard_data TEXT;
