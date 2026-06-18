// Scholaris Academic Session Mode.
// ====================================================================
// Session Mode is the EXECUTION layer. The rest of Scholaris decides WHAT
// to do and WHY it matters; Session Mode is where the work actually happens.
//
// This module owns:
//   1. BLUEPRINTS — how a session is initialized from any entry point
//      (main quest, side quest, recovery quest, concept, subject, focus).
//   2. The active SESSION STORE — timer state, progress, smart events, notes.
//   3. COMPLETION — drives the EXISTING intelligence store actions so a single
//      session automatically updates mastery, memory, risk, ROI, momentum,
//      discipline, identity, recommendations, missions and readiness.
//   4. INTELLIGENCE DIFF — before/after snapshot so the completion summary can
//      show real mastery change, risk reduction, momentum and identity growth.
//
// It adds NO new prediction engines. Every state change flows through the
// established propagation path (runSession / runMission / recordAssessment /
// editConcept). The intelligence architecture is untouched.

import { create } from "zustand";
import {
  useIntelligenceStore,
  deriveConcepts,
  deriveSubjects,
  deriveMissions,
  type SessionLogEntry,
  type ConceptCore,
  type SubjectMeta,
  type AssessmentLogEntry,
} from "./intelligence";
import { deriveMomentum } from "./execution";
import {
  deriveDiscipline,
  deriveRecovery,
  deriveAccountability,
  deriveProcrastination,
  deriveMomentumV2,
  deriveIdentity,
  deriveMainQuest,
} from "./academic-system";

const round = (n: number) => Math.round(n);
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

interface CoreState {
  conceptsById: Record<string, ConceptCore>;
  subjectsById: Record<string, SubjectMeta>;
  sessions: SessionLogEntry[];
  assessments: AssessmentLogEntry[];
  completedMissionIds: string[];
}

function coreFrom(): CoreState {
  const s = useIntelligenceStore.getState();
  return {
    conceptsById: s.conceptsById,
    subjectsById: s.subjectsById,
    sessions: s.sessions,
    assessments: s.assessments,
    completedMissionIds: s.completedMissionIds,
  };
}

// ====================================================================
// SESSION TYPES
// ====================================================================

export type SessionMode =
  | "quest"      // launched from a mission / main / side / critical / boss quest
  | "recovery"   // recovery quest
  | "focus"      // free focus session
  | "pomodoro"   // 25-minute pomodoro
  | "deep"       // 90-minute deep work
  | "custom";    // user-defined length + concepts

export interface SessionConceptTarget {
  id: string;
  name: string;
  subjectName: string;
  mastery: number;
}

export interface SessionBlueprint {
  mode: SessionMode;
  kind: string;            // human label: "Main Quest", "Recovery Quest", "Deep Work"...
  title: string;           // quest / session name
  subjectId?: string;
  subjectName?: string;
  topic?: string;
  concepts: SessionConceptTarget[];
  estimatedMinutes: number;
  expectedOutcome: string;
  whyItMatters: string;
  reasons: string[];       // bullet stakes: "Exam in 7 days", "High ROI", "4-credit subject"
  objective: string;
  missionId?: string;      // when launched from a mission/quest
  sessionType: SessionLogEntry["type"];
  accent: "primary" | "destructive" | "warning" | "info" | "success";
}

export type SmartEventKind =
  | "concept_complete"
  | "concept_struggle"
  | "topic_complete"
  | "distracted"
  | "need_help"
  | "note";

export interface SessionEvent {
  id: string;
  kind: SmartEventKind;
  label: string;
  conceptId?: string;
  at: number;
}

export type ReflectionRating =
  | "Excellent" | "Good" | "Average" | "Difficult" | "Very Difficult";

export interface IntelSnapshot {
  mastery: number;
  risk: number;
  momentum: number;
  discipline: number;
  identityPoints: number;
  identityLevel: number;
}

export interface SessionSummary {
  minutes: number;
  conceptsImproved: number;
  conceptNames: string[];
  masteryChange: number;       // after - before (avg concept mastery)
  riskReduction: number;       // before - after (positive = risk removed)
  momentumIncrease: number;    // unified momentum delta
  disciplineImpact: number;    // discipline score delta
  identityProgress: number;    // evolution points gained
  leveledUp: boolean;
  newLevel: number;
  applied: string[];           // human-readable change log
  reflection?: ReflectionRating;
  systemsUpdated: string[];
}

// ====================================================================
// SNAPSHOT — for the before/after intelligence diff.
// ====================================================================

function snapshot(): IntelSnapshot {
  const core = coreFrom();
  const concepts = deriveConcepts(core);
  const mastery = concepts.length
    ? round(concepts.reduce((a, c) => a + c.mastery, 0) / concepts.length)
    : 0;
  const risk = concepts.length
    ? round(concepts.reduce((a, c) => a + c.risk, 0) / concepts.length)
    : 0;

  const baseMomentum = deriveMomentum(core);
  const discipline = deriveDiscipline(core);
  const recovery = deriveRecovery(core);
  const accountability = deriveAccountability(core);
  const procrastination = deriveProcrastination(core, recovery);
  const momentum = deriveMomentumV2(baseMomentum, discipline, accountability, procrastination);
  const identity = deriveIdentity(core, discipline, accountability, baseMomentum, recovery);

  return {
    mastery,
    risk,
    momentum: momentum.unifiedScore,
    discipline: discipline.score,
    identityPoints: identity.evolutionPoints,
    identityLevel: identity.level,
  };
}

// ====================================================================
// BLUEPRINT BUILDERS — one per entry point.
// ====================================================================

function targetFromConcept(id: string): SessionConceptTarget | null {
  const c = deriveConcepts(coreFrom()).find((x) => x.id === id);
  if (!c) return null;
  return { id: c.id, name: c.name, subjectName: c.subjectName, mastery: round(c.mastery) };
}

// Main Quest — the single most important next action.
export function blueprintFromMainQuest(): SessionBlueprint | null {
  const core = coreFrom();
  const mq = deriveMainQuest(core);
  if (!mq.victory) return null;
  return blueprintFromMission(mq.victory.missionId, "Main Quest", "primary");
}

// Any mission (side / critical / boss / main quest) by id.
export function blueprintFromMission(
  missionId: string,
  kind = "Quest",
  accent: SessionBlueprint["accent"] = "primary",
): SessionBlueprint | null {
  const core = coreFrom();
  const mission = deriveMissions(core).find((m) => m.id === missionId);
  if (!mission) return null;

  const concepts = mission.conceptIds
    .map((id) => targetFromConcept(id))
    .filter((x): x is SessionConceptTarget => !!x);

  const subjects = deriveSubjects(core);
  const subject = subjects.find((s) => s.id === mission.subjectId);

  const reasons: string[] = [];
  if (subject?.daysToAssessment !== undefined)
    reasons.push(`Exam in ${subject.daysToAssessment} day${subject.daysToAssessment === 1 ? "" : "s"}`);
  if (mission.roiScore >= 65) reasons.push(`High ROI (${mission.roiScore})`);
  if (subject && subject.credits >= 4) reasons.push(`${subject.credits}-credit subject`);
  const downstream = concepts.length
    ? deriveConcepts(core).filter((c) => mission.conceptIds.includes(c.id)).reduce((a, c) => a + c.downstreamCount, 0)
    : 0;
  if (downstream > 0) reasons.push(`Unlocks ${downstream} downstream concept${downstream === 1 ? "" : "s"}`);
  if (mission.riskReduction > 0) reasons.push(`Removes ~${mission.riskReduction} risk points`);

  const resolvedKind =
    kind === "Quest"
      ? mission.priority === "critical"
        ? "Critical Quest"
        : mission.type === "recovery"
        ? "Recovery Quest"
        : "Quest"
      : kind;
  const resolvedAccent: SessionBlueprint["accent"] =
    mission.priority === "critical" ? "destructive" : mission.priority === "high" ? "warning" : accent;

  return {
    mode: mission.type === "recovery" ? "recovery" : "quest",
    kind: resolvedKind,
    title: mission.title,
    subjectId: mission.subjectId,
    subjectName: mission.subjectName,
    topic: concepts[0]?.name,
    concepts,
    estimatedMinutes: mission.estimatedMinutes,
    expectedOutcome: mission.expectedImpact,
    whyItMatters: mission.reason,
    reasons: reasons.length ? reasons : ["Moves your highest-value work forward"],
    objective: `Complete ${mission.title.toLowerCase()}.`,
    missionId: mission.id,
    sessionType:
      mission.type === "recovery" ? "Recovery" :
      mission.type === "reinforcement" ? "Reinforcement" :
      mission.type === "expansion" ? "Expansion" :
      mission.type === "assessment" ? "Diagnostic" : "Review",
    accent: resolvedAccent,
  };
}




// Recovery quest by concept id.
export function blueprintFromRecovery(conceptId: string): SessionBlueprint | null {
  const core = coreFrom();
  const recovery = deriveRecovery(core);
  const quest = recovery.quests.find((q) => q.conceptId === conceptId);
  const target = targetFromConcept(conceptId);
  if (!target) return null;
  return {
    mode: "recovery",
    kind: "Recovery Quest",
    title: quest ? quest.title : `Recover ${target.name}`,
    subjectName: target.subjectName,
    topic: target.name,
    concepts: [target],
    estimatedMinutes: quest?.estimatedMinutes ?? 25,
    expectedOutcome: `Rebuild mastery and memory of ${target.name}.`,
    whyItMatters: quest?.reason ?? `${target.name} has decayed and needs recovery before it cascades.`,
    reasons: quest
      ? [
          `${quest.severity} severity`,
          `Removes ~${quest.riskReduction} risk points`,
          quest.daysMissed > 0 ? `Unreviewed for ${quest.daysMissed} days` : "Memory is collapsing",
        ]
      : ["Concept is decaying", "Recovery prevents a cascade"],
    objective: `Recover ${target.name} back to a stable level.`,
    sessionType: "Recovery",
    accent: quest?.severity === "critical" ? "destructive" : "warning",
  };
}

// Concept Intelligence — focus a single concept.
export function blueprintFromConcept(conceptId: string): SessionBlueprint | null {
  const target = targetFromConcept(conceptId);
  if (!target) return null;
  const weak = target.mastery < 55;
  return {
    mode: weak ? "recovery" : "focus",
    kind: weak ? "Recovery Session" : "Concept Session",
    title: `${weak ? "Recover" : "Reinforce"} ${target.name}`,
    subjectName: target.subjectName,
    topic: target.name,
    concepts: [target],
    estimatedMinutes: weak ? 30 : 25,
    expectedOutcome: weak
      ? `Lift ${target.name} out of the weak zone.`
      : `Deepen and stabilise ${target.name}.`,
    whyItMatters: weak
      ? `${target.name} is at ${target.mastery}/100 — strengthening it protects everything that depends on it.`
      : `Reinforcing ${target.name} compounds your mastery and memory.`,
    reasons: [`Current mastery ${target.mastery}/100`],
    objective: `Bring ${target.name} to a stronger, more reliable level.`,
    sessionType: weak ? "Recovery" : "Reinforcement",
    accent: weak ? "warning" : "primary",
  };
}

// Subject Intelligence — focus the weakest concepts of a subject.
export function blueprintFromSubject(subjectId: string): SessionBlueprint | null {
  const core = coreFrom();
  const subject = deriveSubjects(core).find((s) => s.id === subjectId);
  if (!subject) return null;
  const concepts = deriveConcepts(core)
    .filter((c) => c.subjectId === subjectId)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 3)
    .map((c) => ({ id: c.id, name: c.name, subjectName: c.subjectName, mastery: round(c.mastery) }));
  if (concepts.length === 0) return null;

  const reasons: string[] = [];
  if (subject.daysToAssessment !== undefined)
    reasons.push(`Exam in ${subject.daysToAssessment} day${subject.daysToAssessment === 1 ? "" : "s"}`);
  if (subject.credits >= 4) reasons.push(`${subject.credits}-credit subject`);
  reasons.push(`${subject.weakConcepts} weak concept${subject.weakConcepts === 1 ? "" : "s"}`);

  return {
    mode: "focus",
    kind: "Subject Session",
    title: `Strengthen ${subject.name}`,
    subjectId: subject.id,
    subjectName: subject.name,
    concepts,
    estimatedMinutes: 40,
    expectedOutcome: `Raise the weakest concepts in ${subject.name}.`,
    whyItMatters: `${subject.name} is at ${subject.risk}/100 risk — clearing its weakest concepts de-risks the whole subject.`,
    reasons,
    objective: `Improve the ${concepts.length} weakest concepts in ${subject.name}.`,
    sessionType: "Reinforcement",
    accent: subject.risk > 60 ? "warning" : "primary",
  };
}

// Free focus / pomodoro / deep work / custom session.
export function blueprintFocus(opts: {
  mode: "focus" | "pomodoro" | "deep" | "custom";
  minutes?: number;
  conceptIds?: string[];
}): SessionBlueprint {
  const core = coreFrom();
  const all = deriveConcepts(core);
  let concepts: SessionConceptTarget[];
  if (opts.conceptIds && opts.conceptIds.length) {
    concepts = opts.conceptIds
      .map((id) => all.find((c) => c.id === id))
      .filter((c): c is (typeof all)[number] => !!c)
      .map((c) => ({ id: c.id, name: c.name, subjectName: c.subjectName, mastery: round(c.mastery) }));
  } else {
    // Default: the engine's current priority targets (weakest, highest-value).
    concepts = [...all]
      .sort((a, b) => b.risk * 0.6 + b.roi * 0.4 - (a.risk * 0.6 + a.roi * 0.4))
      .slice(0, opts.mode === "deep" ? 4 : opts.mode === "pomodoro" ? 1 : 2)
      .map((c) => ({ id: c.id, name: c.name, subjectName: c.subjectName, mastery: round(c.mastery) }));
  }

  const presets: Record<string, { kind: string; minutes: number; outcome: string }> = {
    focus: { kind: "Focus Session", minutes: 30, outcome: "Make focused progress on your priority concepts." },
    pomodoro: { kind: "Pomodoro", minutes: 25, outcome: "One sharp, uninterrupted 25-minute push." },
    deep: { kind: "Deep Work", minutes: 90, outcome: "Sustained deep work across several connected concepts." },
    custom: { kind: "Custom Session", minutes: opts.minutes ?? 45, outcome: "Execute your chosen work block." },
  };
  const p = presets[opts.mode];
  const minutes = opts.minutes ?? p.minutes;

  return {
    mode: opts.mode,
    kind: p.kind,
    title: p.kind,
    concepts,
    estimatedMinutes: minutes,
    expectedOutcome: p.outcome,
    whyItMatters:
      "Time on the right concepts compounds into mastery, lower risk and stronger momentum.",
    reasons: concepts.length
      ? [`${concepts.length} target concept${concepts.length === 1 ? "" : "s"}`, `${minutes}-minute block`]
      : [`${minutes}-minute block`],
    objective: "Stay focused and execute until the timer completes.",
    sessionType: opts.mode === "deep" ? "Expansion" : "Reinforcement",
    accent: "primary",
  };
}

// ====================================================================
// COMPLETION — drive the existing intelligence actions.
// ====================================================================

const SYSTEMS = [
  "Mastery", "Memory", "Risk", "ROI", "Momentum",
  "Discipline", "Identity", "Recommendations", "Missions", "Readiness", "Knowledge Graph",
];

function applyCompletion(
  bp: SessionBlueprint,
  completedIds: string[],
  struggledIds: string[],
  minutes: number,
): { applied: string[]; conceptNames: string[] } {
  const store = useIntelligenceStore.getState();
  const applied: string[] = [];
  const touched = new Set<string>();

  if (bp.missionId) {
    // Quest path: runMission cascades sessions across all concepts and marks
    // the mission complete — momentum, discipline, identity all follow.
    store.runMission(bp.missionId);
    bp.concepts.forEach((c) => touched.add(c.id));
    applied.push(`Completed quest: ${bp.title}.`);
  } else {
    const ids = completedIds.length
      ? completedIds
      : bp.concepts.map((c) => c.id);
    const per = Math.max(8, Math.round(minutes / Math.max(1, ids.length)));
    let improved = 0;
    for (const id of ids) {
      const r = store.runSession({ conceptId: id, type: bp.sessionType, minutes: per });
      if (r) {
        improved++;
        touched.add(id);
      }
    }
    if (improved > 0)
      applied.push(`Logged a ${minutes}-min ${bp.kind.toLowerCase()} across ${improved} concept${improved === 1 ? "" : "s"}.`);
  }

  // Struggled concepts: still credited, but flagged so a recovery quest surfaces.
  for (const id of struggledIds) {
    const c = store.conceptsById[id];
    if (!c) continue;
    if (!touched.has(id)) {
      store.runSession({ conceptId: id, type: "Recovery", minutes: 12 });
      touched.add(id);
    }
    store.editConcept(id, {
      failedRecalls: c.failedRecalls + 1,
      memoryStrength: Math.max(30, Math.round(c.memoryStrength - 10)),
    });
  }
  if (struggledIds.length)
    applied.push(`Flagged ${struggledIds.length} concept${struggledIds.length === 1 ? "" : "s"} you struggled with — recovery will be prioritised.`);

  const conceptNames = [...touched]
    .map((id) => store.conceptsById[id]?.name)
    .filter((n): n is string => !!n);

  return { applied, conceptNames };
}

// ====================================================================
// ACTIVE SESSION STORE (zustand) — timer + progress + events.
// ====================================================================

export type SessionPhase = "idle" | "init" | "active" | "paused" | "complete" | "abandoned";

interface SessionState {
  phase: SessionPhase;
  blueprint: SessionBlueprint | null;
  before: IntelSnapshot | null;
  runningSince: number | null;   // ms timestamp while active
  accumulatedMs: number;         // elapsed accrued before the current run segment
  completedConceptIds: string[];
  struggledConceptIds: string[];
  events: SessionEvent[];
  notes: string;
  summary: SessionSummary | null;

  // actions
  launch: (bp: SessionBlueprint) => void;
  cancel: () => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  toggleConcept: (conceptId: string) => void;
  markStruggle: (conceptId: string) => void;
  addEvent: (kind: SmartEventKind, label: string, conceptId?: string) => void;
  setNotes: (notes: string) => void;
  elapsedMs: () => number;
  complete: (reflection?: ReflectionRating) => void;
  abandon: () => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  phase: "idle",
  blueprint: null,
  before: null,
  runningSince: null,
  accumulatedMs: 0,
  completedConceptIds: [],
  struggledConceptIds: [],
  events: [],
  notes: "",
  summary: null,

  launch: (bp) =>
    set({
      phase: "init",
      blueprint: bp,
      before: null,
      runningSince: null,
      accumulatedMs: 0,
      completedConceptIds: [],
      struggledConceptIds: [],
      events: [],
      notes: "",
      summary: null,
    }),

  cancel: () => get().reset(),

  start: () =>
    set({ phase: "active", runningSince: Date.now(), before: snapshot() }),

  pause: () => {
    const { runningSince, accumulatedMs } = get();
    if (runningSince == null) return;
    set({
      phase: "paused",
      accumulatedMs: accumulatedMs + (Date.now() - runningSince),
      runningSince: null,
    });
  },

  resume: () => set({ phase: "active", runningSince: Date.now() }),

  toggleConcept: (conceptId) =>
    set((s) => {
      const has = s.completedConceptIds.includes(conceptId);
      return {
        completedConceptIds: has
          ? s.completedConceptIds.filter((id) => id !== conceptId)
          : [...s.completedConceptIds, conceptId],
        struggledConceptIds: s.struggledConceptIds.filter((id) => id !== conceptId),
        events: has
          ? s.events
          : [
              { id: `e-${Date.now()}`, kind: "concept_complete", label: "Completed a concept", conceptId, at: Date.now() },
              ...s.events,
            ],
      };
    }),

  markStruggle: (conceptId) =>
    set((s) => ({
      struggledConceptIds: s.struggledConceptIds.includes(conceptId)
        ? s.struggledConceptIds
        : [...s.struggledConceptIds, conceptId],
      completedConceptIds: s.completedConceptIds.filter((id) => id !== conceptId),
      events: [
        { id: `e-${Date.now()}`, kind: "concept_struggle", label: "Struggled with a concept", conceptId, at: Date.now() },
        ...s.events,
      ],
    })),

  addEvent: (kind, label, conceptId) =>
    set((s) => ({
      events: [{ id: `e-${Date.now()}`, kind, label, conceptId, at: Date.now() }, ...s.events],
    })),

  setNotes: (notes) => set({ notes }),

  elapsedMs: () => {
    const { runningSince, accumulatedMs } = get();
    return accumulatedMs + (runningSince ? Date.now() - runningSince : 0);
  },

  complete: (reflection) => {
    const { blueprint, before, completedConceptIds, struggledConceptIds } = get();
    if (!blueprint) return;
    const minutes = Math.max(1, Math.round(get().elapsedMs() / 60000));

    const { applied, conceptNames } = applyCompletion(
      blueprint,
      completedConceptIds,
      struggledConceptIds,
      minutes,
    );
    const after = snapshot();
    const base = before ?? after;

    const summary: SessionSummary = {
      minutes,
      conceptsImproved: conceptNames.length,
      conceptNames,
      masteryChange: round(after.mastery - base.mastery),
      riskReduction: round(base.risk - after.risk),
      momentumIncrease: round(after.momentum - base.momentum),
      disciplineImpact: round(after.discipline - base.discipline),
      identityProgress: round(after.identityPoints - base.identityPoints),
      leveledUp: after.identityLevel > base.identityLevel,
      newLevel: after.identityLevel,
      applied,
      reflection,
      systemsUpdated: SYSTEMS,
    };

    set({
      phase: "complete",
      summary,
      runningSince: null,
      accumulatedMs: minutes * 60000,
    });
  },

  abandon: () => {
    const { runningSince, accumulatedMs } = get();
    set({
      phase: "abandoned",
      accumulatedMs: accumulatedMs + (runningSince ? Date.now() - runningSince : 0),
      runningSince: null,
    });
  },

  reset: () =>
    set({
      phase: "idle",
      blueprint: null,
      before: null,
      runningSince: null,
      accumulatedMs: 0,
      completedConceptIds: [],
      struggledConceptIds: [],
      events: [],
      notes: "",
      summary: null,
    }),
}));

// Smallest useful recovery action after an abandoned session.
export interface RecoverySuggestion {
  title: string;
  minutes: number;
  conceptId?: string;
  reason: string;
}

export function abandonRecovery(bp: SessionBlueprint | null): RecoverySuggestion {
  const core = coreFrom();
  const recovery = deriveRecovery(core);
  const proc = deriveProcrastination(core, recovery);
  if (proc.firstStep) {
    return {
      title: proc.firstStep.title,
      minutes: proc.firstStep.minutes,
      conceptId: proc.firstStep.conceptId,
      reason: "The smallest useful action to keep momentum alive.",
    };
  }
  const c = bp?.concepts[0];
  return {
    title: c ? `Review ${c.name}` : "Review one concept",
    minutes: 3,
    conceptId: c?.id,
    reason: "A 3-minute review prevents the day from becoming a total miss.",
  };
}
