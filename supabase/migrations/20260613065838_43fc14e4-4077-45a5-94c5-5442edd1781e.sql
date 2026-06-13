
-- ============================================================
-- Scholaris schema
-- Concept-centric: subjects -> topics -> concepts, plus per-user
-- knowledge graph and full activity logs.
-- ============================================================

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  board text,
  program text,
  semester text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles self select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles self insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles self update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles self delete" on public.profiles for delete to authenticated using (id = auth.uid());
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- Auto-create a profile row on sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- subjects ----------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  code text,
  color text not null default '#6366f1',
  exam_weight numeric not null default 0.5,
  strategic_value integer not null default 50,
  next_assessment date,
  hours_this_week numeric not null default 0,
  baseline_mastery integer not null default 50,
  rank integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.subjects to authenticated;
grant all on public.subjects to service_role;
alter table public.subjects enable row level security;
create policy "subjects self all" on public.subjects for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index subjects_user_id_idx on public.subjects(user_id);
create trigger subjects_updated_at before update on public.subjects
  for each row execute function public.update_updated_at_column();

-- ---------- topics ----------
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  ordinal integer not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.topics to authenticated;
grant all on public.topics to service_role;
alter table public.topics enable row level security;
create policy "topics self all" on public.topics for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index topics_subject_idx on public.topics(subject_id);

-- ---------- concepts ----------
create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  name text not null,
  importance integer not null default 5,
  decay_rate numeric not null default 0.05,
  mastery integer not null default 40,
  memory_strength integer not null default 50,
  days_since_review integer not null default 0,
  review_count integer not null default 0,
  successful_recalls integer not null default 0,
  failed_recalls integer not null default 0,
  assessment_attempts integer not null default 0,
  assessment_correct integer not null default 0,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.concepts to authenticated;
grant all on public.concepts to service_role;
alter table public.concepts enable row level security;
create policy "concepts self all" on public.concepts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index concepts_subject_idx on public.concepts(subject_id);
create index concepts_user_idx on public.concepts(user_id);
create trigger concepts_updated_at before update on public.concepts
  for each row execute function public.update_updated_at_column();

-- ---------- concept_prerequisites (knowledge graph) ----------
create table public.concept_prerequisites (
  concept_id uuid not null references public.concepts(id) on delete cascade,
  prerequisite_id uuid not null references public.concepts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (concept_id, prerequisite_id)
);
grant select, insert, update, delete on public.concept_prerequisites to authenticated;
grant all on public.concept_prerequisites to service_role;
alter table public.concept_prerequisites enable row level security;
create policy "prereqs self all" on public.concept_prerequisites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- sessions ----------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  concept_id uuid references public.concepts(id) on delete set null,
  duration_min integer not null default 0,
  kind text not null default 'study',
  outcome text,
  started_at timestamptz not null default now()
);
grant select, insert, update, delete on public.sessions to authenticated;
grant all on public.sessions to service_role;
alter table public.sessions enable row level security;
create policy "sessions self all" on public.sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index sessions_user_started_idx on public.sessions(user_id, started_at desc);

-- ---------- assessments ----------
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  kind text not null default 'quiz',
  score numeric,
  taken_at timestamptz not null default now(),
  notes text
);
grant select, insert, update, delete on public.assessments to authenticated;
grant all on public.assessments to service_role;
alter table public.assessments enable row level security;
create policy "assessments self all" on public.assessments for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index assessments_user_idx on public.assessments(user_id, taken_at desc);

-- ---------- assessment_questions ----------
create table public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid references public.concepts(id) on delete set null,
  correct boolean not null,
  difficulty numeric not null default 0.5
);
grant select, insert, update, delete on public.assessment_questions to authenticated;
grant all on public.assessment_questions to service_role;
alter table public.assessment_questions enable row level security;
create policy "aq self all" on public.assessment_questions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index aq_assessment_idx on public.assessment_questions(assessment_id);

-- ---------- missions ----------
create table public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  concept_id uuid references public.concepts(id) on delete set null,
  type text not null,
  priority text not null default 'medium',
  title text not null,
  reason text,
  roi_score integer not null default 0,
  estimated_minutes integer not null default 20,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.missions to authenticated;
grant all on public.missions to service_role;
alter table public.missions enable row level security;
create policy "missions self all" on public.missions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index missions_user_idx on public.missions(user_id, created_at desc);

-- ---------- recommendations ----------
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid references public.concepts(id) on delete set null,
  kind text not null,
  title text not null,
  body text,
  confidence integer not null default 70,
  impact integer not null default 50,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.recommendations to authenticated;
grant all on public.recommendations to service_role;
alter table public.recommendations enable row level security;
create policy "recs self all" on public.recommendations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index recs_user_idx on public.recommendations(user_id, created_at desc);

-- ---------- diagnostics ----------
create table public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid references public.concepts(id) on delete set null,
  kind text not null,
  severity text not null default 'warning',
  title text not null,
  body text,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz
);
grant select, insert, update, delete on public.diagnostics to authenticated;
grant all on public.diagnostics to service_role;
alter table public.diagnostics enable row level security;
create policy "diag self all" on public.diagnostics for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index diag_user_idx on public.diagnostics(user_id, detected_at desc);
