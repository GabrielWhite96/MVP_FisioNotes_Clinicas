-- Recovery Journey: treatment plans, goals, check-ins, adherence

CREATE TYPE treatment_plan_status AS ENUM ('active', 'completed', 'paused');
CREATE TYPE goal_metric_type AS ENUM ('distance', 'reps', 'pain_scale', 'custom');
CREATE TYPE exercise_difficulty_rating AS ENUM ('easy', 'moderate', 'hard');

ALTER TABLE exercise_completions
  ADD COLUMN IF NOT EXISTS difficulty_rating exercise_difficulty_rating;

CREATE TABLE treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  physiotherapist_id UUID NOT NULL REFERENCES physiotherapists(id) ON DELETE CASCADE,
  condition TEXT,
  primary_goal TEXT NOT NULL,
  duration_weeks INTEGER NOT NULL DEFAULT 8,
  frequency TEXT NOT NULL DEFAULT '2 sessions/week',
  status treatment_plan_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE treatment_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_plan_id UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  metric_type goal_metric_type NOT NULL DEFAULT 'custom',
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  pain_level SMALLINT CHECK (pain_level BETWEEN 0 AND 10),
  mobility_level SMALLINT CHECK (mobility_level BETWEEN 0 AND 10),
  confidence_level SMALLINT CHECK (confidence_level BETWEEN 0 AND 10),
  exercise_difficulty SMALLINT CHECK (exercise_difficulty BETWEEN 0 AND 10),
  general_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_treatment_plans_patient ON treatment_plans (patient_id, status);
CREATE INDEX idx_treatment_goals_plan ON treatment_goals (treatment_plan_id);
CREATE INDEX idx_check_ins_patient ON check_ins (patient_id, created_at DESC);

CREATE TRIGGER set_updated_at_treatment_plans
  BEFORE UPDATE ON treatment_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_treatment_goals
  BEFORE UPDATE ON treatment_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Patient timeline view
CREATE OR REPLACE VIEW patient_timeline WITH (security_invoker = true) AS
SELECT cr.patient_id, cr.created_at AS event_at, 'clinical_record'::text AS event_type,
  COALESCE(cr.evolution, cr.assessment, 'Registro clínico') AS title,
  cr.id AS entity_id
FROM clinical_records cr
UNION ALL
SELECT a.patient_id, a.scheduled_at, 'appointment'::text,
  CASE a.modality WHEN 'telehealth' THEN 'Teleconsulta' ELSE 'Atendimento domiciliar' END,
  a.id
FROM appointments a WHERE a.status != 'cancelled'
UNION ALL
SELECT pe.patient_id, ec.completed_at, 'exercise_completion'::text,
  el.title, ec.id
FROM exercise_completions ec
JOIN patient_exercises pe ON pe.id = ec.patient_exercise_id
JOIN exercise_library el ON el.id = pe.exercise_id
UNION ALL
SELECT ci.patient_id, ci.created_at, 'check_in'::text,
  'Check-in: dor ' || ci.pain_level || '/10', ci.id
FROM check_ins ci;

-- Adherence score function
CREATE OR REPLACE FUNCTION public.calculate_adherence_score(p_patient_id UUID, p_days INTEGER DEFAULT 7)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_ex AS (
    SELECT pe.id FROM patient_exercises pe
    WHERE pe.patient_id = p_patient_id AND pe.active = true
  ),
  expected AS (
    SELECT COUNT(*) * p_days AS cnt FROM active_ex
  ),
  completed AS (
    SELECT COUNT(DISTINCT ec.patient_exercise_id) AS cnt
    FROM exercise_completions ec
    JOIN patient_exercises pe ON pe.id = ec.patient_exercise_id
    WHERE pe.patient_id = p_patient_id
      AND ec.completed_at >= now() - (p_days || ' days')::interval
  )
  SELECT CASE
    WHEN (SELECT cnt FROM expected) = 0 THEN 0
    ELSE LEAST(100, ROUND((SELECT cnt FROM completed)::numeric / (SELECT cnt FROM expected)::numeric * 100))::integer
  END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_adherence_score TO authenticated;
