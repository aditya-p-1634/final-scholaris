// Universal Academic Capture — resolution, planning and application.
// ====================================================================
// The AI parser (capture.functions.ts) returns a loose, name-based parse of
// what the student did. This module:
//   1. RESOLVES parsed names back to concrete subject/concept ids against the
//      live intelligence store (fuzzy, knowledge-graph aware).
//   2. PLANS the change — produces a human-readable confirmation (detected
//      entities + which intelligence systems will update).
//   3. APPLIES it by driving the EXISTING store actions (sessions,
//      assessments, missions, recovery). No new engine logic, no direct DB
//      writes — every change flows through the established propagation path:
//      concept → mastery → memory → risk → ROI → missions → momentum.

import {
  useIntelligenceStore,
  deriveConcepts,
  deriveSubjects,
  type DerivedConcept,
  type DerivedSubject,
} from "./intelligence";
import { deriveMainQuest, deriveRecovery } from "./academic-system";

// ---------------- Raw AI parse shapes ----------------

export type CaptureType =
  | "study_session"
  | "problem_solving"
  | "assessment"
  | "quest_complete"
  | "unit_complete"
  | "review"
  | "failure";

export interface RawCaptureActivity {
  type: CaptureType;
  subjectId: string | null;
  subject: string | null;
  conceptId: string | null;
  concept: string | null;
  durationMinutes: number | null;
  problemCount: number | null;
  assessmentTitle: string | null;
  score: number | null;
  outOf: number | null;
  percent: number | null;
  questKind: "main" | "recovery" | null;
  completionStatus: "completed" | "partial" | "skipped" | null;
  failureKind: "skipped" | "missed_quest" | "forgot" | "couldnt_solve" | null;
  confidence: number;
  summary: string;
}

export interface RawCaptureParse {
  activities: RawCaptureActivity[];
}

// ---------------- Resolved plan shapes ----------------

export interface CapturePlanItem {
  type: CaptureType;
  summary: string;
  confidence: number;
  subject?: { id: string; name: string };
  concepts: { id: string; name: string }[];
  durationMinutes?: number;
  problemCount?: number;
  assessment?: { title: string; percent: number };
  questKind?: "main" | "recovery";
  completionStatus?: "completed" | "partial" | "skipped";
  failureKind?: "skipped" | "missed_quest" | "forgot" | "couldnt_solve";
  updates: string[];
  warning?: string;
  // Carried so apply() can act without re-resolving.
  raw: RawCaptureActivity;
}

// ---------------- Context builder ----------------

export interface CaptureContext {
  subjects: { id: string; name: string; code: string }[];
  concepts: { id: string; name: string; subject: string }[];
  mainQuest?: string;
  recoveryQuests?: string[];
}

export function buildCaptureContext(): CaptureContext {
  const state = useIntelligenceStore.getState();
  const subjects = deriveSubjects(state);
  const concepts = deriveConcepts(state);
  const mq = deriveMainQuest(state);
  const recovery = deriveRecovery(state);
  return {
    subjects: subjects.map((s) => ({ id: s.id, name: s.name, code: s.code })),
    concepts: concepts.slice(0, 600).map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subjectName,
    })),
    mainQuest: mq.victory?.title,
    recoveryQuests: recovery.quests.slice(0, 12).map((q) => q.title),
  };
}

// ---------------- Fuzzy resolution ----------------

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchSubject(
  idHint: string | null,
  nameHint: string | null,
  subjects: DerivedSubject[],
): DerivedSubject | undefined {
  if (idHint) {
    const byId = subjects.find((s) => s.id === idHint);
    if (byId) return byId;
  }
  if (!nameHint) return undefined;
  const n = norm(nameHint);
  return (
    subjects.find((s) => norm(s.name) === n || norm(s.code) === n) ||
    subjects.find((s) => norm(s.name).includes(n) || n.includes(norm(s.name))) ||
    undefined
  );
}

function matchConcept(
  idHint: string | null,
  nameHint: string | null,
  concepts: DerivedConcept[],
  subjectId?: string,
): DerivedConcept | undefined {
  if (idHint) {
    const byId = concepts.find((c) => c.id === idHint);
    if (byId) return byId;
  }
  if (!nameHint) return undefined;
  const n = norm(nameHint);
  let pool = subjectId ? concepts.filter((c) => c.subjectId === subjectId) : concepts;
  if (pool.length === 0) pool = concepts;

  const exact = pool.find((c) => norm(c.name) === n);
  if (exact) return exact;
  const contains = pool.find(
    (c) => norm(c.name).includes(n) || n.includes(norm(c.name)),
  );
  if (contains) return contains;

  const tokens = new Set(n.split(" ").filter(Boolean));
  let best: { c: DerivedConcept; score: number } | null = null;
  for (const c of pool) {
    const ct = norm(c.name).split(" ").filter(Boolean);
    if (!ct.length) continue;
    const overlap = ct.filter((t) => tokens.has(t)).length;
    const score = overlap / Math.max(ct.length, tokens.size);
    if (overlap > 0 && (!best || score > best.score)) best = { c, score };
  }
  return best && best.score >= 0.5 ? best.c : undefined;
}

// Which intelligence systems an activity propagates to (for confirmation UI).
function updatesFor(type: CaptureType, failureKind?: string | null): string[] {
  switch (type) {
    case "study_session":
    case "review":
      return ["Mastery", "Memory", "ROI", "Risk", "Momentum", "Discipline"];
    case "problem_solving":
      return ["Mastery", "Memory", "Accuracy", "ROI", "Risk", "Momentum"];
    case "assessment":
      return ["Assessment History", "Concept Accuracy", "Readiness", "Risk", "Recommendations"];
    case "quest_complete":
      return ["Quest Status", "Momentum", "Discipline", "Identity", "Accountability"];
    case "unit_complete":
      return ["Mastery", "Memory", "ROI", "Momentum", "Discipline"];
    case "failure":
      if (failureKind === "skipped" || failureKind === "missed_quest")
        return ["Recovery Quests", "Discipline", "Accountability"];
      return ["Memory", "Risk", "Recovery Quests", "Discipline"];
  }
}

// ---------------- Planning ----------------

export function planCapture(parse: RawCaptureParse): CapturePlanItem[] {
  const state = useIntelligenceStore.getState();
  const subjects = deriveSubjects(state);
  const concepts = deriveConcepts(state);

  return parse.activities.map((raw) => {
    let subject = matchSubject(raw.subjectId, raw.subject, subjects);
    const matchedConcept = matchConcept(
      raw.conceptId,
      raw.concept,
      concepts,
      subject?.id,
    );
    if (!subject && matchedConcept) {
      subject = subjects.find((s) => s.id === matchedConcept.subjectId);
    }

    const resolvedConcepts: { id: string; name: string }[] = matchedConcept
      ? [{ id: matchedConcept.id, name: matchedConcept.name }]
      : [];

    const item: CapturePlanItem = {
      type: raw.type,
      summary: raw.summary,
      confidence: Math.max(0, Math.min(100, Math.round(raw.confidence || 60))),
      subject: subject ? { id: subject.id, name: subject.name } : undefined,
      concepts: resolvedConcepts,
      durationMinutes: raw.durationMinutes ?? undefined,
      problemCount: raw.problemCount ?? undefined,
      questKind: raw.questKind ?? undefined,
      completionStatus: raw.completionStatus ?? undefined,
      failureKind: raw.failureKind ?? undefined,
      updates: updatesFor(raw.type, raw.failureKind),
      raw,
    };

    // Assessment percent normalisation.
    if (raw.type === "assessment") {
      let pct = raw.percent ?? undefined;
      if (pct === undefined && raw.score != null && raw.outOf != null && raw.outOf > 0) {
        pct = Math.round((raw.score / raw.outOf) * 100);
      }
      if (pct === undefined && raw.score != null && raw.score <= 100) pct = Math.round(raw.score);
      if (pct !== undefined) {
        item.assessment = {
          title: raw.assessmentTitle || "Assessment",
          percent: Math.max(0, Math.min(100, pct)),
        };
      }
    }

    // Resolution warnings.
    if (
      (raw.type === "study_session" ||
        raw.type === "problem_solving" ||
        raw.type === "review") &&
      resolvedConcepts.length === 0 &&
      !subject
    ) {
      item.warning = "Couldn't match this to a subject or concept in your workspace.";
    }
    if (raw.type === "assessment" && (!subject || !item.assessment)) {
      item.warning = item.warning ?? "Couldn't match this assessment to a subject or score.";
    }

    return item;
  });
}

// ---------------- Application ----------------

function sessionTypeFor(item: CapturePlanItem): "Recovery" | "Reinforcement" | "Review" | "Expansion" {
  if (item.type === "review") return "Review";
  if (item.type === "problem_solving") return "Reinforcement";
  if (item.type === "unit_complete") return "Reinforcement";
  return "Reinforcement";
}

// Pick concept ids to act on: the resolved concept, or the weakest concepts of
// the resolved subject when only a subject was named.
function targetConceptIds(item: CapturePlanItem): string[] {
  if (item.concepts.length) return item.concepts.map((c) => c.id);
  if (!item.subject) return [];
  const concepts = deriveConcepts(useIntelligenceStore.getState());
  return concepts
    .filter((c) => c.subjectId === item.subject!.id)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 2)
    .map((c) => c.id);
}

// Returns a short list of applied-change descriptions for the toast/log.
export function applyCapture(items: CapturePlanItem[]): string[] {
  const store = useIntelligenceStore.getState();
  const applied: string[] = [];

  for (const item of items) {
    switch (item.type) {
      case "study_session":
      case "review":
      case "unit_complete": {
        const minutes = item.durationMinutes ?? (item.type === "review" ? 15 : 30);
        const ids = targetConceptIds(item);
        let count = 0;
        for (const cid of ids) {
          const r = store.runSession({ conceptId: cid, type: sessionTypeFor(item), minutes });
          if (r) count++;
        }
        if (count > 0) {
          applied.push(
            `Logged a ${minutes}-min ${item.type === "review" ? "review" : "study"} session across ${count} concept${count === 1 ? "" : "s"}.`,
          );
        } else if (item.subject) {
          applied.push(`Noted ${item.subject.name} activity (no concept to update yet).`);
        }
        break;
      }

      case "problem_solving": {
        const ids = targetConceptIds(item);
        const minutes = item.durationMinutes ?? Math.min(60, Math.max(15, (item.problemCount ?? 10) * 2));
        let count = 0;
        for (const cid of ids) {
          const r = store.runSession({ conceptId: cid, type: "Reinforcement", minutes });
          if (r) count++;
        }
        if (count > 0) {
          const n = item.problemCount ? `${item.problemCount} problems` : "practice";
          applied.push(`Recorded ${n} on ${item.concepts[0]?.name ?? item.subject?.name ?? "concept"}.`);
        }
        break;
      }

      case "assessment": {
        if (item.subject && item.assessment) {
          store.recordAssessment({
            subjectId: item.subject.id,
            title: item.assessment.title,
            actual: item.assessment.percent,
          });
          applied.push(
            `Recorded ${item.assessment.title}: ${item.assessment.percent}% in ${item.subject.name}.`,
          );
        }
        break;
      }

      case "quest_complete": {
        if (item.questKind === "recovery") {
          const recovery = deriveRecovery(useIntelligenceStore.getState());
          const quest = recovery.quests[0];
          if (quest) {
            store.runSession({ conceptId: quest.conceptId, type: "Recovery", minutes: quest.estimatedMinutes });
            applied.push(`Completed recovery quest: ${quest.title}.`);
          } else {
            applied.push("No active recovery quest to complete.");
          }
        } else {
          const mq = deriveMainQuest(useIntelligenceStore.getState());
          if (mq.victory) {
            store.runMission(mq.victory.missionId);
            applied.push(`Completed main quest: ${mq.victory.title}.`);
          } else {
            applied.push("No active quest to complete.");
          }
        }
        break;
      }

      case "failure": {
        const ids = targetConceptIds(item);
        if ((item.failureKind === "forgot" || item.failureKind === "couldnt_solve") && ids.length) {
          for (const cid of ids) {
            const c = store.conceptsById[cid];
            if (!c) continue;
            const masteryDrop = item.failureKind === "forgot" ? 18 : 10;
            const memoryDrop = item.failureKind === "forgot" ? 35 : 15;
            store.editConcept(cid, {
              mastery: Math.max(0, Math.round(c.mastery - masteryDrop)),
              memoryStrength: Math.max(0, Math.round(c.memoryStrength - memoryDrop)),
              failedRecalls: c.failedRecalls + 1,
              daysSinceReview: Math.max(c.daysSinceReview, 6),
            });
          }
          applied.push(
            `Marked ${item.concepts[0]?.name ?? "concept"} as at-risk — a recovery quest will surface.`,
          );
        } else {
          // Skipped day / missed quest: no destructive mutation, but acknowledged.
          applied.push("Logged the miss — Scholaris will prioritise recovery.");
        }
        break;
      }
    }
  }

  return applied;
}
