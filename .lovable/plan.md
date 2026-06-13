
# Scholaris — Persistence & Auth Transition

Lovable Cloud is enabled. This plan keeps the existing intelligence engine intact and treats the database as the source of *raw* concept-level state. All derivations (memory, risk, ROI, missions, recommendations, diagnostics, coach context) continue to run in `src/lib/intelligence.ts`.

## Phase 1 — Auth

- New `/auth` route: tabs for Sign In / Sign Up (email + password) plus Google sign-in via the managed Lovable broker.
- Move every existing app route under a new `src/routes/_authenticated/` layout.
  - Pathless layout: `_authenticated/route.tsx` (managed-style: `ssr: false`, `supabase.auth.getUser()` redirect to `/auth`).
  - Files moved: `index.tsx`, `battlefield.tsx`, `concepts.tsx`, `concepts.$id.tsx`, `subjects.$id.tsx`, `missions.tsx`, `memory.tsx`, `roi.tsx`, `risk.tsx`, `recommendations.tsx`, `diagnostics.tsx`, `coach.tsx`, `sessions.tsx`.
- New `/onboarding` route, also under `_authenticated`, gates the main app until the user has a workspace.
- Top-bar: add account menu with Sign Out.
- Root: single `onAuthStateChange` listener that invalidates the router + query cache on identity transitions.

## Phase 2 — Database Schema

Single migration. Every table has explicit GRANTs and RLS scoped to `auth.uid()`.

```text
profiles              (id pk -> auth.users, display_name, board, program, semester, onboarded_at)
subjects              (id, user_id, name, code, color, exam_weight, strategic_value,
                       next_assessment, hours_this_week, baseline_mastery, rank, created_at)
topics                (id, user_id, subject_id, name, ordinal)
concepts              (id, user_id, subject_id, topic_id, name, importance, decay_rate,
                       mastery, memory_strength, days_since_review, review_count,
                       successful_recalls, failed_recalls,
                       assessment_attempts, assessment_correct, last_reviewed_at)
concept_prerequisites (concept_id, prerequisite_id, user_id) -- knowledge graph per-user
sessions              (id, user_id, subject_id, concept_id, duration_min, kind, started_at)
assessments           (id, user_id, subject_id, kind, score, taken_at, notes)
assessment_questions  (id, assessment_id, user_id, concept_id, correct, difficulty)
missions              (id, user_id, subject_id, concept_id, type, priority, title, reason,
                       roi_score, estimated_minutes, completed, completed_at, created_at)
recommendations       (id, user_id, concept_id, kind, title, body, confidence, impact, dismissed)
diagnostics           (id, user_id, concept_id, kind, severity, title, body, detected_at, resolved_at)
```

RLS: `using (auth.uid() = user_id)` everywhere. `profiles` uses `id = auth.uid()`.

## Phase 3 — Data Persistence

- `src/lib/persistence.ts` — typed loaders + savers backed by `supabase` client (RLS = current user).
- Refactor `src/lib/intelligence.ts`:
  - Store no longer seeds from `mock-data` automatically.
  - New `hydrateFromCloud()` action: pulls subjects, concepts (incl. prereqs), session/assessment/mission logs into the existing in-memory shape.
  - Existing mutations (`runSession`, `runMission`, `recordQuestionAssessment`, `advanceDay`, …) keep updating the store and additionally write a row to the matching table (fire-and-forget with toast on error).
- New `useHydrate()` hook in `_authenticated/route.tsx` that calls `hydrateFromCloud()` once per session.
- Derivations untouched.

## Phase 4 — Intelligence Synchronization

- DB stores raw concept state + logs only.
- Memory / risk / ROI / missions / recommendations / diagnostics / coach context remain pure derivations over the hydrated store — no SQL functions, no triggers doing intelligence work.
- Missions/recommendations/diagnostics tables persist *generated* items so completion / dismissal / resolution survive refresh; the engine reconciles persisted state with freshly derived candidates on hydrate.

## Phase 5 — Onboarding

New `/onboarding` flow (4 steps in one route, framer-motion transitions, matches current dark aesthetic):

1. **Board / Curriculum** — choice (CBSE, ICSE, IB, A-Levels, University, Other).
2. **Program** — text (e.g. "B.Tech Computer Science", "MBBS Year 2").
3. **Semester / Term** — number + label.
4. **Subjects** — multi-select from a curated catalogue based on board+program, plus "add custom". For each selected subject we seed a small starter set of topics + concepts (mirroring the existing seed shape so the intelligence engine has signal from day one).

On completion: insert `profiles` row, subjects/topics/concepts, then redirect to `/`. `_authenticated/route.tsx` redirects to `/onboarding` whenever `profiles.onboarded_at is null`.

## Out of scope (this turn)

- Realtime sync between tabs.
- Server-side intelligence recomputation.
- Editing the knowledge-graph (prereqs) in the UI — seeded only.
- Multi-user collaboration.

## Notes

- No new pages beyond `/auth` and `/onboarding` (both required by the task).
- No redesign — onboarding and auth reuse existing widgets (`Panel`, `StatCard`, sidebar typography).
- Intelligence calculations stay centralized in `src/lib/intelligence.ts`.
