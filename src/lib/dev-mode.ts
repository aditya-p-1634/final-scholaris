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

import {
  subjects as mockSubjects,
  concepts as mockConcepts,
} from "./mock-data";
import type { WorkspacePayload } from "./persistence";
import type { ConceptCore, SubjectMeta } from "./intelligence";

export const DEV_MODE = true;

export const DEV_USER = {
  id: "00000000-0000-0000-0000-000000000dev",
  email: "dev@scholaris.local",
  displayName: "Dev User",
};

function lastReviewedDays(label: string | undefined): number {
  if (!label) return 7;
  const m = label.match(/(\d+)\s*d/);
  return m ? parseInt(m[1], 10) : 7;
}

export function buildDevWorkspace(): WorkspacePayload {
  const subjectsById: Record<string, SubjectMeta> = {};
  for (let i = 0; i < mockSubjects.length; i++) {
    const s = mockSubjects[i];
    subjectsById[s.id] = {
      id: s.id,
      name: s.name,
      code: s.code,
      color: s.color,
      nextAssessment: s.nextAssessment,
      daysToAssessment: s.nextAssessment
        ? Math.max(
            0,
            Math.round(
              (new Date(s.nextAssessment).getTime() - Date.now()) / 86400000,
            ),
          )
        : undefined,
      hoursThisWeek: s.hoursThisWeek,
      baselineMastery: s.mastery,
      examWeight: 0.5,
      strategicValue: s.roi,
      // Varied credit hours + grading schemes so the weighting model has signal.
      credits: [4, 3, 2, 4, 3, 2][i % 6],
      assessmentWeights:
        i % 3 === 0
          ? { midterm: 0.25, final: 0.5, assignment: 0.15, lab: 0.0, project: 0.1 }
          : i % 3 === 1
          ? { midterm: 0.2, final: 0.4, assignment: 0.2, lab: 0.2, project: 0.0 }
          : { midterm: 0.15, final: 0.35, assignment: 0.2, lab: 0.0, project: 0.3 },
    };
  }

  const conceptsById: Record<string, ConceptCore> = {};
  const prereqs: Record<string, string[]> = {};
  for (const c of mockConcepts) {
    conceptsById[c.id] = {
      id: c.id,
      name: c.name,
      subjectId: c.subjectId,
      subjectName: c.subjectName,
      topic: c.topic,
      mastery: c.mastery,
      memoryStrength: c.memoryStrength,
      importance: c.importance,
      decayRate: c.decayRate,
      daysSinceReview: lastReviewedDays(c.lastReviewed),
      reviewCount: c.reviewCount,
      successfulRecalls: Math.max(0, c.reviewCount - 1),
      failedRecalls: c.mastery < 50 ? 2 : 0,
      assessmentAttempts: 0,
      assessmentCorrect: 0,
    };
    prereqs[c.id] = [];
  }

  // A few illustrative prerequisites so the graph engine has something to chew on
  if (conceptsById["c-9"] && conceptsById["c-8"]) prereqs["c-8"] = ["c-9"];
  if (conceptsById["c-3"] && conceptsById["c-12"]) prereqs["c-12"] = ["c-3"];
  if (conceptsById["c-3"] && conceptsById["c-4"]) prereqs["c-4"] = ["c-3"];

  return {
    subjectsById,
    conceptsById,
    prereqs,
    sessions: [],
    assessments: [],
    completedMissionIds: [],
    hasWorkspace: true,
  };
}
