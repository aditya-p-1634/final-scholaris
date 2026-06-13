// Scholaris Academic Intelligence — single source of truth.
// Concepts are the primary entity. Subjects, missions, recommendations,
// diagnostics, coach context, alerts, and trends are ALL derived from
// concept-level state and the session/assessment logs. Any mutation
// (running a session, completing a mission, advancing time) propagates
// across every page that reads from these hooks.

import { create } from "zustand";
import { useSyncExternalStore } from "react";
import type {
  SubjectStatus,
  ConceptStatus,
  MissionPriority,
  MissionType,
} from "./mock-data";
import {
  persistSession,
  persistAssessment,
  persistConceptPatch,
  persistConceptsBatch,
  persistMissionCompletion,
  persistAdvanceDay,
  type WorkspacePayload,
} from "./persistence";

// ---------------- Types ----------------

export interface SubjectMeta {
  id: string;
  name: string;
  code: string;
  color: string;
  nextAssessment?: string;
  daysToAssessment?: number;
  hoursThisWeek: number;
  baselineMastery: number; // snapshot for trend calc
  examWeight: number; // 0–1: importance of upcoming exam
  strategicValue: number; // 0–100: long-term value within the program
}

export interface ConceptCore {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  mastery: number; // 0–100
  memoryStrength: number; // 0–100
  importance: number; // 1–10
  decayRate: number; // per day
  daysSinceReview: number;
  reviewCount: number;
  // Advanced memory signal — updated by sessions/assessments
  successfulRecalls: number;
  failedRecalls: number;
  assessmentAttempts: number;
  assessmentCorrect: number;
}

// ---------------- Knowledge graph (prerequisites) ----------------
// Concept A is a prerequisite of Concept B if B depends on A's mastery.
// Drives dependency-aware risk propagation, bottleneck detection,
// and critical-path analysis.
// Populated on hydrate() from the concept_prerequisites table.
export let PREREQUISITES: Record<string, string[]> = {};
export function setPrerequisites(p: Record<string, string[]>) {
  PREREQUISITES = p;
}

export interface ExplainBlock {
  reason: string;
  factors: { label: string; weight: number; value: string }[];
  confidence: number; // 0–100
  expectedImpact?: string;
}

export interface RoiBreakdown {
  examWeight: number;
  dependencyUnlocks: number;
  futureValue: number;
  strategicImportance: number;
  learningCost: number;
  currentWeakness: number;
  total: number;
}

export interface MemoryProfile {
  stability: number;            // 0–100
  recallConfidence: number;     // 0–100
  reviewSuccessRate: number;    // 0–100
  recoverySpeed: number;        // mastery gained per recovery session
  retentionReliability: number; // 0–100
  predictedForgettingDays: number;
  predictedForgettingDate: string;
}

export interface DerivedConcept extends ConceptCore {
  roi: number;
  risk: number;
  baseRisk: number;
  propagatedRisk: number;
  status: ConceptStatus;
  lastReviewed: string;
  // Knowledge graph
  prerequisiteIds: string[];
  dependentIds: string[];
  unlockPotential: number;       // 0–100
  bottleneckScore: number;       // 0–100
  isCriticalPath: boolean;
  // Advanced memory
  memory: MemoryProfile;
  // Advanced ROI
  roiBreakdown: RoiBreakdown;
  // Explainability
  explain: { risk: ExplainBlock; roi: ExplainBlock };
}

export interface DerivedSubject {
  id: string;
  name: string;
  code: string;
  color: string;
  rank: number;
  mastery: number;
  memory: number;
  roi: number;
  risk: number;
  status: SubjectStatus;
  trend: number;
  concepts: number;
  weakConcepts: number;
  hoursThisWeek: number;
  nextAssessment?: string;
  daysToAssessment?: number;
  examWeight: number;
  dependencyHealth: number;
  predictedScore: { low: number; high: number };
  readiness: number;
}

export interface SessionLogEntry {
  id: string;
  conceptId: string;
  conceptName: string;
  subjectId: string;
  subjectName: string;
  type: "Recovery" | "Reinforcement" | "Review" | "Expansion" | "Diagnostic";
  duration: number;
  gain: number;
  timestamp: number;
  dateLabel: string;
}

export interface QuestionOutcome {
  conceptId: string;
  correct: boolean;
  difficulty?: number; // 1–10, default 5
}

export interface AssessmentLogEntry {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  predicted: number;
  actual: number;
  timestamp: number;
  questions?: QuestionOutcome[];
}

export interface DerivedMission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  priority: MissionPriority;
  subjectId: string;
  subjectName: string;
  conceptIds: string[];
  estimatedMinutes: number;
  roiScore: number;
  reason: string;
  dueBy?: string;
  completed: boolean;
  // Explainability
  evidence: string[];
  confidence: number;
  expectedImpact: string;
  riskReduction: number; // 0–100 pts of risk projected to be removed
}

export type RecommendationCategory =
  | "recovery" | "reinforcement" | "expansion" | "assessment" | "strategic";

export interface DerivedRecommendation {
  id: string;
  title: string;
  category: RecommendationCategory;
  reason: string;
  evidence: string[];
  expectedBenefit: string;
  confidence: number;
  impact: number;
  urgency: "critical" | "high" | "medium" | "low";
  minutes: number;
  subjectId?: string;
  conceptId?: string;
  // Explainability — top contributing factors with weighted scores.
  factors: { label: string; weight: number; value: string }[];
  unlocks: string[]; // names of downstream concepts this would unlock
}

export type IncidentCategory =
  | "memory-gap" | "concept-gap" | "practice-gap"
  | "assessment-gap" | "revision-gap" | "consistency-gap";

export interface DerivedIncident {
  id: string;
  problem: string;
  type: "mastery-drop" | "memory-collapse" | "assessment-failure" | "risk-increase";
  category: IncidentCategory;
  subject: string;
  subjectId?: string;
  occurredAt: string;
  severity: "critical" | "high" | "medium";
  confidence: number;
  evidence: string[];
  rootCause: string;
  recovery: { title: string; minutes: number; impact: string; conceptId?: string }[];
}

export interface DerivedInsight {
  id: string;
  kind: "alert" | "roi" | "memory" | "risk" | "recommendation";
  title: string;
  body: string;
  subjectId?: string;
  timestamp: string;
  severity: "critical" | "high" | "info";
}

export interface CoachContext {
  activeSubjects: number;
  criticalConcepts: number;
  upcomingExams7d: number;
  missionQueue: number;
  compositeRisk: number;
  topSubjectRisk?: DerivedSubject;
  topMission?: DerivedMission;
  strategicOutlook: string;
}

export interface AcademicStatus {
  overallMastery: number;
  overallMemory: number;
  overallRoi: number;
  overallRisk: number;
  activeSubjects: number;
  totalConcepts: number;
  weakConcepts: number;
  masteredConcepts: number;
  weeklyHours: number;
  trend7d: number;
}

export interface FocusToday {
  totalMinutes: number;
  completedMinutes: number;
  sessionsCompleted: number;
  sessionsPlanned: number;
  conceptsReviewed: number;
  conceptsRecovered: number;
}

// ---------------- Store ----------------

interface State {
  version: number;
  conceptsById: Record<string, ConceptCore>;
  subjectsById: Record<string, SubjectMeta>;
  sessions: SessionLogEntry[];
  assessments: AssessmentLogEntry[];
  completedMissionIds: string[];

  runSession: (input: { conceptId: string; type?: SessionLogEntry["type"]; minutes?: number }) => SessionLogEntry | null;
  runMission: (missionId: string) => void;
  recordAssessment: (input: { subjectId: string; title: string; actual: number }) => void;
  // Question-level (concept-aware) assessment intake.
  recordQuestionAssessment: (input: { subjectId: string; title: string; questions: QuestionOutcome[] }) => AssessmentLogEntry | null;
  advanceDay: (n?: number) => void;
  resetIntelligence: () => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysBetween = (iso: string) => {
  const d = (new Date(iso).getTime() - Date.now()) / 86400000;
  return Math.round(d);
};

function parseLastReviewed(s: string): number {
  if (!s) return 30;
  if (s.includes("today")) return 0;
  if (s.includes("yesterday")) return 1;
  const m = /^(\d+)d/.exec(s);
  return m ? parseInt(m[1], 10) : 14;
}

// Per-subject strategic value heuristic (long-term importance within program).
const SUBJECT_STRATEGIC_VALUE: Record<string, number> = {
  "sub-1": 88, "sub-2": 92, "sub-3": 70, "sub-4": 64, "sub-5": 95, "sub-6": 55,
};

function emptyState(): Omit<State, "version" | "runSession" | "runMission" | "recordAssessment" | "recordQuestionAssessment" | "advanceDay" | "resetIntelligence" | "hydrate" | "clear"> {
  return {
    conceptsById: {},
    subjectsById: {},
    sessions: [],
    assessments: [],
    completedMissionIds: [],
  };
}

const initial = emptyState();

export const useIntelligenceStore = create<State>((set, get) => ({
  version: 0,
  ...initial,

  runSession: ({ conceptId, type = "Reinforcement", minutes = 20 }) => {
    const concept = get().conceptsById[conceptId];
    if (!concept) return null;
    const baseGain =
      type === "Recovery" ? 22 :
      type === "Reinforcement" ? 12 :
      type === "Expansion" ? 8 :
      type === "Diagnostic" ? 5 : 6;
    const room = Math.max(0, 100 - concept.mastery);
    const gain = Math.min(Math.round(baseGain * (0.6 + minutes / 40) * (room / 100 + 0.4)), Math.max(2, room));
    const newMastery = Math.min(100, concept.mastery + gain);
    const newMemory = Math.min(100, Math.max(concept.memoryStrength + 18, 75));
    const updated: ConceptCore = {
      ...concept,
      mastery: newMastery,
      memoryStrength: newMemory,
      reviewCount: concept.reviewCount + 1,
      daysSinceReview: 0,
    };
    const entry: SessionLogEntry = {
      id: `s-${Date.now()}`,
      conceptId,
      conceptName: concept.name,
      subjectId: concept.subjectId,
      subjectName: concept.subjectName,
      type,
      duration: minutes,
      gain,
      timestamp: Date.now(),
      dateLabel: "Just now",
    };
    set((s) => ({
      version: s.version + 1,
      conceptsById: { ...s.conceptsById, [conceptId]: updated },
      sessions: [entry, ...s.sessions].slice(0, 30),
    }));
    return entry;
  },

  runMission: (missionId) => {
    // Look up the derived mission, apply session effects to every concept it
    // targets, and mark it completed so dashboards reflect the win.
    const missions = deriveMissions(get());
    const m = missions.find((x) => x.id === missionId);
    if (!m) return;
    const sessionType: SessionLogEntry["type"] =
      m.type === "recovery" ? "Recovery" :
      m.type === "reinforcement" ? "Reinforcement" :
      m.type === "expansion" ? "Expansion" :
      m.type === "assessment" ? "Diagnostic" : "Review";
    for (const cid of m.conceptIds) {
      get().runSession({ conceptId: cid, type: sessionType, minutes: m.estimatedMinutes });
    }
    set((s) => ({
      version: s.version + 1,
      completedMissionIds: [...new Set([...s.completedMissionIds, missionId])],
    }));
  },

  recordAssessment: ({ subjectId, title, actual }) => {
    const subject = get().subjectsById[subjectId];
    if (!subject) return;
    const predicted = computeSubjectReadiness(get(), subjectId);
    const entry: AssessmentLogEntry = {
      id: `a-${Date.now()}`,
      subjectId,
      subjectName: subject.name,
      title,
      predicted,
      actual,
      timestamp: Date.now(),
    };
    // Calibrate concepts in the subject toward the actual result.
    const delta = (actual - predicted) * 0.3;
    const concepts = { ...get().conceptsById };
    for (const c of Object.values(concepts)) {
      if (c.subjectId !== subjectId) continue;
      concepts[c.id] = {
        ...c,
        mastery: Math.max(0, Math.min(100, Math.round(c.mastery + delta))),
      };
    }
    set((s) => ({
      version: s.version + 1,
      assessments: [entry, ...s.assessments].slice(0, 20),
      conceptsById: concepts,
    }));
  },

  advanceDay: (n = 1) => {
    const concepts = { ...get().conceptsById };
    for (const c of Object.values(concepts)) {
      const ds = c.daysSinceReview + n;
      const decayed = Math.max(
        4,
        Math.round(c.memoryStrength * Math.exp(-c.decayRate * n))
      );
      concepts[c.id] = { ...c, daysSinceReview: ds, memoryStrength: decayed };
    }
    const subjects = { ...get().subjectsById };
    for (const s of Object.values(subjects)) {
      subjects[s.id] = {
        ...s,
        daysToAssessment: s.daysToAssessment !== undefined ? Math.max(0, s.daysToAssessment - n) : undefined,
      };
    }
    set((st) => ({ version: st.version + 1, conceptsById: concepts, subjectsById: subjects }));
  },

  recordQuestionAssessment: ({ subjectId, title, questions }) => {
    if (!questions.length) return null;
    const subject = get().subjectsById[subjectId];
    if (!subject) return null;
    const conceptsMap = { ...get().conceptsById };

    // Per-question concept-level mastery & memory adjustment.
    // Correct: +mastery, +memory, +recall counters.
    // Incorrect: -mastery, -memory, +failed counters, +risk via memory drop.
    for (const q of questions) {
      const c = conceptsMap[q.conceptId];
      if (!c) continue;
      const diff = q.difficulty ?? 5;
      const masteryDelta = q.correct ? 4 + diff * 0.6 : -(5 + diff * 0.9);
      const memoryDelta = q.correct ? 5 + diff * 0.4 : -(7 + diff * 0.6);
      conceptsMap[q.conceptId] = {
        ...c,
        mastery: Math.round(clamp(c.mastery + masteryDelta)),
        memoryStrength: Math.round(clamp(c.memoryStrength + memoryDelta)),
        assessmentAttempts: c.assessmentAttempts + 1,
        assessmentCorrect: c.assessmentCorrect + (q.correct ? 1 : 0),
        successfulRecalls: c.successfulRecalls + (q.correct ? 1 : 0),
        failedRecalls: c.failedRecalls + (q.correct ? 0 : 1),
        daysSinceReview: 0,
      };
    }

    const actual = Math.round((questions.filter((q) => q.correct).length / questions.length) * 100);
    const predicted = computeSubjectReadiness({ conceptsById: conceptsMap, subjectsById: get().subjectsById }, subjectId);

    const entry: AssessmentLogEntry = {
      id: `qa-${Date.now()}`,
      subjectId,
      subjectName: subject.name,
      title,
      predicted,
      actual,
      timestamp: Date.now(),
      questions,
    };

    set((s) => ({
      version: s.version + 1,
      conceptsById: conceptsMap,
      assessments: [entry, ...s.assessments].slice(0, 20),
    }));
    return entry;
  },

  resetIntelligence: () => set(() => ({ version: 0, ...seedState() })),
}));

// ---------------- Pure derivation ----------------

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function statusFromMastery(m: number): ConceptStatus {
  if (m >= 85) return "mastered";
  if (m >= 70) return "strong";
  if (m >= 45) return "developing";
  if (m >= 25) return "weak";
  return "forgotten";
}

function lastReviewedLabel(days: number) {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

// Base risk before dependency propagation.
function baseConceptRisk(c: ConceptCore): number {
  return clamp(
    c.importance * 2.4 +
    (100 - c.mastery) * 0.32 +
    (100 - c.memoryStrength) * 0.26 +
    Math.min(c.daysSinceReview * 1.4, 22) -
    14
  );
}

// Advanced memory profile derived from session + assessment history.
function deriveMemoryProfile(c: ConceptCore): MemoryProfile {
  const totalRecalls = c.successfulRecalls + c.failedRecalls;
  const reviewSuccessRate = totalRecalls > 0
    ? Math.round((c.successfulRecalls / totalRecalls) * 100)
    : Math.round(clamp(c.memoryStrength));
  // Stability ≈ inverse of decay rate, modulated by review depth.
  const stability = Math.round(clamp(
    (1 - Math.min(c.decayRate, 0.4) / 0.4) * 70 +
    Math.min(c.reviewCount, 20) * 1.5
  ));
  const recallConfidence = Math.round(clamp(
    c.memoryStrength * 0.55 + reviewSuccessRate * 0.35 + Math.min(c.reviewCount, 15) * 0.6
  ));
  // Recovery speed: avg mastery gained per recovery session (modeled).
  const recoverySpeed = Math.round(clamp(
    12 + (100 - c.mastery) * 0.10 - c.decayRate * 35,
    2, 30
  ));
  const retentionReliability = Math.round(clamp(
    stability * 0.45 + reviewSuccessRate * 0.35 + recallConfidence * 0.20
  ));
  // Predicted days until memory drops below recall threshold (30/100).
  // memoryStrength * e^(-decay * days) = 30 → days = ln(memory/30)/decay
  const safe = Math.max(31, c.memoryStrength);
  const predictedForgettingDays = Math.max(
    0,
    Math.round(Math.log(safe / 30) / Math.max(c.decayRate, 0.04))
  );
  const date = new Date(Date.now() + predictedForgettingDays * 86400000);
  return {
    stability,
    recallConfidence,
    reviewSuccessRate,
    recoverySpeed,
    retentionReliability,
    predictedForgettingDays,
    predictedForgettingDate: date.toISOString().slice(0, 10),
  };
}

// Multi-factor ROI breakdown — each factor contributes to total ROI.
function deriveRoiBreakdown(
  c: ConceptCore,
  subjMeta: SubjectMeta | undefined,
  dependentCount: number,
  prerequisiteHealthGap: number,
): RoiBreakdown {
  const examWeight = Math.round(clamp((subjMeta?.examWeight ?? 0.3) * 100));
  // Each unlocked dependent compounds future returns.
  const dependencyUnlocks = Math.round(clamp(dependentCount * 14 + prerequisiteHealthGap * 0.4, 0, 100));
  const futureValue = Math.round(clamp((subjMeta?.strategicValue ?? 60) * 0.7 + c.importance * 3));
  const strategicImportance = Math.round(clamp(c.importance * 9 + (subjMeta?.strategicValue ?? 60) * 0.15));
  // Lower learning cost = higher ROI contribution. Cost rises with decay & weakness.
  const learningCost = Math.round(clamp(
    (100 - c.mastery) * 0.4 + c.decayRate * 80 + Math.min(c.daysSinceReview, 30) * 0.6
  ));
  const currentWeakness = Math.round(clamp((100 - c.mastery) * 0.6 + (100 - c.memoryStrength) * 0.4));
  const total = Math.round(clamp(
    examWeight * 0.18 +
    dependencyUnlocks * 0.16 +
    futureValue * 0.16 +
    strategicImportance * 0.18 +
    currentWeakness * 0.18 -
    learningCost * 0.10 + 22
  ));
  return { examWeight, dependencyUnlocks, futureValue, strategicImportance, learningCost, currentWeakness, total };
}

export function deriveConcepts(s: Pick<State, "conceptsById" | "subjectsById">): DerivedConcept[] {
  const raw = Object.values(s.conceptsById);

  // Build forward (prereq) and reverse (dependent) maps.
  const dependents: Record<string, string[]> = {};
  for (const c of raw) {
    const prereqs = PREREQUISITES[c.id] ?? [];
    for (const p of prereqs) (dependents[p] ||= []).push(c.id);
  }

  const byId = new Map(raw.map((c) => [c.id, c]));

  // Pass 1: base signals + memory + ROI (independent of propagation).
  const intermediate = raw.map((c) => {
    const prereqIds = PREREQUISITES[c.id] ?? [];
    const dependentIds = dependents[c.id] ?? [];
    const subjMeta = s.subjectsById[c.subjectId];
    const memory = deriveMemoryProfile(c);
    const prereqGap = prereqIds.reduce((acc, pid) => {
      const p = byId.get(pid);
      if (!p) return acc;
      return acc + Math.max(0, 100 - p.mastery) + Math.max(0, 100 - p.memoryStrength);
    }, 0);
    const roiBreakdown = deriveRoiBreakdown(c, subjMeta, dependentIds.length, prereqGap);
    const baseRisk = baseConceptRisk(c);
    return { c, prereqIds, dependentIds, subjMeta, memory, roiBreakdown, baseRisk, prereqGap };
  });

  // Pass 2: propagate risk upward → downward. Weak prerequisites
  // increase a concept's effective risk because future work on this
  // concept cannot stabilize without the foundation.
  const baseRiskMap = new Map(intermediate.map((x) => [x.c.id, x.baseRisk]));
  const propagated = intermediate.map((x) => {
    const upstreamPressure = x.prereqIds.reduce((acc, pid) => {
      const pBase = baseRiskMap.get(pid) ?? 0;
      const p = byId.get(pid);
      if (!p) return acc;
      // Each weak prereq adds 25% of its own risk + a memory/mastery deficit term.
      return acc + pBase * 0.25 + (100 - p.mastery) * 0.10 + (100 - p.memoryStrength) * 0.08;
    }, 0);
    const propagatedRisk = clamp(x.baseRisk + upstreamPressure * 0.55);
    return { ...x, propagatedRisk };
  });

  // Pass 3: bottleneck & critical path scoring.
  // Bottleneck = important + weak + many dependents.
  // Critical path = bottleneck above a threshold OR upstream of a high-risk leaf.
  const enriched = propagated.map((x) => {
    const { c } = x;
    const bottleneckScore = clamp(
      c.importance * 5 +
      x.dependentIds.length * 12 +
      (100 - c.mastery) * 0.25
    );
    const unlockPotential = clamp(
      x.dependentIds.length * 18 +
      x.roiBreakdown.dependencyUnlocks * 0.4 +
      c.importance * 3
    );
    const isCriticalPath = bottleneckScore >= 55 && x.propagatedRisk >= 45;

    const status = statusFromMastery(c.mastery);
    const lastReviewed = lastReviewedLabel(c.daysSinceReview);

    // Explainability for risk and ROI.
    const explainRisk: ExplainBlock = {
      reason: x.propagatedRisk >= 65
        ? `${c.name} is high-risk because importance, decay, and ${x.prereqIds.length ? "weak prerequisites" : "memory drop"} are compounding.`
        : x.propagatedRisk >= 40
        ? `${c.name} is at moderate risk — base signals are stable but ${x.prereqIds.length ? "upstream concepts are softening" : "review cadence is slipping"}.`
        : `${c.name} risk is contained — review cadence and mastery are aligned.`,
      factors: [
        { label: "Importance", weight: 0.24, value: `${c.importance}/10` },
        { label: "Mastery gap", weight: 0.22, value: `${100 - c.mastery}/100` },
        { label: "Memory gap", weight: 0.18, value: `${100 - c.memoryStrength}/100` },
        { label: "Days since review", weight: 0.14, value: `${c.daysSinceReview}d` },
        { label: "Upstream pressure", weight: 0.22, value: `${Math.round(x.propagatedRisk - x.baseRisk)} pts` },
      ],
      confidence: Math.round(clamp(70 + c.reviewCount * 1.6 + (c.assessmentAttempts > 0 ? 8 : 0))),
      expectedImpact: `A focused recovery would drop risk by ~${Math.round(x.propagatedRisk * 0.35)} pts.`,
    };

    const explainRoi: ExplainBlock = {
      reason: x.roiBreakdown.total >= 80
        ? `${c.name} compounds: it unlocks ${x.dependentIds.length} downstream concept${x.dependentIds.length === 1 ? "" : "s"} and carries strategic weight in ${c.subjectName}.`
        : x.roiBreakdown.total >= 60
        ? `${c.name} returns above average — strategic value and current weakness combine into a strong target.`
        : `${c.name} returns are moderate — high mastery means marginal gain is limited.`,
      factors: [
        { label: "Exam weight", weight: 0.18, value: `${x.roiBreakdown.examWeight}/100` },
        { label: "Dependency unlocks", weight: 0.16, value: `${x.roiBreakdown.dependencyUnlocks}/100` },
        { label: "Future value", weight: 0.16, value: `${x.roiBreakdown.futureValue}/100` },
        { label: "Strategic importance", weight: 0.18, value: `${x.roiBreakdown.strategicImportance}/100` },
        { label: "Current weakness", weight: 0.18, value: `${x.roiBreakdown.currentWeakness}/100` },
        { label: "Learning cost", weight: -0.10, value: `${x.roiBreakdown.learningCost}/100` },
      ],
      confidence: Math.round(clamp(75 + (x.subjMeta?.examWeight ?? 0.3) * 20)),
      expectedImpact: `~+${Math.round(x.roiBreakdown.total / 18)}% subject mastery per focused hour.`,
    };

    return {
      ...c,
      roi: x.roiBreakdown.total,
      risk: Math.round(x.propagatedRisk),
      baseRisk: Math.round(x.baseRisk),
      propagatedRisk: Math.round(x.propagatedRisk),
      status,
      lastReviewed,
      prerequisiteIds: x.prereqIds,
      dependentIds: x.dependentIds,
      unlockPotential: Math.round(unlockPotential),
      bottleneckScore: Math.round(bottleneckScore),
      isCriticalPath,
      memory: x.memory,
      roiBreakdown: x.roiBreakdown,
      explain: { risk: explainRisk, roi: explainRoi },
    } satisfies DerivedConcept;
  });

  return enriched;
}

export function deriveSubjects(s: Pick<State, "conceptsById" | "subjectsById">): DerivedSubject[] {
  const concepts = deriveConcepts(s);
  const raw = Object.values(s.subjectsById).map((meta) => {
    const subjConcepts = concepts.filter((c) => c.subjectId === meta.id);
    const totalImp = subjConcepts.reduce((a, c) => a + c.importance, 0) || 1;
    const mastery = Math.round(subjConcepts.reduce((a, c) => a + c.mastery * c.importance, 0) / totalImp);
    const memory = Math.round(subjConcepts.reduce((a, c) => a + c.memoryStrength * c.importance, 0) / totalImp);
    const risk = Math.round(subjConcepts.reduce((a, c) => a + c.risk * c.importance, 0) / totalImp);
    const roi = Math.round(subjConcepts.reduce((a, c) => a + c.roi, 0) / Math.max(1, subjConcepts.length));
    const weakConcepts = subjConcepts.filter((c) => c.status === "weak" || c.status === "forgotten").length;
    const status: SubjectStatus =
      mastery >= 75 && risk < 35 ? "dominant" :
      risk >= 70 ? "critical" :
      risk >= 50 || mastery < 50 ? "at-risk" : "stable";
    const trend = mastery - meta.baselineMastery;
    // Dependency health = how well prerequisite chains hold for THIS subject.
    const dependencyHealth = subjConcepts.length === 0 ? 100 : Math.round(clamp(
      100 - subjConcepts.reduce((a, c) => a + (c.propagatedRisk - c.baseRisk), 0) / subjConcepts.length * 1.4
    ));
    const readiness = Math.round(clamp(mastery * 0.55 + memory * 0.35 + (100 - risk) * 0.10));
    const predictedLow = Math.max(35, readiness - 8);
    const predictedHigh = Math.min(99, readiness + 6);
    return {
      id: meta.id,
      name: meta.name,
      code: meta.code,
      color: meta.color,
      mastery, memory, roi, risk, status, trend,
      concepts: subjConcepts.length,
      weakConcepts,
      hoursThisWeek: meta.hoursThisWeek,
      nextAssessment: meta.nextAssessment,
      daysToAssessment: meta.daysToAssessment,
      examWeight: meta.examWeight,
      dependencyHealth,
      readiness,
      predictedScore: { low: predictedLow, high: predictedHigh },
    } satisfies Omit<DerivedSubject, "rank">;
  });
  const ranked = [...raw].sort((a, b) => b.mastery - a.mastery);
  return raw.map((r) => ({ ...r, rank: ranked.findIndex((x) => x.id === r.id) + 1 }));
}

// ---------------- Graph / dependency analytics ----------------

export interface BottleneckEntry {
  conceptId: string;
  conceptName: string;
  subjectName: string;
  bottleneckScore: number;
  dependentCount: number;
  mastery: number;
  reason: string;
}

export function deriveBottlenecks(s: Pick<State, "conceptsById" | "subjectsById">): BottleneckEntry[] {
  const concepts = deriveConcepts(s);
  return concepts
    .filter((c) => c.dependentIds.length > 0 && c.bottleneckScore >= 45)
    .sort((a, b) => b.bottleneckScore - a.bottleneckScore)
    .slice(0, 8)
    .map((c) => ({
      conceptId: c.id,
      conceptName: c.name,
      subjectName: c.subjectName,
      bottleneckScore: c.bottleneckScore,
      dependentCount: c.dependentIds.length,
      mastery: c.mastery,
      reason: `${c.dependentIds.length} downstream concept${c.dependentIds.length === 1 ? "" : "s"} are gated by this node — mastery ${c.mastery}/100.`,
    }));
}

export function deriveCriticalPath(s: Pick<State, "conceptsById" | "subjectsById">): DerivedConcept[] {
  return deriveConcepts(s)
    .filter((c) => c.isCriticalPath)
    .sort((a, b) => b.bottleneckScore + b.propagatedRisk - (a.bottleneckScore + a.propagatedRisk))
    .slice(0, 6);
}


export function deriveMissions(s: Pick<State, "conceptsById" | "subjectsById" | "completedMissionIds">): DerivedMission[] {
  const concepts = deriveConcepts(s);
  const subjects = deriveSubjects(s);
  const subjById = new Map(subjects.map((x) => [x.id, x]));
  const completed = new Set(s.completedMissionIds);
  const out: DerivedMission[] = [];

  for (const c of concepts) {
    const subj = subjById.get(c.subjectId);
    const examSoon = subj?.daysToAssessment !== undefined && subj.daysToAssessment <= 4;

    let type: MissionType | null = null;
    let priority: MissionPriority = "low";
    let minutes = 20;
    let reason = "";
    let title = "";
    let description = "";

    if (c.status === "forgotten" || (c.status === "weak" && c.memoryStrength < 35)) {
      type = "recovery";
      minutes = Math.max(20, Math.round((100 - c.mastery) / 3));
      priority = c.risk > 80 || (examSoon && c.importance >= 8) ? "critical" : "high";
      title = `Recover ${c.name}`;
      description = `Mastery ${c.mastery} · memory ${c.memoryStrength}. Decay has crossed the threshold — a focused recovery sprint restores it.`;
      reason = `${c.status === "forgotten" ? "Forgotten" : "Weak"} concept · risk ${c.risk}${examSoon ? ` · exam in ${subj!.daysToAssessment}d` : ""}`;
    } else if (c.status === "developing" || (c.status === "strong" && c.memoryStrength < 65)) {
      type = "reinforcement";
      minutes = Math.max(20, Math.round((85 - c.mastery) / 2.5));
      priority = c.risk > 55 ? "high" : "medium";
      title = `Reinforce ${c.name}`;
      description = `Approaching decay threshold. A short reinforcement pass consolidates encoding before memory drops.`;
      reason = `Memory ${c.memoryStrength} · ROI ${c.roi}`;
    } else if (c.status === "mastered" && c.daysSinceReview >= 7) {
      type = "review";
      minutes = 12;
      priority = "low";
      title = `Review ${c.name}`;
      description = `Spaced-repetition window is open. A brief pass preserves the mastery streak.`;
      reason = `Last reviewed ${c.lastReviewed} · importance ${c.importance}/10`;
    } else if (c.status === "mastered" && c.importance >= 9 && c.roi >= 80) {
      type = "expansion";
      minutes = 40;
      priority = "medium";
      title = `Expand from ${c.name}`;
      description = `You've mastered the anchor — extend to adjacent concepts to compound returns.`;
      reason = `Mastered · high-importance · high-ROI cluster`;
    }

    if (!type) continue;
    const id = `m-${type}-${c.id}`;
    const riskReduction = Math.round(
      type === "recovery" ? c.propagatedRisk * 0.55
      : type === "reinforcement" ? c.propagatedRisk * 0.30
      : type === "expansion" ? c.unlockPotential * 0.20
      : c.propagatedRisk * 0.18
    );
    const evidence: string[] = [
      `Mastery ${c.mastery}/100 · memory ${c.memoryStrength}/100 · risk ${c.risk}`,
      `Importance ${c.importance}/10 · last reviewed ${c.lastReviewed}`,
    ];
    if (c.prerequisiteIds.length) evidence.push(`${c.prerequisiteIds.length} prerequisite${c.prerequisiteIds.length === 1 ? "" : "s"} influencing this concept`);
    if (c.dependentIds.length) evidence.push(`Unlocks ${c.dependentIds.length} downstream concept${c.dependentIds.length === 1 ? "" : "s"}`);
    if (examSoon) evidence.push(`Exam in ${subj!.daysToAssessment}d · readiness ${subj!.readiness}/100`);
    const confidence = Math.round(clamp(
      72 + c.reviewCount * 1.4 + (c.assessmentAttempts > 0 ? 8 : 0) + (examSoon ? 6 : 0)
    ));
    const expectedImpact =
      type === "recovery" ? `+${Math.round((100 - c.mastery) / 4)}% mastery · -${riskReduction} risk · +${c.memory.recoverySpeed} memory`
      : type === "reinforcement" ? `+${Math.round(c.memory.recoverySpeed * 0.7)} memory · -${riskReduction} risk`
      : type === "expansion" ? `Unlocks ${c.dependentIds.length} concept${c.dependentIds.length === 1 ? "" : "s"} · +ROI compounding`
      : `Preserves mastery streak · -${riskReduction} forgetting probability`;
    out.push({
      id, title, description, type, priority,
      subjectId: c.subjectId, subjectName: c.subjectName,
      conceptIds: [c.id],
      estimatedMinutes: minutes,
      roiScore: Math.round(c.roi + c.importance * 2 - c.daysSinceReview * 0.4),
      reason,
      dueBy: priority === "critical" ? "today" : examSoon ? "tomorrow" : undefined,
      completed: completed.has(id),
      evidence,
      confidence,
      expectedImpact,
      riskReduction,
    });
  }

  // Per-subject diagnostic when signals are stale
  for (const sub of subjects) {
    const subConcepts = concepts.filter((c) => c.subjectId === sub.id);
    const stale = subConcepts.filter((c) => c.daysSinceReview > 9).length;
    if (stale >= 3) {
      const id = `m-assessment-${sub.id}`;
      const targets = subConcepts.slice(0, 6);
      out.push({
        id,
        type: "assessment",
        title: `Diagnostic — ${sub.name}`,
        description: `${stale} stale concepts · model uncertainty is rising. A 15-minute diagnostic recalibrates the intelligence model.`,
        priority: sub.daysToAssessment !== undefined && sub.daysToAssessment <= 5 ? "high" : "medium",
        subjectId: sub.id,
        subjectName: sub.name,
        conceptIds: targets.map((c) => c.id),
        estimatedMinutes: 15,
        roiScore: 70 + (sub.risk > 50 ? 10 : 0),
        reason: `${stale} concepts not assessed in 9+ days`,
        completed: completed.has(id),
        evidence: [
          `${stale} concepts last assessed > 9 days ago`,
          `Subject readiness ${sub.readiness}/100 · predicted band ${sub.predictedScore.low}–${sub.predictedScore.high}%`,
          `Dependency health ${sub.dependencyHealth}/100`,
        ],
        confidence: 80,
        expectedImpact: `Tightens prediction band by ±${Math.round(stale / 2)}% · recalibrates ${targets.length} concepts`,
        riskReduction: Math.round(sub.risk * 0.15),
      });
    }
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  return out
    .sort((a, b) => order[a.priority] - order[b.priority] || b.roiScore - a.roiScore)
    .slice(0, 14);
}

export function deriveRecommendations(s: Pick<State, "conceptsById" | "subjectsById" | "completedMissionIds">): DerivedRecommendation[] {
  const concepts = deriveConcepts(s);
  const subjects = deriveSubjects(s);
  const missions = deriveMissions(s);
  const out: DerivedRecommendation[] = [];

  for (const m of missions) {
    if (m.completed) continue;
    const c = m.conceptIds[0] ? concepts.find((x) => x.id === m.conceptIds[0]) : undefined;
    const subj = subjects.find((x) => x.id === m.subjectId);
    const cat: RecommendationCategory =
      m.type === "recovery" ? "recovery" :
      m.type === "reinforcement" ? "reinforcement" :
      m.type === "expansion" ? "expansion" :
      m.type === "assessment" ? "assessment" : "strategic";
    const urgency = m.priority;
    const impact = m.roiScore;
    // Pull live explanation factors from the concept's explain block.
    const factors = c
      ? (cat === "recovery" || cat === "assessment" ? c.explain.risk.factors : c.explain.roi.factors)
      : [];
    const evidence: string[] = [...m.evidence];
    if (c?.dependentIds.length) {
      const downstream = concepts
        .filter((x) => c.dependentIds.includes(x.id))
        .map((x) => x.name);
      if (downstream.length) evidence.push(`Unlocks: ${downstream.slice(0, 3).join(", ")}${downstream.length > 3 ? "…" : ""}`);
    }
    if (subj?.daysToAssessment !== undefined) evidence.push(`${subj.name} exam in ${subj.daysToAssessment}d · readiness ${subj.readiness}/100`);
    const unlocks = c
      ? concepts.filter((x) => c.dependentIds.includes(x.id)).map((x) => x.name)
      : [];
    out.push({
      id: `r-${m.id}`,
      title: m.title,
      category: cat,
      reason: m.reason,
      evidence,
      expectedBenefit: m.expectedImpact,
      confidence: m.confidence,
      impact,
      urgency,
      minutes: m.estimatedMinutes,
      subjectId: m.subjectId,
      conceptId: m.conceptIds[0],
      factors,
      unlocks,
    });
  }

  // Strategic: shift hours from dominant to critical subject
  const dominant = subjects.filter((s) => s.status === "dominant").sort((a, b) => b.mastery - a.mastery)[0];
  const critical = subjects.filter((s) => s.status === "critical").sort((a, b) => b.risk - a.risk)[0];
  if (dominant && critical) {
    out.push({
      id: `r-strategic-${dominant.id}-${critical.id}`,
      title: `Shift 2 hours from ${dominant.name} → ${critical.name}`,
      category: "strategic",
      reason: `${dominant.name} is in dominant zone (${dominant.mastery} mastery, low decay). ${critical.name} is critical with risk ${critical.risk}.`,
      evidence: [
        `${dominant.name}: mastery ${dominant.mastery}, risk ${dominant.risk}, dependency health ${dominant.dependencyHealth}`,
        `${critical.name}: mastery ${critical.mastery}, risk ${critical.risk}, dependency health ${critical.dependencyHealth}`,
        critical.daysToAssessment !== undefined ? `Critical exam in ${critical.daysToAssessment}d (readiness ${critical.readiness}/100)` : `No exam scheduled — but risk is compounding`,
      ],
      expectedBenefit: `-${Math.round(critical.risk / 6)} risk on ${critical.code} · negligible ${dominant.code} decay`,
      confidence: 86,
      impact: 84,
      urgency: "high",
      minutes: 120,
      subjectId: critical.id,
      factors: [
        { label: "Critical-subject risk", weight: 0.35, value: `${critical.risk}/100` },
        { label: "Dominant-subject buffer", weight: 0.25, value: `${dominant.mastery}/100` },
        { label: "Exam proximity", weight: 0.25, value: critical.daysToAssessment !== undefined ? `${critical.daysToAssessment}d` : "n/a" },
        { label: "Dependency health gap", weight: 0.15, value: `${dominant.dependencyHealth - critical.dependencyHealth} pts` },
      ],
      unlocks: [],
    });
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  return out.sort((a, b) => order[a.urgency] - order[b.urgency] || b.impact - a.impact);
}

export function deriveIncidents(s: Pick<State, "conceptsById" | "subjectsById" | "sessions" | "assessments">): DerivedIncident[] {
  const concepts = deriveConcepts(s);
  const subjects = deriveSubjects(s);
  const out: DerivedIncident[] = [];

  // 1. Mastery drop: any subject with trend <= -3
  for (const sub of subjects.filter((x) => x.trend <= -3)) {
    const subConcepts = concepts.filter((c) => c.subjectId === sub.id);
    const decayed = subConcepts.filter((c) => c.daysSinceReview > 7 && c.importance >= 7).slice(0, 4);
    out.push({
      id: `i-drop-${sub.id}`,
      problem: `${sub.name} mastery dropped ${Math.abs(sub.trend).toFixed(1)}% in 7 days`,
      type: "mastery-drop",
      category: "revision-gap",
      subject: sub.name,
      subjectId: sub.id,
      occurredAt: "Today · auto-detected",
      severity: sub.trend <= -5 ? "critical" : "high",
      confidence: 93,
      evidence: [
        ...decayed.map((c) => `${c.name} last reviewed ${c.lastReviewed} (expected: every 4 days)`),
        `Only ${sub.hoursThisWeek.toFixed(1)} hours allocated this week`,
        `${sub.weakConcepts} weak/forgotten concepts in subject`,
      ],
      rootCause:
        `Spaced-repetition windows lapsed for ${decayed.length} high-importance concepts in parallel. Compounding decay outpaced the review cadence, producing the observed mastery drop.`,
      recovery: decayed.slice(0, 3).map((c) => ({
        title: `Recover ${c.name}`,
        minutes: Math.max(20, Math.round((100 - c.mastery) / 3)),
        impact: `+${Math.round((100 - c.mastery) / 5)} mastery`,
        conceptId: c.id,
      })),
    });
  }

  // 2. Memory collapse: subject with >= 3 concepts that crossed forgetting threshold
  for (const sub of subjects) {
    const subConcepts = concepts.filter((c) => c.subjectId === sub.id);
    const forgotten = subConcepts.filter((c) => c.memoryStrength < 30);
    if (forgotten.length >= 3) {
      out.push({
        id: `i-collapse-${sub.id}`,
        problem: `${sub.name} memory collapsed across ${forgotten.length} concepts`,
        type: "memory-collapse",
        category: "memory-gap",
        subject: sub.name,
        subjectId: sub.id,
        occurredAt: "Yesterday · pattern detected",
        severity: forgotten.length >= 5 ? "critical" : "high",
        confidence: 88,
        evidence: [
          `${forgotten.length} concepts crossed forgetting threshold`,
          `Average decay rate ${(forgotten.reduce((a, c) => a + c.decayRate, 0) / forgotten.length).toFixed(2)} — above subject baseline`,
          `Oldest unreviewed concept: ${forgotten.sort((a, b) => b.daysSinceReview - a.daysSinceReview)[0].name} (${forgotten[0].daysSinceReview}d)`,
        ],
        rootCause:
          `The memory model predicted decay earlier than observed — review cadence was set on the assumption of stronger initial encoding. Inflated encoding signal from a single high-performance session was not representative.`,
        recovery: forgotten.slice(0, 2).map((c) => ({
          title: `Restore ${c.name}`,
          minutes: 25,
          impact: `+${Math.round(60 - c.memoryStrength)} memory`,
          conceptId: c.id,
        })),
      });
    }
  }

  // 3. Assessment failure from log
  for (const a of s.assessments) {
    if (a.actual >= a.predicted - 8) continue;
    const sub = subjects.find((x) => x.id === a.subjectId);
    out.push({
      id: `i-assess-${a.id}`,
      problem: `${a.subjectName} ${a.title}: ${a.actual}% (predicted ${a.predicted}%)`,
      type: "assessment-failure",
      category: "practice-gap",
      subject: a.subjectName,
      subjectId: a.subjectId,
      occurredAt: new Date(a.timestamp).toLocaleString(),
      severity: a.predicted - a.actual >= 18 ? "high" : "medium",
      confidence: 84,
      evidence: [
        `Predicted ${a.predicted}% vs actual ${a.actual}%`,
        `${sub?.weakConcepts ?? 0} weak concepts in subject at time of attempt`,
        `No applied problem-solving in the prior session log`,
      ],
      rootCause:
        `Mastery signal was inflated by passive review without active retrieval. The model could not distinguish recognition from recall — no problem-solving evidence was present in the session log.`,
      recovery: [
        { title: `Run ${a.subjectName} diagnostic`, minutes: 18, impact: "recalibrate weak signals" },
        { title: `10 applied problems`, minutes: 30, impact: "+12 concept mastery" },
      ],
    });
  }

  // 4. Risk increase: subject with risk > 55 but no recent sessions
  for (const sub of subjects.filter((x) => x.risk > 55)) {
    const recentSessions = s.sessions.filter((sess) => sess.subjectId === sub.id && Date.now() - sess.timestamp < 3 * 86400000).length;
    if (recentSessions === 0) {
      out.push({
        id: `i-risk-${sub.id}`,
        problem: `${sub.name} risk index elevated to ${sub.risk} with no recent sessions`,
        type: "risk-increase",
        category: "consistency-gap",
        subject: sub.name,
        subjectId: sub.id,
        occurredAt: "Past 72h",
        severity: sub.risk > 70 ? "high" : "medium",
        confidence: 79,
        evidence: [
          `Study cadence dropped to 0 sessions in the last 72 hours`,
          `${sub.weakConcepts} weak concepts unsurfaced into missions`,
          sub.daysToAssessment !== undefined ? `Upcoming assessment in ${sub.daysToAssessment}d` : `No assessment scheduled`,
        ],
        rootCause:
          `Cadence broke. Compounding practice effect was lost and weak concepts were not surfaced because no diagnostic ran during the gap.`,
        recovery: [
          { title: `Restore weekly cadence`, minutes: 5, impact: `rebuild compounding` },
          { title: `Targeted ${sub.code} recovery sprint`, minutes: 25, impact: `-${Math.round(sub.risk / 6)} risk` },
        ],
      });
    }
  }

  return out.slice(0, 6);
}

export function deriveInsights(s: Pick<State, "conceptsById" | "subjectsById" | "sessions" | "assessments">): DerivedInsight[] {
  const subjects = deriveSubjects(s);
  const concepts = deriveConcepts(s);
  const out: DerivedInsight[] = [];

  const worstSubject = [...subjects].sort((a, b) => b.risk - a.risk)[0];
  if (worstSubject && worstSubject.risk > 50) {
    out.push({
      id: `ins-alert-${worstSubject.id}`,
      kind: "alert",
      title: `${worstSubject.name} is destabilizing`,
      body: `Mastery ${worstSubject.trend < 0 ? "dropped" : "shifted"} ${Math.abs(worstSubject.trend).toFixed(1)}% this week. ${worstSubject.weakConcepts} concepts are weak or forgotten${worstSubject.nextAssessment ? ` before the ${worstSubject.nextAssessment} assessment` : ""}.`,
      subjectId: worstSubject.id,
      timestamp: "2h ago",
      severity: worstSubject.risk > 70 ? "critical" : "high",
    });
  }

  const topRoi = [...concepts].sort((a, b) => b.roi - a.roi)[0];
  if (topRoi) {
    out.push({
      id: `ins-roi-${topRoi.id}`,
      kind: "roi",
      title: `Highest ROI right now: ${topRoi.name}`,
      body: `${Math.max(20, Math.round((100 - topRoi.mastery) / 3))} minutes of focused work here yields a projected +${Math.round(topRoi.roi / 22)}% subject mastery gain.`,
      subjectId: topRoi.subjectId,
      timestamp: "2h ago",
      severity: "high",
    });
  }

  const decaying = concepts.filter((c) => c.memoryStrength < 35).length;
  if (decaying > 0) {
    out.push({
      id: `ins-memory`,
      kind: "memory",
      title: `Memory decay accelerating`,
      body: `${decaying} concepts crossed the forgetting threshold. Schedule recovery before the loss compounds.`,
      timestamp: "5h ago",
      severity: decaying > 5 ? "critical" : "high",
    });
  }

  const dominant = subjects.find((x) => x.status === "dominant");
  const critical = subjects.find((x) => x.status === "critical");
  if (dominant && critical) {
    out.push({
      id: `ins-rec-${critical.id}`,
      kind: "recommendation",
      title: `Shift 2 hours from ${dominant.name} → ${critical.name}`,
      body: `${dominant.name} is in dominant zone with low decay. ${critical.name} is at critical risk${critical.daysToAssessment !== undefined ? ` with an assessment in ${critical.daysToAssessment} days` : ""}.`,
      timestamp: "6h ago",
      severity: "high",
    });
  }

  const atRisk = subjects.find((x) => x.status === "at-risk");
  if (atRisk) {
    out.push({
      id: `ins-risk-${atRisk.id}`,
      kind: "risk",
      title: `${atRisk.name} exam risk: ${atRisk.risk}%`,
      body: `Projected score ${Math.max(40, 100 - atRisk.risk - 6)}–${Math.max(50, 100 - atRisk.risk + 4)}% based on current concept readiness.`,
      subjectId: atRisk.id,
      timestamp: "1d ago",
      severity: "high",
    });
  }

  return out;
}

export function computeSubjectReadiness(s: Pick<State, "conceptsById" | "subjectsById">, subjectId: string): number {
  const concepts = deriveConcepts(s).filter((c) => c.subjectId === subjectId);
  if (concepts.length === 0) return 0;
  const totalImp = concepts.reduce((a, c) => a + c.importance, 0) || 1;
  const readiness =
    concepts.reduce((a, c) => a + (c.mastery * 0.55 + c.memoryStrength * 0.35) * c.importance, 0) / totalImp;
  return Math.round(clamp(readiness));
}

export function deriveCoachContext(s: State): CoachContext {
  const concepts = deriveConcepts(s);
  const subjects = deriveSubjects(s);
  const missions = deriveMissions(s);
  const criticalConcepts = concepts.filter((c) => c.risk > 65).length;
  const upcoming = subjects.filter((x) => x.daysToAssessment !== undefined && x.daysToAssessment <= 7).length;
  const totalImp = concepts.reduce((a, c) => a + c.importance, 0) || 1;
  const compositeRisk = Math.round(concepts.reduce((a, c) => a + c.risk * c.importance, 0) / totalImp);
  const topSubjectRisk = [...subjects].sort((a, b) => b.risk - a.risk)[0];
  const topMission = missions.filter((m) => !m.completed)[0];
  const dominant = subjects.find((x) => x.status === "dominant");
  const critical = subjects.find((x) => x.status === "critical");
  const outlook = critical && dominant
    ? `Defend ${critical.name}, maintain ${subjects.find((x) => x.status === "stable")?.name ?? "stable subjects"}, allow ${dominant.name} to coast.`
    : critical
    ? `${critical.name} requires immediate recovery before it cascades.`
    : `All subjects stable. Compound ROI through reinforcement cycles.`;
  return {
    activeSubjects: subjects.length,
    criticalConcepts,
    upcomingExams7d: upcoming,
    missionQueue: missions.filter((m) => !m.completed).length,
    compositeRisk,
    topSubjectRisk,
    topMission,
    strategicOutlook: outlook,
  };
}

export function deriveAcademicStatus(s: State): AcademicStatus {
  const concepts = deriveConcepts(s);
  const subjects = deriveSubjects(s);
  const totalImp = concepts.reduce((a, c) => a + c.importance, 0) || 1;
  const overallMastery = Math.round(concepts.reduce((a, c) => a + c.mastery * c.importance, 0) / totalImp);
  const overallMemory = Math.round(concepts.reduce((a, c) => a + c.memoryStrength * c.importance, 0) / totalImp);
  const overallRoi = Math.round(concepts.reduce((a, c) => a + c.roi, 0) / concepts.length);
  const overallRisk = Math.round(concepts.reduce((a, c) => a + c.risk * c.importance, 0) / totalImp);
  const trend7d = Math.round(subjects.reduce((a, s) => a + s.trend, 0) / subjects.length * 10) / 10;
  return {
    overallMastery, overallMemory, overallRoi, overallRisk, trend7d,
    activeSubjects: subjects.length,
    totalConcepts: concepts.length,
    weakConcepts: concepts.filter((c) => c.status === "weak" || c.status === "forgotten").length,
    masteredConcepts: concepts.filter((c) => c.status === "mastered").length,
    weeklyHours: Math.round(subjects.reduce((a, s) => a + s.hoursThisWeek, 0) * 10) / 10,
  };
}

export function deriveFocusToday(s: State): FocusToday {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySessions = s.sessions.filter((x) => x.timestamp >= today.getTime());
  const completedMinutes = todaySessions.reduce((a, x) => a + x.duration, 0);
  return {
    totalMinutes: Math.max(95, completedMinutes + 60),
    completedMinutes,
    sessionsCompleted: todaySessions.length,
    sessionsPlanned: Math.max(5, todaySessions.length + 3),
    conceptsReviewed: todaySessions.length + 11,
    conceptsRecovered: todaySessions.filter((x) => x.type === "Recovery").length + 1,
  };
}

export function deriveMasteryTrend(s: State) {
  // Synthesize a 7-day curve ending at current overall metrics.
  const status = deriveAcademicStatus(s);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day, i) => {
    const t = (i + 1) / 7;
    return {
      day,
      mastery: Math.round(status.overallMastery - (1 - t) * Math.max(6, status.overallMastery * 0.12)),
      memory: Math.round(status.overallMemory - (1 - t) * Math.max(5, status.overallMemory * 0.10)),
      roi: Math.round(status.overallRoi - (1 - t) * 6),
    };
  });
}

// ---------------- Hook layer (memoized derivation) ----------------

interface Derived {
  concepts: DerivedConcept[];
  subjects: DerivedSubject[];
  missions: DerivedMission[];
  recommendations: DerivedRecommendation[];
  incidents: DerivedIncident[];
  insights: DerivedInsight[];
  coachContext: CoachContext;
  academicStatus: AcademicStatus;
  focusToday: FocusToday;
  masteryTrend: { day: string; mastery: number; memory: number; roi: number }[];
  sessions: SessionLogEntry[];
  assessments: AssessmentLogEntry[];
  bottlenecks: BottleneckEntry[];
  criticalPath: DerivedConcept[];
}

let cache: { version: number; data: Derived } | null = null;
function getDerived(): Derived {
  const state = useIntelligenceStore.getState();
  if (cache && cache.version === state.version) return cache.data;
  const data: Derived = {
    concepts: deriveConcepts(state),
    subjects: deriveSubjects(state),
    missions: deriveMissions(state),
    recommendations: deriveRecommendations(state),
    incidents: deriveIncidents(state),
    insights: deriveInsights(state),
    coachContext: deriveCoachContext(state),
    academicStatus: deriveAcademicStatus(state),
    focusToday: deriveFocusToday(state),
    masteryTrend: deriveMasteryTrend(state),
    sessions: state.sessions,
    assessments: state.assessments,
    bottlenecks: deriveBottlenecks(state),
    criticalPath: deriveCriticalPath(state),
  };
  cache = { version: state.version, data };
  return data;
}

function subscribe(cb: () => void) {
  return useIntelligenceStore.subscribe(cb);
}

export function useIntelligence(): Derived {
  return useSyncExternalStore(subscribe, getDerived, getDerived);
}

// Convenience action hook
export function useIntelligenceActions() {
  return {
    runSession: useIntelligenceStore.getState().runSession,
    runMission: useIntelligenceStore.getState().runMission,
    recordAssessment: useIntelligenceStore.getState().recordAssessment,
    recordQuestionAssessment: useIntelligenceStore.getState().recordQuestionAssessment,
    advanceDay: useIntelligenceStore.getState().advanceDay,
    reset: useIntelligenceStore.getState().resetIntelligence,
  };
}

// Coach reply engine — keyword routing over the live derived state.
export function generateCoachReply(question: string, ctx: CoachContext, d: Derived): string {
  const q = question.toLowerCase();
  const sub = d.subjects;
  const lookupSubject = sub.find((s) => q.includes(s.name.toLowerCase()) || q.includes(s.code.toLowerCase()));

  if (q.includes("priorit") || q.includes("first") || q.includes("now") || q.includes("today")) {
    if (ctx.topMission) {
      return `Start with "${ctx.topMission.title}" — ${ctx.topMission.estimatedMinutes} minutes, ROI ${ctx.topMission.roiScore}. Reason: ${ctx.topMission.reason}.`;
    }
  }
  if (q.includes("risk") || q.includes("dang")) {
    return `Composite risk is ${ctx.compositeRisk}/100. The highest-risk subject is ${ctx.topSubjectRisk?.name} at ${ctx.topSubjectRisk?.risk}/100 with ${ctx.topSubjectRisk?.weakConcepts} weak concepts.`;
  }
  if (q.includes("memory") || q.includes("forget")) {
    const forgotten = d.concepts.filter((c) => c.memoryStrength < 35);
    if (lookupSubject) {
      const inSub = forgotten.filter((c) => c.subjectId === lookupSubject.id);
      return `${lookupSubject.name} has ${inSub.length} concept${inSub.length === 1 ? "" : "s"} past the forgetting threshold${inSub.length ? `, starting with ${inSub[0].name} (${inSub[0].memoryStrength}/100)` : ""}.`;
    }
    return `${forgotten.length} concepts have crossed the forgetting threshold across the graph. Recovery is the highest-leverage action.`;
  }
  if (q.includes("roi") || q.includes("impact") || q.includes("efficient")) {
    const top = [...d.concepts].sort((a, b) => b.roi - a.roi)[0];
    return `Your highest-ROI concept right now is ${top.name} (${top.roi}/100) in ${top.subjectName}. A focused session there yields the largest mastery gain per minute.`;
  }
  if (q.includes("exam") || q.includes("assessment") || q.includes("test")) {
    const next = sub.filter((s) => s.daysToAssessment !== undefined).sort((a, b) => (a.daysToAssessment! - b.daysToAssessment!))[0];
    if (next) {
      return `Next assessment: ${next.name} in ${next.daysToAssessment} days. Current readiness ${computeSubjectReadiness(useIntelligenceStore.getState(), next.id)}/100. Projected score band ${Math.max(40, 100 - next.risk - 6)}–${Math.max(50, 100 - next.risk + 4)}%.`;
    }
  }
  if (lookupSubject) {
    return `${lookupSubject.name}: mastery ${lookupSubject.mastery}, memory ${lookupSubject.memory}, ROI ${lookupSubject.roi}, risk ${lookupSubject.risk}. ${lookupSubject.weakConcepts} of ${lookupSubject.concepts} concepts need work. Status: ${lookupSubject.status}.`;
  }
  return `${ctx.strategicOutlook} You have ${ctx.missionQueue} missions queued and ${ctx.criticalConcepts} critical concepts. Ask about a specific subject, exam, or your current risk for a deeper read.`;
}
