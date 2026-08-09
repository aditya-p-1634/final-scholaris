// Scholaris Development Mode
// ----------------------------------
// Temporarily bypasses authentication and onboarding so the application
// can be used directly during development. Auth code, database schema,
// and persistence logic are all kept intact — when DEV_MODE is flipped
// back to false, real auth resumes.
//
// While DEV_MODE is true:
//   - Authenticated route gates skip the redirect to /auth
//   - The app gate skips onboarding/loadWorkspace and hydrates from
//     a local dev workspace instead
//   - persistence.ts writes silently no-op (no auth session ⇒ early return)

import type { WorkspacePayload } from "./persistence";

export const DEV_MODE = Boolean(
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) ||
    (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development"),
);

export const DEV_USER = {
  id: "00000000-0000-0000-0000-000000000dev",
  email: "dev@scholaris.local",
  displayName: "Dev User",
};

// Production data reset: brand-new users start with a completely clean
// workspace. No bundled subjects, concepts, sessions, assessments, or
// missions. The intelligence engines remain idle until the user imports
// a syllabus or manually creates their academic structure.
export function buildDevWorkspace(): WorkspacePayload {
  return {
    subjectsById: {},
    conceptsById: {},
    prereqs: {},
    sessions: [],
    assessments: [],
    completedMissionIds: [],
    hasWorkspace: false,
  };
}

const DEV_STORAGE_KEY = "scholaris:dev_workspace_v1";

export function saveDevWorkspace(payload: WorkspacePayload): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota or unavailable */
  }
}

export function loadDevWorkspace(): WorkspacePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DEV_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.subjectsById) {
      return null;
    }
    return {
      subjectsById: parsed.subjectsById ?? {},
      conceptsById: parsed.conceptsById ?? {},
      prereqs: parsed.prereqs ?? {},
      sessions: parsed.sessions ?? [],
      assessments: parsed.assessments ?? [],
      completedMissionIds: parsed.completedMissionIds ?? [],
      hasWorkspace: Boolean(parsed.hasWorkspace ?? Object.keys(parsed.subjectsById ?? {}).length > 0),
    };
  } catch {
    return null;
  }
}

export function clearDevWorkspace(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DEV_STORAGE_KEY);
  } catch {
    /* noop */
  }
}
