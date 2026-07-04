# Scholaris — Academic Intelligence OS

Scholaris is an academic operating system for serious learners. It unifies memory,
ROI and risk intelligence into a single command surface built for daily use.

**Version:** 1.0.0 · **Channel:** Release Candidate

---

## Architecture Overview

Scholaris is a single-page **TanStack Start** application (React 19, Vite 7,
TypeScript strict). All application state flows through a small set of pure
intelligence engines composed on top of a persisted workspace.

```
┌────────────────────────────────────────────────────────────────┐
│                     UI  (routes/, components/)                 │
│   Commander Mode · Daily OS · Session Mode · Academic Map ...  │
└──────────────────────────┬─────────────────────────────────────┘
                           │  useIntelligence()  /  useIntelligenceActions()
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                  Intelligence Store  (lib/intelligence.ts)     │
│     Subjects · Concepts · Prereqs · Sessions · Assessments     │
└──────────────────────────┬─────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────────────┐
        ▼                  ▼                          ▼
   Memory Engine     Risk Engine · ROI Engine    Mission / Recommendation
   Predictive        Discipline · Momentum       Recovery / Identity
                           │
                           ▼
                     Persistence  (lib/persistence.ts)
                     Lovable Cloud (Supabase)  +  local backups
```

### Data Flow

1. **Bootstrap** — `_authenticated/_app/route.tsx` loads the workspace from
   persistence (or `dev-mode` seed) and calls `hydrate()`.
2. **Intelligence engines** derive live metrics from the workspace on read.
3. **UI** consumes engines via `useIntelligence()` and mutates through
   `useIntelligenceActions()`, which writes back through persistence.
4. **Data Safety** (`lib/data-safety.ts`) snapshots the workspace to local
   backups and audits every mutation.

---

## Folder Structure

```
src/
├─ components/           # Presentational + composite UI (AppShell, Commander, Map…)
│  └─ ui/                # shadcn/radix primitives
├─ lib/
│  ├─ intelligence.ts    # Store: subjects, concepts, sessions, actions
│  ├─ academic-map.ts    # Layered DAG layout + tactical scoring
│  ├─ data-safety.ts     # Backups, exports, integrity, audit
│  ├─ persistence.ts     # Cloud read/write (Supabase)
│  ├─ dev-mode.ts        # Auth bypass + seed workspace for local dev
│  ├─ curriculum*.ts     # Import/parse curriculum
│  ├─ session-mode.ts    # Focus session engine
│  ├─ daily-os.ts        # Daily briefing engine
│  └─ predictive.ts      # Forecast / momentum
├─ routes/
│  ├─ __root.tsx         # Head, providers, error/not-found boundaries
│  ├─ auth.tsx           # Sign in / sign up
│  └─ _authenticated/
│     ├─ route.tsx       # Auth gate
│     └─ _app/           # AppShell layout + all modules
│        ├─ index.tsx    # Commander Mode (home)
│        ├─ today.tsx    # Daily OS
│        ├─ session.tsx  # Session Mode
│        ├─ map.tsx      # Academic Map
│        ├─ battlefield.tsx concepts.tsx missions.tsx
│        ├─ memory.tsx roi.tsx risk.tsx
│        ├─ recommendations.tsx diagnostics.tsx coach.tsx
│        ├─ sessions.tsx data-safety.tsx settings.tsx
│        └─ subjects.$id.tsx concepts.$id.tsx
└─ integrations/supabase/  # Auto-generated client
```

---

## Intelligence Flow

Every engine reads from the same normalized store — no engine owns state.
Adding a new intelligence surface means composing a selector, never
mutating shared caches.

```
Workspace (raw)
    │
    ├─▶ Memory Engine       → concept decay, stability, next-review
    ├─▶ Risk Engine         → subject risk score, at-risk sectors
    ├─▶ ROI Engine          → strategic value per subject
    ├─▶ Mission Engine      → main quest + recovery quests
    ├─▶ Recommendation      → next-action suggestions
    ├─▶ Predictive          → forecast + momentum
    ├─▶ Discipline/Identity → habit tracking, streaks
    └─▶ Academic Map        → layered DAG + tactical scoring
```

---

## Deployment

Scholaris deploys as a Cloudflare-Workers-compatible TanStack Start build.

1. Verify environment variables (see below).
2. `bun install`
3. `bun run build`
4. Click **Publish** in Lovable (or deploy the built artifact to your Worker).

Frontend changes require clicking **Update** in the publish dialog. Backend
changes (migrations, edge functions) deploy immediately.

### Environment Variables

Never commit real secrets. The following are read by the app:

| Variable                        | Scope  | Required | Purpose                        |
| ------------------------------- | ------ | -------- | ------------------------------ |
| `VITE_SUPABASE_URL`             | client | yes      | Cloud project URL              |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | yes      | Anon key                       |
| `VITE_SUPABASE_PROJECT_ID`      | client | yes      | Cloud project identifier       |
| `SUPABASE_URL`                  | server | yes      | Server-side cloud URL          |
| `SUPABASE_PUBLISHABLE_KEY`      | server | yes      | Server-side anon key           |

All Lovable Cloud vars are managed by the platform.

---

## Backup Strategy

- **Automatic** — `maybeRunAutoBackup()` runs on workspace load and once per
  configured interval, retaining N most-recent snapshots (see
  `lib/data-safety.ts`).
- **Manual** — users can trigger `createBackup("manual")` from
  **Settings → Data Safety** or the **Data Safety Center**.
- **Snapshots** are versioned JSON documents stored in browser storage and
  downloadable to disk.
- **Exports** — JSON full snapshot plus CSV per-domain
  (subjects, concepts, sessions, assessments) and knowledge-graph JSON.

## Restore Strategy

1. Upload a `.json` snapshot (or drop a downloaded backup).
2. `parseSnapshotFile()` validates schema and version.
3. `previewRestore()` produces a diff: subjects/concepts/sessions changed.
4. User confirms → `applySnapshot()` rehydrates workspace and persists.
5. Every restore is written to the audit log.

---

## PWA

`public/manifest.webmanifest` + `public/icon-*.png` make Scholaris installable
on desktop and mobile. The app runs in `standalone` display mode with a
dark theme color. No custom service worker is registered — Lovable hosting
handles cache freshness for the app shell.

---

## Future Extension Points

- **New intelligence engine** — add a pure selector under `lib/`, expose via
  `useIntelligence()`, render in a new route.
- **New module route** — create `src/routes/_authenticated/_app/<name>.tsx`
  and register in `app-sidebar.tsx`, `mobile-nav.tsx`, `global-search.tsx`.
- **Cloud sync** — extend `lib/persistence.ts`; keep the intelligence store
  as the single source of truth.
- **AI Coach expansion** — the Coach surface (`coach.tsx`) is designed to
  plug into the Lovable AI Gateway; wire a server function for chat.

---

## Scripts

```bash
bun run dev         # Vite dev server on :8080
bun run build       # Production build
bun run build:dev   # Development-mode production build
bun run preview     # Serve built output
bun run lint        # ESLint
bun run format      # Prettier
```

---

© Scholaris. Built with intent.
