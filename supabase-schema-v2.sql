-- ============================================================
-- BONDY ATS - Schema V2
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- ============================================================
-- 1. CLIENTS (clientes de Bondy)
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  name          TEXT NOT NULL UNIQUE,       -- "IOL", "Unicity", "Clera"
  display_name  TEXT,                       -- "IOL (Invertir Online)"
  industry      TEXT,
  website       TEXT,
  notes         TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_by    TEXT                        -- email del usuario que lo creó
);

-- ============================================================
-- 2. CLIENT_SCORECARDS (scorecard técnico por cliente)
-- ============================================================
CREATE TABLE IF NOT EXISTS client_scorecards (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_name     TEXT NOT NULL,            -- desnormalizado para queries fáciles
  scorecard_type  TEXT NOT NULL DEFAULT 'technical' CHECK (scorecard_type IN ('technical', 'cultural', 'default')),
  name            TEXT NOT NULL,            -- "Scorecard Técnico IOL Backend"
  description     TEXT,
  skills          JSONB NOT NULL,           -- array de skills con estructura libre
  is_active       BOOLEAN DEFAULT TRUE,
  version         INTEGER DEFAULT 1,
  created_by      TEXT,
  updated_by      TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_client_scorecards_client_id ON client_scorecards(client_id);
CREATE INDEX IF NOT EXISTS idx_client_scorecards_type ON client_scorecards(scorecard_type);
CREATE INDEX IF NOT EXISTS idx_client_scorecards_active ON client_scorecards(is_active);

-- ============================================================
-- 3. CANDIDATES (perfil del candidato - ATS base)
-- ============================================================
CREATE TABLE IF NOT EXISTS candidates (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  -- Identidad
  full_name       TEXT,
  email           TEXT UNIQUE,
  linkedin_url    TEXT,
  location        TEXT,
  
  -- Perfil técnico (extraído de entrevistas)
  tech_stack      JSONB,        -- ["Python", "FastAPI", "PostgreSQL", ...]
  years_exp       INTEGER,
  seniority       TEXT,         -- "Junior", "Semi-Senior", "Senior", "Lead"
  
  -- Compensación
  salary_min      INTEGER,
  salary_max      INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  
  -- Estado
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'placed', 'inactive', 'blacklisted')),
  
  -- Meta
  airtable_id     TEXT,         -- para cruzar con Airtable legacy
  notes           TEXT,
  created_by      TEXT
);

CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_linkedin ON candidates(linkedin_url);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);

-- ============================================================
-- 4. INTERVIEW_REPORTS (extendida con skills estructurados)
-- ============================================================
-- Agregar columnas nuevas a la tabla existente
ALTER TABLE interview_reports
  ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidates(id),
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id),
  ADD COLUMN IF NOT EXISTS scorecard_client_id UUID REFERENCES client_scorecards(id),
  ADD COLUMN IF NOT EXISTS cultural_scorecard_id UUID REFERENCES client_scorecards(id),
  ADD COLUMN IF NOT EXISTS technical_skills_json JSONB,   -- skills técnicos evaluados estructurado
  ADD COLUMN IF NOT EXISTS cultural_skills_json JSONB,    -- skills culturales evaluados estructurado
  ADD COLUMN IF NOT EXISTS overall_score_technical INTEGER, -- 0-100 ponderado
  ADD COLUMN IF NOT EXISTS overall_score_cultural INTEGER,  -- 0-100 ponderado
  ADD COLUMN IF NOT EXISTS recruiter_email TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es';

CREATE INDEX IF NOT EXISTS idx_interview_reports_candidate_id ON interview_reports(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_reports_client_id ON interview_reports(client_id);

-- ============================================================
-- 5. SEED: Scorecard Default Bondy
-- ============================================================
-- Primero creamos el cliente "Default" interno
INSERT INTO clients (name, display_name, notes, is_active)
VALUES ('DEFAULT_BONDY', 'Bondy — Pipeline General', 'Candidatos sin cliente asignado', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Scorecard técnico default
INSERT INTO client_scorecards (client_name, scorecard_type, name, description, skills, is_active)
VALUES (
  'DEFAULT_BONDY',
  'default',
  'Scorecard Técnico Default',
  'Para candidatos sin cliente asignado. Evaluación técnica general.',
  '[
    {"id": "technical_skills", "name": "Habilidades Técnicas", "type": "technical", "weight": 30, "description": "Dominio del stack principal del candidato", "questions": ["¿Cuál es tu stack principal?", "¿En qué tipo de proyectos lo aplicaste?"]},
    {"id": "problem_solving", "name": "Problem Solving", "type": "technical", "weight": 25, "description": "Capacidad analítica y resolución de problemas", "questions": ["Contame un problema técnico complejo que hayas resuelto.", "¿Cómo priorizás cuando tenés múltiples problemas?"]},
    {"id": "architecture", "name": "Arquitectura & Diseño", "type": "technical", "weight": 20, "description": "Criterio de diseño de sistemas y arquitectura", "questions": ["¿Cómo tomás decisiones de arquitectura?", "¿Podés describir un sistema que hayas diseñado?"]},
    {"id": "communication", "name": "Comunicación Técnica", "type": "soft", "weight": 15, "description": "Claridad y estructura al comunicar conceptos técnicos", "questions": ["¿Cómo explicarías X concepto a alguien no técnico?"]},
    {"id": "ownership", "name": "Ownership & Proactividad", "type": "soft", "weight": 10, "description": "Iniciativa, sentido de pertenencia y motivación", "questions": ["¿Podés darme un ejemplo de iniciativa más allá de tu rol?"]}
  ]'::jsonb,
  TRUE
)
ON CONFLICT DO NOTHING;

-- Scorecard cultural default
INSERT INTO client_scorecards (client_name, scorecard_type, name, description, skills, is_active)
VALUES (
  'DEFAULT_BONDY',
  'cultural',
  'Cultural Fit Default',
  'Evaluación cultural general para cualquier empresa.',
  '[
    {"id": "autonomia", "name": "Autonomía / Ownership", "type": "soft", "weight": 20, "description": "Capacidad de trabajar de forma independiente con ownership sobre el trabajo"},
    {"id": "teamwork", "name": "Trabajo en equipo", "type": "soft", "weight": 15, "description": "Colaboración, comunicación y aporte al equipo"},
    {"id": "comunicacion", "name": "Comunicación", "type": "soft", "weight": 15, "description": "Claridad, escucha activa, comunicación efectiva"},
    {"id": "ambiguedad", "name": "Tolerancia a la ambigüedad", "type": "soft", "weight": 15, "description": "Capacidad de operar y decidir con información incompleta"},
    {"id": "feedback", "name": "Cultura de Feedback", "type": "soft", "weight": 15, "description": "Apertura para dar y recibir feedback constructivo"},
    {"id": "adaptabilidad", "name": "Adaptabilidad", "type": "soft", "weight": 10, "description": "Flexibilidad ante cambios de prioridad o contexto"},
    {"id": "motivacion", "name": "Motivación / Fit con el rol", "type": "soft", "weight": 10, "description": "Claridad sobre lo que busca y alineación con el rol"}
  ]'::jsonb,
  TRUE
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. TRIGGERS updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clients_updated_at') THEN
    CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_client_scorecards_updated_at') THEN
    CREATE TRIGGER update_client_scorecards_updated_at BEFORE UPDATE ON client_scorecards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_candidates_updated_at') THEN
    CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Desactivar RLS para uso interno
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_scorecards DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidates DISABLE ROW LEVEL SECURITY;
