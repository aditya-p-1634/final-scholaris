-- Add academic weighting columns so the weighting model (credits + grading scheme)
-- persists per subject and survives refreshes. persistence.ts already reads these
-- with safe fallbacks; this makes them real, persisted values.
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS credits numeric NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS midterm_weight numeric NOT NULL DEFAULT 0.2,
  ADD COLUMN IF NOT EXISTS final_weight numeric NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS assignment_weight numeric NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS lab_weight numeric NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS project_weight numeric NOT NULL DEFAULT 0.15;