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

export const DEV_MODE = true;

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
