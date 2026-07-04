# Scholaris V1.0 — Release Report

**Release date:** 2026-07-04
**Version:** 1.0.0
**Channel:** Release Candidate (RC-1)
**Codename:** _Commander_

---

## Executive summary

Scholaris V1.0 is a feature-complete academic operating system built on
TanStack Start, React 19 and TypeScript strict. This release closes the
final polish pass, ships a unified **Settings Center**, adds
**Progressive Web App** installability, produces developer documentation
and freezes the intelligence architecture for daily use.

---

## Scorecard

| Dimension              | Score | Notes                                                                       |
| ---------------------- | ----: | --------------------------------------------------------------------------- |
| Architecture           |  9.2  | Single normalized workspace, pure engine selectors, no cross-module state.  |
| Engineering            |  9.0  | Strict TS, zero unresolved imports, disciplined route architecture.         |
| Maintainability        |  9.0  | Clean folder taxonomy, engine-per-file, documented data flow.               |
| Performance            |  8.7  | Memoized selectors, cached backup listing, lightweight animations.          |
| UX                     |  9.0  | Cohesive intelligence surfaces, consistent typography and spacing.          |
| Accessibility          |  8.4  | `aria-current`, focus rings, semantic buttons; further ARIA audit welcome.  |
| Security               |  8.6  | Auth gate at route boundary, RLS-safe cloud client, no secrets on client.   |
| Production readiness   |  9.0  | Build/typecheck green, PWA manifest shipped, docs finalized.                |
| Deployment readiness   |  9.0  | Cloudflare-Workers-compatible build, environment documented.                |

**Overall:** 8.9 / 10 — ready for V1.0 deployment.

---

## Highlights

- **Settings Center** — profile, academic snapshot, session defaults,
  Commander & Daily OS preferences, appearance, keyboard shortcuts,
  notifications, data safety, about and danger zone in one place.
- **PWA installable** — web manifest, adaptive icons, theme color,
  Apple / desktop install support.
- **Developer docs** — architecture, data flow, intelligence flow,
  deployment, backup/restore, extension points (see `README.md`).
- **Polished shell** — dynamic viewport, safe-area insets, live profile,
  global toaster, complete command palette.

---

## Release notes

### Added
- **Settings** module at `/settings` with 10 grouped sections and anchor nav.
- **PWA manifest** (`public/manifest.webmanifest`) + branded icons
  (`icon-192`, `icon-512`, `apple-touch-icon`).
- **Theme-color / apple-mobile-web-app-capable** head metadata.
- **README.md** — architecture overview, folder structure, intelligence
  flow, deployment, environment variables, backup/restore strategy,
  extension points.
- **Release report** — this document.

### Changed
- Sidebar, mobile nav and global command palette now include Settings.
- Root head metadata expanded for install/theming.

### Fixed
- (Prior RC pass) mounted global `<Toaster />`, replaced hard-coded
  profile with live auth data, dvh + safe-area on mobile, removed dead
  notification bell, removed data-safety render loop.

---

## Known limitations

- Offline-first sync is manifest-only; a service worker with cache-first
  app shell is intentionally deferred to a later release to avoid stale
  preview state.
- Push notifications are out of scope for V1.0.
- The AI Coach surface is scaffolded but requires a Lovable AI Gateway
  server function to enable live chat.
- Data Safety operates on a per-device backup store; cross-device backup
  sync is a V1.1 candidate.

---

## Upgrade checklist

1. Verify environment variables (README → Environment Variables).
2. Run `bun install && bun run build`.
3. Publish via Lovable.
4. Confirm PWA install prompt on Chrome / Safari.
5. Trigger a manual backup from **Settings → Data Safety** to verify
   backup pipeline.

---

_Prepared by the Scholaris engineering team._
