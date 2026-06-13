// Scholaris Predictive & Adaptive Intelligence Layer.
// ====================================================
// This module evolves Scholaris from a reactive intelligence system into an
// adaptive, predictive Academic Operating System. It is PURELY DERIVED from
// the existing intelligence store — it never mutates state and never touches
// the database schema, auth, or onboarding.
//
//   Phase 1 — Adaptive Learning Model  (learns from behaviour)
//   Phase 2 — Predictive Intelligence  (forecasts the future)
//   Phase 3 — Academic Digital Twin    (simulates trajectories / what-if)
//   Phase 4 — Academic Strategist AI   (strategic guidance)
//   Phase 5 — Intelligence Explainability (every prediction is transparent)
//
// Everything below reuses the existing derivation primitives so predictions
// stay consistent with the rest of the engine.

import { useSyncExternalStore } from "react";
import {
  useIntelligenceStore,
  deriveConcepts,
  deriveSubjects,
  deriveMissions,
  deriveBottlenecks,
  type ConceptCore,
  type SubjectMeta,
  type SessionLogEntry,
  type AssessmentLogEntry,
  type DerivedConcept,
  type DerivedSubject,
  type DerivedMission,
} from "./intelligence";

// ---------------- Shared primitives ----------------

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n);

export interface CoreState {
  conceptsById: Record<string, ConceptCore>;
  subjectsById: Record<string, SubjectMeta>;
  sessions: SessionLogEntry[];
  assessments: AssessmentLogEntry[];
  completedMissionIds: string[];
}

// A reusable explainability block. No prediction is a black box: every output
// carries a reason, the evidence behind it, a confidence and contributing
// factors, plus a projected impact.
export interface Explanation {
  reason: string;
  evidence: string[];
  confidence: number; // 0–100
  factors: { label: string; weight: number; value: string }[];
  projectedImpact: string;
}

// ===================================================================
// PHASE 1 — ADAPTIVE LEARNING MODEL
// ===================================================================

export interface StudentLearningModel {
  // Behavioural profile derived from historical evidence.
  sessionCompletionRate: number;   // 0–100
  sessionEffectiveness: number;    // 0–100 (mastery gained per session vs ideal)
  recallAccuracy: number;          // 0–100
  recoverySuccess: number;         // 0–100
  assessmentPerformance: number;   // 0–100
  learningVelocity: number;        // mastery pts gained per study hour
  masteryGrowth: number;           // total mastery pts gained from sessions
  decaySpeed: number;              // 0–100 (higher = forgets faster)
  // Higher-order traits.
  decayResistance: number;         // 0–100 (inverse of decay speed, personalised)
  consistency: number;             // 0–100 (cadence regularity)
  dataPoints: number;              // evidence volume
  profileConfidence: number;       // 0–100
  archetype: string;               // human-readable learner archetype
  explanation: Explanation;
}

export function deriveStudentModel(s: CoreState): StudentLearningModel {
  const concepts = Object.values(s.conceptsById);
  const sessions = s.sessions;
  const assessments = s.assessments;

  // ---- Session effectiveness & velocity ----
  const totalGain = sessions.reduce((a, x) => a + x.gain, 0);
  const totalMinutes = sessions.reduce((a, x) => a + x.duration, 0);
  const learningVelocity = totalMinutes > 0 ? round((totalGain / totalMinutes) * 60) : 0;
  const sessionEffectiveness = sessions.length
    ? round(clamp((totalGain / sessions.length) / 18 * 100))
    : 50;

  // ---- Completion rate ----
  // Evidence: completed missions vs. opportunities (completed + currently weak).
  const weakNow = concepts.filter((c) => c.mastery < 50).length;
  const completed = s.completedMissionIds.length;
  const sessionCompletionRate = round(clamp(
    (completed + sessions.length) > 0
      ? ((completed + sessions.length) / (completed + sessions.length + weakNow)) * 100
      : 55,
  ));

  // ---- Recall accuracy (from assessment + recall counters) ----
  const recalls = concepts.reduce(
    (a, c) => ({ ok: a.ok + c.successfulRecalls, no: a.no + c.failedRecalls }),
    { ok: 0, no: 0 },
  );
  const totalRecalls = recalls.ok + recalls.no;
  const recallAccuracy = totalRecalls > 0
    ? round((recalls.ok / totalRecalls) * 100)
    : round(clamp(concepts.reduce((a, c) => a + c.memoryStrength, 0) / Math.max(1, concepts.length)));

  // ---- Recovery success (Recovery-type sessions outcome) ----
  const recoverySessions = sessions.filter((x) => x.type === "Recovery");
  const recoverySuccess = recoverySessions.length
    ? round(clamp((recoverySessions.reduce((a, x) => a + x.gain, 0) / recoverySessions.length) / 22 * 100))
    : 50;

  // ---- Assessment performance & calibration ----
  const assessmentPerformance = assessments.length
    ? round(assessments.reduce((a, x) => a + x.actual, 0) / assessments.length)
    : recallAccuracy;

  // ---- Decay speed (population-weighted) ----
  const avgDecay = concepts.length
    ? concepts.reduce((a, c) => a + c.decayRate, 0) / concepts.length
    : 0.12;
  const decaySpeed = round(clamp(avgDecay / 0.4 * 100));
  // Personalised decay resistance: students who recall well & recover well
  // forget slower than their raw decay rate suggests.
  const decayResistance = round(clamp(
    (100 - decaySpeed) * 0.5 + recallAccuracy * 0.3 + recoverySuccess * 0.2,
  ));

  // ---- Consistency / cadence ----
  const recentDays = new Set(
    sessions
      .filter((x) => Date.now() - x.timestamp < 14 * 86400000)
      .map((x) => Math.floor(x.timestamp / 86400000)),
  ).size;
  const consistency = round(clamp((recentDays / 14) * 100 + (sessions.length > 6 ? 12 : 0)));

  const masteryGrowth = totalGain;
  const dataPoints = sessions.length + assessments.length + totalRecalls;
  const profileConfidence = round(clamp(35 + dataPoints * 3.2));

  // ---- Archetype classification ----
  let archetype = "Calibrating learner";
  if (dataPoints >= 4) {
    if (recallAccuracy >= 70 && decayResistance >= 65) archetype = "Durable retainer";
    else if (learningVelocity >= 25 && sessionEffectiveness >= 65) archetype = "Fast acquirer";
    else if (recoverySuccess >= 65 && sessionCompletionRate >= 60) archetype = "Resilient recoverer";
    else if (decaySpeed >= 60) archetype = "Rapid forgetter — needs cadence";
    else if (consistency < 35) archetype = "Inconsistent — momentum at risk";
    else archetype = "Steady developer";
  }

  const explanation: Explanation = {
    reason: dataPoints >= 4
      ? `Behavioural profile built from ${sessions.length} session${sessions.length === 1 ? "" : "s"}, ${assessments.length} assessment${assessments.length === 1 ? "" : "s"} and ${totalRecalls} recall events. You learn ~${learningVelocity} mastery pts/hour with ${recallAccuracy}% recall accuracy.`
      : `Profile is still calibrating — only ${dataPoints} behavioural data point${dataPoints === 1 ? "" : "s"} so far. Predictions blend evidence with population priors until more history accumulates.`,
    evidence: [
      `Learning velocity ${learningVelocity} mastery pts/hour (${totalGain} pts over ${totalMinutes} min)`,
      `Recall accuracy ${recallAccuracy}% across ${totalRecalls} recall events`,
      `Recovery success ${recoverySuccess}% over ${recoverySessions.length} recovery session${recoverySessions.length === 1 ? "" : "s"}`,
      `Decay speed ${decaySpeed}/100 → personalised decay resistance ${decayResistance}/100`,
    ],
    confidence: profileConfidence,
    factors: [
      { label: "Recall accuracy", weight: 0.28, value: `${recallAccuracy}/100` },
      { label: "Session effectiveness", weight: 0.22, value: `${sessionEffectiveness}/100` },
      { label: "Decay resistance", weight: 0.2, value: `${decayResistance}/100` },
      { label: "Recovery success", weight: 0.16, value: `${recoverySuccess}/100` },
      { label: "Consistency", weight: 0.14, value: `${consistency}/100` },
    ],
    projectedImpact: `Profile drives every forecast — personalising decay, recovery and velocity per student rather than using fixed assumptions.`,
  };

  return {
    sessionCompletionRate,
    sessionEffectiveness,
    recallAccuracy,
    recoverySuccess,
    assessmentPerformance,
    learningVelocity,
    masteryGrowth,
    decaySpeed,
    decayResistance,
    consistency,
    dataPoints,
    profileConfidence,
    archetype,
    explanation,
  };
}

// ---------------- Personal Memory Model ----------------
// Different students forget differently. Replace fixed assumptions with a
// personalised forgetting model per concept.

export interface PersonalMemoryModel {
  averageRetentionDays: number;
  recallReliability: number;   // 0–100
  memoryStability: number;     // 0–100
  recoverySpeed: number;       // mastery pts per recovery
  decayAcceleration: number;   // 0–100
  decayResistance: number;     // 0–100
}

export interface ConceptForecast {
  conceptId: string;
  conceptName: string;
  subjectName: string;
  importance: number;
  memoryStrength: number;
  predictedForgettingDays: number;
  predictedForgettingDate: string;
  memoryConfidence: number;     // 0–100
  retentionConfidence: number;  // 0–100
  recoveryProbability: number;  // 0–100
  personalDecay: number;        // effective per-day decay
}

// Personalised effective decay for a concept given the student's model.
function effectiveDecay(c: ConceptCore, model: StudentLearningModel): number {
  // Population decay scaled by the student's resistance and the concept's own
  // recall track-record. Strong recallers slow their decay; weak recall on a
  // concept accelerates it.
  const totalRecalls = c.successfulRecalls + c.failedRecalls;
  const conceptRecall = totalRecalls > 0 ? c.successfulRecalls / totalRecalls : 0.6;
  const resistanceMul = 1.3 - (model.decayResistance / 100) * 0.6; // 0.7–1.3
  const conceptMul = 1.25 - conceptRecall * 0.5;                   // 0.75–1.25
  return Math.max(0.02, c.decayRate * resistanceMul * conceptMul);
}

export function derivePersonalMemoryModel(s: CoreState, model: StudentLearningModel): PersonalMemoryModel {
  const concepts = Object.values(s.conceptsById);
  if (concepts.length === 0) {
    return { averageRetentionDays: 0, recallReliability: 0, memoryStability: 0, recoverySpeed: 0, decayAcceleration: 0, decayResistance: 0 };
  }
  const retentionDays = concepts.map((c) => {
    const d = effectiveDecay(c, model);
    const safe = Math.max(31, c.memoryStrength);
    return Math.log(safe / 30) / d;
  });
  const averageRetentionDays = round(retentionDays.reduce((a, x) => a + x, 0) / retentionDays.length);
  const memoryStability = round(clamp(concepts.reduce((a, c) => a + c.memoryStrength, 0) / concepts.length));
  return {
    averageRetentionDays,
    recallReliability: model.recallAccuracy,
    memoryStability,
    recoverySpeed: model.recoverySuccess > 0 ? round(8 + model.recoverySuccess / 8) : 12,
    decayAcceleration: model.decaySpeed,
    decayResistance: model.decayResistance,
  };
}

export function deriveConceptForecasts(s: CoreState, model: StudentLearningModel): ConceptForecast[] {
  const concepts = Object.values(s.conceptsById);
  return concepts
    .map((c) => {
      const d = effectiveDecay(c, model);
      const safe = Math.max(31, c.memoryStrength);
      const predictedForgettingDays = Math.max(0, round(Math.log(safe / 30) / d));
      const date = new Date(Date.now() + predictedForgettingDays * 86400000);
      const totalRecalls = c.successfulRecalls + c.failedRecalls;
      const conceptRecall = totalRecalls > 0 ? round((c.successfulRecalls / totalRecalls) * 100) : c.memoryStrength;
      const memoryConfidence = round(clamp(c.memoryStrength * 0.6 + conceptRecall * 0.4));
      const retentionConfidence = round(clamp(memoryConfidence * 0.5 + model.decayResistance * 0.5));
      const recoveryProbability = round(clamp(
        50 + model.recoverySuccess * 0.3 + (100 - c.mastery) * 0.1 - d * 60,
      ));
      return {
        conceptId: c.id,
        conceptName: c.name,
        subjectName: c.subjectName,
        importance: c.importance,
        memoryStrength: c.memoryStrength,
        predictedForgettingDays,
        predictedForgettingDate: date.toISOString().slice(0, 10),
        memoryConfidence,
        retentionConfidence,
        recoveryProbability,
        personalDecay: Math.round(d * 1000) / 1000,
      };
    })
    .sort((a, b) => a.predictedForgettingDays - b.predictedForgettingDays);
}

// ---------------- Session Effectiveness Engine ----------------

export interface SessionMethodStat {
  method: SessionLogEntry["type"];
  count: number;
  avgMasteryGain: number;
  avgRetentionGain: number; // modelled
  recoverySuccess: number;  // 0–100, relevant for recovery
  avgRoi: number;           // gain per minute, scaled
  effectiveness: number;    // 0–100 blended
}

export interface SessionEffectivenessReport {
  methods: SessionMethodStat[];
  bestMethod?: SessionMethodStat;
  recommendation: string;
  explanation: Explanation;
}

export function deriveSessionEffectiveness(s: CoreState): SessionEffectivenessReport {
  const types: SessionLogEntry["type"][] = ["Recovery", "Reinforcement", "Review", "Expansion", "Diagnostic"];
  const methods: SessionMethodStat[] = types.map((method) => {
    const ms = s.sessions.filter((x) => x.type === method);
    const count = ms.length;
    const avgGain = count ? ms.reduce((a, x) => a + x.gain, 0) / count : 0;
    const avgMin = count ? ms.reduce((a, x) => a + x.duration, 0) / count : 20;
    const avgRoi = round(clamp((avgGain / Math.max(1, avgMin)) * 100, 0, 100));
    const avgRetentionGain = round(clamp(avgGain * 1.4));
    const recoverySuccess = round(clamp(avgGain / 22 * 100));
    const effectiveness = count ? round(clamp(avgGain / 22 * 60 + avgRoi * 0.4)) : 0;
    return { method, count, avgMasteryGain: round(avgGain), avgRetentionGain, recoverySuccess, avgRoi, effectiveness };
  });
  const observed = methods.filter((m) => m.count > 0);
  const bestMethod = [...observed].sort((a, b) => b.effectiveness - a.effectiveness)[0];
  const recommendation = bestMethod
    ? `${bestMethod.method} sessions work best for you — averaging +${bestMethod.avgMasteryGain} mastery (effectiveness ${bestMethod.effectiveness}/100). Prefer them when time is limited.`
    : `No session history yet — run a few missions and the engine will learn which study method works best for you.`;
  return {
    methods,
    bestMethod,
    recommendation,
    explanation: {
      reason: recommendation,
      evidence: observed.map((m) => `${m.method}: ${m.count} session${m.count === 1 ? "" : "s"}, +${m.avgMasteryGain} avg mastery, ROI ${m.avgRoi}/100`),
      confidence: round(clamp(40 + observed.reduce((a, m) => a + m.count, 0) * 6)),
      factors: observed.map((m) => ({ label: m.method, weight: 1 / Math.max(1, observed.length), value: `${m.effectiveness}/100` })),
      projectedImpact: bestMethod ? `Routing time to ${bestMethod.method} maximises mastery-per-minute.` : "Insufficient evidence.",
    },
  };
}

// ---------------- Learning Velocity Engine ----------------

export interface SubjectVelocity {
  subjectId: string;
  subjectName: string;
  learningVelocity: number; // mastery pts/hour
  masteryVelocity: number;  // recent mastery trend pts/week
  recoveryVelocity: number; // recovered concepts/week
  memoryVelocity: number;   // memory pts/hour
  acquisitionSpeed: number; // concepts moved out of weak/week
}

export function deriveLearningVelocity(s: CoreState): SubjectVelocity[] {
  const subjects = deriveSubjects(s);
  const weekAgo = Date.now() - 7 * 86400000;
  return subjects.map((sub) => {
    const ss = s.sessions.filter((x) => x.subjectId === sub.id);
    const recent = ss.filter((x) => x.timestamp >= weekAgo);
    const gain = ss.reduce((a, x) => a + x.gain, 0);
    const minutes = ss.reduce((a, x) => a + x.duration, 0);
    const learningVelocity = minutes > 0 ? round((gain / minutes) * 60) : 0;
    const recoveryCount = recent.filter((x) => x.type === "Recovery").length;
    return {
      subjectId: sub.id,
      subjectName: sub.name,
      learningVelocity,
      masteryVelocity: round(sub.trend),
      recoveryVelocity: recoveryCount,
      memoryVelocity: round(learningVelocity * 1.2),
      acquisitionSpeed: recent.length,
    };
  });
}

// ===================================================================
// PHASE 2 — PREDICTIVE INTELLIGENCE (pure projection helpers)
// ===================================================================

// Pure, non-mutating decay of a concept over `days`, personalised by the model.
function decayConceptPure(c: ConceptCore, days: number, model: StudentLearningModel): ConceptCore {
  const d = effectiveDecay(c, model);
  const mem = Math.max(4, round(c.memoryStrength * Math.exp(-d * days)));
  // Mastery erodes slowly as memory collapses well below threshold.
  const masteryDrift = mem < 25 ? Math.min(c.mastery, round((25 - mem) * 0.3)) : 0;
  return {
    ...c,
    memoryStrength: mem,
    mastery: clamp(c.mastery - masteryDrift),
    daysSinceReview: c.daysSinceReview + days,
  };
}

// Pure session application (mirrors store.runSession math).
function applySessionPure(c: ConceptCore, type: SessionLogEntry["type"], minutes = 25): ConceptCore {
  const baseGain =
    type === "Recovery" ? 22 :
    type === "Reinforcement" ? 12 :
    type === "Expansion" ? 8 :
    type === "Diagnostic" ? 5 : 6;
  const room = Math.max(0, 100 - c.mastery);
  const gain = Math.min(round(baseGain * (0.6 + minutes / 40) * (room / 100 + 0.4)), Math.max(2, room));
  return {
    ...c,
    mastery: Math.min(100, c.mastery + gain),
    memoryStrength: Math.min(100, Math.max(c.memoryStrength + 18, 75)),
    reviewCount: c.reviewCount + 1,
    daysSinceReview: 0,
  };
}

export interface ProjectionOptions {
  days: number;
  model: StudentLearningModel;
  runMissionConceptIds?: Set<string>;       // concepts touched by completed missions
  missionSessionType?: SessionLogEntry["type"];
  extraReinforceCount?: number;             // extra weak concepts to reinforce
  extraReinforceType?: SessionLogEntry["type"];
}

// Build a projected snapshot (conceptsById + subjectsById) without mutating store.
function projectState(s: CoreState, opts: ProjectionOptions): Pick<CoreState, "conceptsById" | "subjectsById"> {
  const { days, model } = opts;
  let concepts: Record<string, ConceptCore> = { ...s.conceptsById };

  // 1) Apply mission work "today".
  if (opts.runMissionConceptIds && opts.runMissionConceptIds.size) {
    for (const id of opts.runMissionConceptIds) {
      if (concepts[id]) concepts[id] = applySessionPure(concepts[id], opts.missionSessionType ?? "Recovery");
    }
  }

  // 2) Extra reinforcement on the weakest remaining concepts (high-performance mode).
  if (opts.extraReinforceCount && opts.extraReinforceCount > 0) {
    const weakest = Object.values(concepts)
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, opts.extraReinforceCount);
    for (const c of weakest) {
      concepts[c.id] = applySessionPure(concepts[c.id], opts.extraReinforceType ?? "Reinforcement");
    }
  }

  // 3) Decay everything forward by `days`.
  for (const id of Object.keys(concepts)) {
    concepts[id] = decayConceptPure(concepts[id], days, model);
  }

  // 4) Advance the assessment clock.
  const subjectsById: Record<string, SubjectMeta> = {};
  for (const [id, sub] of Object.entries(s.subjectsById)) {
    subjectsById[id] = {
      ...sub,
      daysToAssessment: sub.daysToAssessment !== undefined ? Math.max(0, sub.daysToAssessment - days) : undefined,
    };
  }
  return { conceptsById: concepts, subjectsById };
}

export interface ProjectedMetrics {
  mastery: number;
  memory: number;
  risk: number;
  readiness: number;
  roi: number;
  weakConcepts: number;
}

function metricsOf(proj: Pick<CoreState, "conceptsById" | "subjectsById">): ProjectedMetrics {
  const concepts = deriveConcepts(proj);
  const subjects = deriveSubjects(proj);
  const totalImp = concepts.reduce((a, c) => a + c.importance, 0) || 1;
  const mastery = round(concepts.reduce((a, c) => a + c.mastery * c.importance, 0) / totalImp);
  const memory = round(concepts.reduce((a, c) => a + c.memoryStrength * c.importance, 0) / totalImp);
  const risk = round(concepts.reduce((a, c) => a + c.risk * c.importance, 0) / totalImp);
  const roi = round(concepts.reduce((a, c) => a + c.roi, 0) / Math.max(1, concepts.length));
  const readiness = round(subjects.reduce((a, x) => a + x.readiness, 0) / Math.max(1, subjects.length));
  const weakConcepts = concepts.filter((c) => c.status === "weak" || c.status === "forgotten").length;
  return { mastery, memory, risk, readiness, roi, weakConcepts };
}

// ---------------- Forgetting Forecast Engine ----------------

export interface ForgettingAlert {
  conceptId: string;
  conceptName: string;
  subjectName: string;
  daysUntil: number;
  date: string;
  importance: number;
  severity: "critical" | "high" | "medium";
  explanation: Explanation;
}

export interface ForgettingForecast {
  upcoming: ConceptForecast[];           // soonest-to-forget, within horizon
  alerts: ForgettingAlert[];
  subjectDecayRisk: { subjectId: string; subjectName: string; atRisk: number; soonestDays: number }[];
}

export function deriveForgettingForecast(s: CoreState, model: StudentLearningModel, horizonDays = 30): ForgettingForecast {
  const forecasts = deriveConceptForecasts(s, model);
  const upcoming = forecasts.filter((f) => f.predictedForgettingDays <= horizonDays);

  const alerts: ForgettingAlert[] = upcoming
    .filter((f) => f.predictedForgettingDays <= 10 && f.importance >= 6)
    .slice(0, 8)
    .map((f) => ({
      conceptId: f.conceptId,
      conceptName: f.conceptName,
      subjectName: f.subjectName,
      daysUntil: f.predictedForgettingDays,
      date: f.predictedForgettingDate,
      importance: f.importance,
      severity: f.predictedForgettingDays <= 4 ? "critical" : f.predictedForgettingDays <= 7 ? "high" : "medium",
      explanation: {
        reason: `${f.conceptName} is projected to drop below recall threshold in ${f.predictedForgettingDays} day${f.predictedForgettingDays === 1 ? "" : "s"} (${f.predictedForgettingDate}).`,
        evidence: [
          `Memory strength ${f.memoryStrength}/100, importance ${f.importance}/10`,
          `Personalised decay ${f.personalDecay}/day (vs population baseline)`,
          `Retention confidence ${f.retentionConfidence}% · recovery probability ${f.recoveryProbability}%`,
        ],
        confidence: f.retentionConfidence,
        factors: [
          { label: "Memory strength", weight: 0.4, value: `${f.memoryStrength}/100` },
          { label: "Personal decay", weight: 0.35, value: `${f.personalDecay}/day` },
          { label: "Importance", weight: 0.25, value: `${f.importance}/10` },
        ],
        projectedImpact: `A ${Math.max(15, round((100 - f.memoryStrength) / 3))}-min recovery now resets the forgetting clock and lifts retention to ~${Math.min(95, f.memoryStrength + 40)}%.`,
      },
    }));

  const bySubject = new Map<string, { subjectId: string; subjectName: string; atRisk: number; soonestDays: number }>();
  for (const f of upcoming) {
    const cur = bySubject.get(f.subjectName) ?? { subjectId: f.conceptId, subjectName: f.subjectName, atRisk: 0, soonestDays: 999 };
    cur.atRisk += 1;
    cur.soonestDays = Math.min(cur.soonestDays, f.predictedForgettingDays);
    bySubject.set(f.subjectName, cur);
  }
  const subjectDecayRisk = [...bySubject.values()].sort((a, b) => b.atRisk - a.atRisk || a.soonestDays - b.soonestDays);

  return { upcoming: upcoming.slice(0, 12), alerts, subjectDecayRisk };
}

// ---------------- Risk Forecast Engine ----------------

export interface RiskHorizon {
  days: number;
  label: string;
  risk: number;
  delta: number; // vs today
}

export interface RiskForecast {
  current: number;
  horizons: RiskHorizon[];
  subjectTrajectories: { subjectId: string; subjectName: string; current: number; in30: number; delta: number }[];
  explanation: Explanation;
}

export function deriveRiskForecast(s: CoreState, model: StudentLearningModel): RiskForecast {
  const current = metricsOf(s).risk;
  const horizonDays = [7, 14, 30, 60];
  const horizons: RiskHorizon[] = horizonDays.map((days) => {
    const m = metricsOf(projectState(s, { days, model }));
    return {
      days,
      label: `Risk in ${days} days`,
      risk: m.risk,
      delta: m.risk - current,
    };
  });

  const subjectsNow = deriveSubjects(s);
  const proj30 = projectState(s, { days: 30, model });
  const subjects30 = deriveSubjects(proj30);
  const subjectTrajectories = subjectsNow.map((sub) => {
    const future = subjects30.find((x) => x.id === sub.id);
    return {
      subjectId: sub.id,
      subjectName: sub.name,
      current: sub.risk,
      in30: future?.risk ?? sub.risk,
      delta: (future?.risk ?? sub.risk) - sub.risk,
    };
  }).sort((a, b) => b.in30 - a.in30);

  const worst = subjectTrajectories[0];
  return {
    current,
    horizons,
    subjectTrajectories,
    explanation: {
      reason: `Without intervention, composite risk moves from ${current}/100 today to ${horizons[2].risk}/100 in 30 days (${horizons[2].delta >= 0 ? "+" : ""}${horizons[2].delta}). Driven by memory decay, dependency propagation and the assessment clock.`,
      evidence: [
        `7-day risk ${horizons[0].risk} · 14-day ${horizons[1].risk} · 30-day ${horizons[2].risk} · 60-day ${horizons[3].risk}`,
        worst ? `${worst.subjectName} is the steepest trajectory: ${worst.current} → ${worst.in30} in 30d` : `No single subject dominates the risk trajectory`,
        `Personalised decay resistance ${model.decayResistance}/100 modulates the forecast`,
      ],
      confidence: round(clamp(60 + model.profileConfidence * 0.3)),
      factors: [
        { label: "Memory decay", weight: 0.4, value: `${model.decaySpeed}/100` },
        { label: "Dependency propagation", weight: 0.3, value: "graph-derived" },
        { label: "Assessment proximity", weight: 0.3, value: "scheduled" },
      ],
      projectedImpact: `Completing the recommended mission set bends this curve down — see the Future Self simulator.`,
    },
  };
}

// ---------------- Assessment Forecast Engine ----------------

export interface AssessmentForecast {
  subjectId: string;
  subjectName: string;
  code: string;
  daysToAssessment: number;
  readinessNow: number;
  readinessAtExam: number;     // projected to exam day
  risk: number;
  projectedScore: { low: number; high: number };
  confidence: number;
  explanation: Explanation;
}

export function deriveAssessmentForecasts(s: CoreState, model: StudentLearningModel): AssessmentForecast[] {
  const subjects = deriveSubjects(s);
  return subjects
    .filter((sub) => sub.daysToAssessment !== undefined)
    .sort((a, b) => (a.daysToAssessment! - b.daysToAssessment!))
    .map((sub) => {
      const days = sub.daysToAssessment!;
      const proj = projectState(s, { days, model });
      const future = deriveSubjects(proj).find((x) => x.id === sub.id)!;
      const readinessAtExam = future.readiness;
      const low = Math.max(30, readinessAtExam - 9);
      const high = Math.min(99, readinessAtExam + 6);
      return {
        subjectId: sub.id,
        subjectName: sub.name,
        code: sub.code,
        daysToAssessment: days,
        readinessNow: sub.readiness,
        readinessAtExam,
        risk: future.risk,
        projectedScore: { low, high },
        confidence: round(clamp(58 + model.profileConfidence * 0.25 + (sub.concepts > 4 ? 8 : 0))),
        explanation: {
          reason: `${sub.name} assessment in ${days} day${days === 1 ? "" : "s"}. Projected readiness at exam time is ${readinessAtExam}% (currently ${sub.readiness}%), giving a likely score band of ${low}–${high}%.`,
          evidence: [
            `Current readiness ${sub.readiness}% → projected ${readinessAtExam}% at exam`,
            `${sub.weakConcepts} weak concept${sub.weakConcepts === 1 ? "" : "s"} · dependency health ${sub.dependencyHealth}/100`,
            `Projected risk at exam ${future.risk}/100`,
          ],
          confidence: round(clamp(58 + model.profileConfidence * 0.25)),
          factors: [
            { label: "Readiness drift", weight: 0.45, value: `${readinessAtExam - sub.readiness >= 0 ? "+" : ""}${readinessAtExam - sub.readiness} pts` },
            { label: "Weak concepts", weight: 0.3, value: `${sub.weakConcepts}` },
            { label: "Dependency health", weight: 0.25, value: `${sub.dependencyHealth}/100` },
          ],
          projectedImpact: readinessAtExam < 65
            ? `Below the safety band — targeted recovery before the exam raises the projected score by ~${Math.min(20, round((65 - readinessAtExam) * 0.8))} pts.`
            : `On track — maintain cadence to hold the band.`,
        },
      };
    });
}

// ---------------- Mission Forecast Engine ----------------
// Re-rank missions by FUTURE impact: risk prevented, decay prevented, unlocks.

export interface MissionForecast extends DerivedMission {
  futureValue: number;      // 0–100 blended future impact
  riskPrevented: number;    // projected composite-risk pts removed at 14d
  conceptsUnlocked: number;
  decayPrevented: number;   // concepts kept above threshold at 14d
  forecastExplanation: Explanation;
}

export function deriveMissionForecasts(s: CoreState, model: StudentLearningModel): MissionForecast[] {
  const missions = deriveMissions(s).filter((m) => !m.completed);
  const concepts = deriveConcepts(s);
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const baseline14 = metricsOf(projectState(s, { days: 14, model }));

  const forecasts = missions.map((m) => {
    // Simulate completing JUST this mission, then 14 days forward.
    const withMission = metricsOf(projectState(s, {
      days: 14,
      model,
      runMissionConceptIds: new Set(m.conceptIds),
      missionSessionType:
        m.type === "recovery" ? "Recovery" :
        m.type === "reinforcement" ? "Reinforcement" :
        m.type === "expansion" ? "Expansion" :
        m.type === "assessment" ? "Diagnostic" : "Review",
    }));
    const riskPrevented = Math.max(0, baseline14.risk - withMission.risk);
    const decayPrevented = Math.max(0, baseline14.weakConcepts - withMission.weakConcepts);
    const conceptsUnlocked = m.conceptIds.reduce((a, id) => a + (byId.get(id)?.downstreamCount ?? 0), 0);

    const futureValue = round(clamp(
      riskPrevented * 3.5 +
      conceptsUnlocked * 6 +
      decayPrevented * 8 +
      m.roiScore * 0.25,
    ));

    return {
      ...m,
      futureValue,
      riskPrevented,
      conceptsUnlocked,
      decayPrevented,
      forecastExplanation: {
        reason: `Completing "${m.title}" is projected to remove ${riskPrevented} composite-risk pts over 14 days, unlock ${conceptsUnlocked} downstream concept${conceptsUnlocked === 1 ? "" : "s"} and keep ${decayPrevented} concept${decayPrevented === 1 ? "" : "s"} above the forgetting threshold.`,
        evidence: [
          `14-day composite risk: ${baseline14.risk} → ${withMission.risk} if completed`,
          `Weak concepts at 14d: ${baseline14.weakConcepts} → ${withMission.weakConcepts}`,
          `Downstream unlocks: ${conceptsUnlocked}`,
        ],
        confidence: m.confidence,
        factors: [
          { label: "Risk prevented", weight: 0.4, value: `${riskPrevented} pts` },
          { label: "Decay prevented", weight: 0.32, value: `${decayPrevented} concepts` },
          { label: "Unlocks", weight: 0.28, value: `${conceptsUnlocked}` },
        ],
        projectedImpact: `Future value ${futureValue}/100 — ranks missions by what they prevent, not just current state.`,
      },
    } satisfies MissionForecast;
  });

  return forecasts.sort((a, b) => b.futureValue - a.futureValue);
}

// ===================================================================
// PHASE 3 — ACADEMIC DIGITAL TWIN
// ===================================================================

export interface TwinSnapshot {
  label: string;
  description: string;
  mastery: number;
  memory: number;
  risk: number;
  readiness: number;
  weakConcepts: number;
}

export interface DigitalTwin {
  currentSelf: TwinSnapshot;
  projectedSelf: TwinSnapshot;  // 14d, maintain current behaviour
  futureSelf: TwinSnapshot;     // 30d, complete recommended missions
}

function topMissionConceptIds(s: CoreState, limit = 6): Set<string> {
  const ids = new Set<string>();
  for (const m of deriveMissions(s).filter((x) => !x.completed).slice(0, limit)) {
    for (const id of m.conceptIds) ids.add(id);
  }
  return ids;
}

export function deriveDigitalTwin(s: CoreState, model: StudentLearningModel): DigitalTwin {
  const now = metricsOf(s);
  const maintain14 = metricsOf(projectState(s, { days: 14, model }));
  const missionIds = topMissionConceptIds(s, 8);
  const future30 = metricsOf(projectState(s, {
    days: 30,
    model,
    runMissionConceptIds: missionIds,
    missionSessionType: "Recovery",
    extraReinforceCount: 3,
    extraReinforceType: "Reinforcement",
  }));
  return {
    currentSelf: { label: "Current Self", description: "Where you stand today", ...now },
    projectedSelf: { label: "Projected Self", description: "In 14 days if behaviour is unchanged", ...maintain14 },
    futureSelf: { label: "Future Self", description: "In 30 days following the recommended plan", ...future30 },
  };
}

// ---------------- Future Self Simulator (multiple trajectories) ----------------

export interface TrajectoryPath {
  id: "maintain" | "recommended" | "high-performance";
  label: string;
  description: string;
  horizonDays: number;
  metrics: ProjectedMetrics;
  assessmentOutcomes: { subjectName: string; projectedScore: number }[];
}

export function deriveFutureSelfPaths(s: CoreState, model: StudentLearningModel, horizonDays = 14): TrajectoryPath[] {
  const missionIds = topMissionConceptIds(s, 8);

  const build = (
    id: TrajectoryPath["id"],
    label: string,
    description: string,
    opts: Partial<ProjectionOptions>,
  ): TrajectoryPath => {
    const proj = projectState(s, { days: horizonDays, model, ...opts });
    const subjects = deriveSubjects(proj).filter((x) => x.daysToAssessment !== undefined);
    return {
      id,
      label,
      description,
      horizonDays,
      metrics: metricsOf(proj),
      assessmentOutcomes: subjects.map((sub) => ({ subjectName: sub.name, projectedScore: sub.readiness })),
    };
  };

  return [
    build("maintain", "Path A — Maintain", "Keep current behaviour unchanged", {}),
    build("recommended", "Path B — Recommended", "Complete the recommended mission set", {
      runMissionConceptIds: missionIds,
      missionSessionType: "Recovery",
    }),
    build("high-performance", "Path C — High Performance", "Missions plus extra daily reinforcement", {
      runMissionConceptIds: missionIds,
      missionSessionType: "Recovery",
      extraReinforceCount: 4,
      extraReinforceType: "Reinforcement",
    }),
  ];
}

// ---------------- What-If Analysis ----------------

export type WhatIfId = "ignore-top-mission" | "study-5-extra-hours" | "recover-bottleneck" | "skip-revision-14d";

export interface WhatIfScenario {
  id: WhatIfId;
  question: string;
  before: ProjectedMetrics;
  after: ProjectedMetrics;
  deltaRisk: number;
  deltaMastery: number;
  deltaMemory: number;
  explanation: Explanation;
}

export function simulateWhatIf(s: CoreState, model: StudentLearningModel, id: WhatIfId): WhatIfScenario {
  const horizon = 14;
  const baseline = metricsOf(projectState(s, { days: horizon, model }));
  const missions = deriveMissions(s).filter((m) => !m.completed);
  const bottlenecks = deriveBottlenecks(s);

  let after: ProjectedMetrics = baseline;
  let question = "";
  let reason = "";
  let evidence: string[] = [];
  let projectedImpact = "";

  if (id === "ignore-top-mission") {
    question = "What happens if I ignore my top mission?";
    const top = missions[0];
    const withMission = metricsOf(projectState(s, {
      days: horizon, model,
      runMissionConceptIds: new Set(top ? top.conceptIds : []),
      missionSessionType: "Recovery",
    }));
    // "After ignoring" = baseline (no action); compare to acting.
    after = baseline;
    reason = top
      ? `Ignoring "${top.title}" leaves composite risk at ${baseline.risk}/100 in 14 days instead of ${withMission.risk}/100 — a ${baseline.risk - withMission.risk} pt risk you choose to keep.`
      : `No active missions to ignore — the queue is clear.`;
    evidence = top ? [
      `Acting drops 14-day risk to ${withMission.risk}; ignoring holds it at ${baseline.risk}`,
      `Weak concepts: ${withMission.weakConcepts} (act) vs ${baseline.weakConcepts} (ignore)`,
    ] : ["Mission queue empty"];
    projectedImpact = top ? `Cost of inaction: +${baseline.risk - withMission.risk} risk, +${baseline.weakConcepts - withMission.weakConcepts} weak concepts.` : "No impact.";
  } else if (id === "study-5-extra-hours") {
    question = "What happens if I study 5 extra hours this week?";
    // 5 hours ≈ ~12 reinforcement sessions of 25 min.
    after = metricsOf(projectState(s, {
      days: horizon, model,
      extraReinforceCount: 12,
      extraReinforceType: "Reinforcement",
    }));
    reason = `Five focused extra hours lifts projected mastery from ${baseline.mastery} to ${after.mastery} and cuts 14-day risk from ${baseline.risk} to ${after.risk}.`;
    evidence = [
      `~12 reinforcement sessions across your weakest concepts`,
      `Mastery ${baseline.mastery} → ${after.mastery} · memory ${baseline.memory} → ${after.memory}`,
      `Weak concepts ${baseline.weakConcepts} → ${after.weakConcepts}`,
    ];
    projectedImpact = `+${after.mastery - baseline.mastery} mastery, -${baseline.risk - after.risk} risk for 5 hours invested.`;
  } else if (id === "recover-bottleneck") {
    question = "What happens if I recover my biggest bottleneck concept?";
    const bn = bottlenecks[0];
    after = bn ? metricsOf(projectState(s, {
      days: horizon, model,
      runMissionConceptIds: new Set([bn.conceptId]),
      missionSessionType: "Recovery",
    })) : baseline;
    reason = bn
      ? `Recovering ${bn.conceptName} (gates ${bn.dependentCount} downstream) drops 14-day composite risk from ${baseline.risk} to ${after.risk} via dependency propagation.`
      : `No structural bottleneck detected — risk is not concentrated on a single gating concept.`;
    evidence = bn ? [
      `${bn.conceptName} bottleneck score ${bn.bottleneckScore}/100, mastery ${bn.mastery}/100`,
      `Composite risk ${baseline.risk} → ${after.risk}`,
      `Weak concepts ${baseline.weakConcepts} → ${after.weakConcepts}`,
    ] : ["No qualifying bottleneck"];
    projectedImpact = bn ? `One recovery removes ${baseline.risk - after.risk} risk pts across the chain it gates.` : "Negligible.";
  } else {
    question = "What happens if I skip revisions for 14 days?";
    after = metricsOf(projectState(s, { days: 14, model }));
    const decay30 = metricsOf(projectState(s, { days: 30, model }));
    reason = `Skipping revisions for 14 days lets memory fall from ${metricsOf(s).memory} to ${after.memory} and pushes risk to ${after.risk}/100 — accelerating to ${decay30.risk}/100 by day 30.`;
    evidence = [
      `Memory ${metricsOf(s).memory} → ${after.memory} (14d) → ${decay30.memory} (30d)`,
      `Weak concepts ${metricsOf(s).weakConcepts} → ${after.weakConcepts}`,
      `Personalised decay resistance ${model.decayResistance}/100`,
    ];
    projectedImpact = `Compounding decay: ${after.weakConcepts - metricsOf(s).weakConcepts} new weak concepts in two weeks.`;
  }

  return {
    id,
    question,
    before: baseline,
    after,
    deltaRisk: after.risk - baseline.risk,
    deltaMastery: after.mastery - baseline.mastery,
    deltaMemory: after.memory - baseline.memory,
    explanation: {
      reason,
      evidence,
      confidence: round(clamp(55 + model.profileConfidence * 0.3)),
      factors: [
        { label: "Risk delta", weight: 0.4, value: `${after.risk - baseline.risk >= 0 ? "+" : ""}${after.risk - baseline.risk}` },
        { label: "Mastery delta", weight: 0.3, value: `${after.mastery - baseline.mastery >= 0 ? "+" : ""}${after.mastery - baseline.mastery}` },
        { label: "Memory delta", weight: 0.3, value: `${after.memory - baseline.memory >= 0 ? "+" : ""}${after.memory - baseline.memory}` },
      ],
      projectedImpact,
    },
  };
}

// ===================================================================
// PHASE 4 — ACADEMIC STRATEGIST AI
// ===================================================================

export interface StrategicInsight {
  id: string;
  title: string;
  severity: "critical" | "high" | "opportunity" | "info";
  explanation: Explanation;
}

export function deriveStrategicInsights(s: CoreState, model: StudentLearningModel): StrategicInsight[] {
  const out: StrategicInsight[] = [];
  const concepts = deriveConcepts(s);
  const forgetting = deriveForgettingForecast(s, model, 10);
  const riskForecast = deriveRiskForecast(s, model);
  const missionForecasts = deriveMissionForecasts(s, model);
  const bottlenecks = deriveBottlenecks(s);

  // 1) Highest future-value mission framed as risk reduction.
  const topMission = missionForecasts[0];
  if (topMission && topMission.riskPrevented > 0) {
    const pct = riskForecast.current > 0 ? round((topMission.riskPrevented / riskForecast.current) * 100) : 0;
    out.push({
      id: "strat-top-mission",
      title: `${topMission.title} reduces projected risk by ${pct}%`,
      severity: pct >= 18 ? "critical" : "high",
      explanation: topMission.forecastExplanation,
    });
  }

  // 2) Bottleneck leverage.
  const bn = bottlenecks[0];
  if (bn) {
    out.push({
      id: "strat-bottleneck",
      title: `${bn.conceptName} is a bottleneck affecting ${bn.dependentCount} downstream concept${bn.dependentCount === 1 ? "" : "s"}`,
      severity: bn.dependentCount >= 4 ? "critical" : "high",
      explanation: {
        reason: `${bn.conceptName} gates ${bn.dependentCount} downstream concept${bn.dependentCount === 1 ? "" : "s"} at mastery ${bn.mastery}/100. It is the highest-leverage structural fix in your graph.`,
        evidence: [bn.reason, `Bottleneck score ${bn.bottleneckScore}/100`],
        confidence: 82,
        factors: [
          { label: "Downstream gated", weight: 0.5, value: `${bn.dependentCount}` },
          { label: "Current mastery", weight: 0.3, value: `${bn.mastery}/100` },
          { label: "Bottleneck score", weight: 0.2, value: `${bn.bottleneckScore}/100` },
        ],
        projectedImpact: `Recovering it propagates risk reduction across every downstream node.`,
      },
    });
  }

  // 3) Forgetting cliff.
  if (forgetting.alerts.length >= 1) {
    const critical = forgetting.alerts.filter((a) => a.severity !== "medium");
    const n = Math.max(critical.length, forgetting.alerts.length);
    out.push({
      id: "strat-forgetting",
      title: `You are likely to forget ${n} critical concept${n === 1 ? "" : "s"} within 10 days`,
      severity: critical.length >= 3 ? "critical" : "high",
      explanation: {
        reason: `${n} high-importance concept${n === 1 ? "" : "s"} are projected to cross the forgetting threshold within 10 days based on your personalised decay model.`,
        evidence: forgetting.alerts.slice(0, 4).map((a) => `${a.conceptName} (${a.subjectName}) in ${a.daysUntil}d`),
        confidence: round(forgetting.alerts.reduce((a, x) => a + x.explanation.confidence, 0) / forgetting.alerts.length),
        factors: [
          { label: "Concepts at cliff", weight: 0.5, value: `${n}` },
          { label: "Decay resistance", weight: 0.3, value: `${model.decayResistance}/100` },
          { label: "Soonest", weight: 0.2, value: `${forgetting.alerts[0].daysUntil}d` },
        ],
        projectedImpact: `Pre-emptive recovery this week prevents the loss before it compounds.`,
      },
    });
  }

  // 4) Opportunity window: dominant subject coasting frees capacity.
  const subjects = deriveSubjects(s);
  const dominant = subjects.find((x) => x.status === "dominant");
  const critical = subjects.sort((a, b) => b.risk - a.risk)[0];
  if (dominant && critical && dominant.id !== critical.id) {
    out.push({
      id: "strat-window",
      title: `Opportunity window: redirect time from ${dominant.name} to ${critical.name}`,
      severity: "opportunity",
      explanation: {
        reason: `${dominant.name} is dominant (mastery ${dominant.mastery}, low decay) and can coast. ${critical.name} carries the highest risk (${critical.risk}/100). Reallocating reduces composite risk fastest.`,
        evidence: [
          `${dominant.name}: mastery ${dominant.mastery}, risk ${dominant.risk}`,
          `${critical.name}: mastery ${critical.mastery}, risk ${critical.risk}`,
        ],
        confidence: 80,
        factors: [
          { label: "Dominant buffer", weight: 0.4, value: `${dominant.mastery}/100` },
          { label: "Critical risk", weight: 0.6, value: `${critical.risk}/100` },
        ],
        projectedImpact: `Net composite-risk reduction with negligible loss in ${dominant.code}.`,
      },
    });
  }

  const order = { critical: 0, high: 1, opportunity: 2, info: 3 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

// Strategist-grade coach reply — future-aware, explainable, graph-aware.
export function generateStrategistReply(question: string, s: CoreState, model: StudentLearningModel): string {
  const q = question.toLowerCase();

  if (q.includes("forget") || q.includes("decay") || q.includes("retain")) {
    const f = deriveForgettingForecast(s, model, 14);
    if (f.alerts.length) {
      const a = f.alerts[0];
      return `You're likely to forget ${f.alerts.length} critical concept${f.alerts.length === 1 ? "" : "s"} within 14 days. Soonest: ${a.conceptName} (${a.subjectName}) in ${a.daysUntil} days at ${a.explanation.confidence}% confidence. ${a.explanation.projectedImpact}`;
    }
    return `Your personalised memory model (decay resistance ${model.decayResistance}/100) shows no concept crossing the forgetting threshold within 14 days. Retention is holding.`;
  }
  if (q.includes("future") || q.includes("trajectory") || q.includes("path") || q.includes("project")) {
    const twin = deriveDigitalTwin(s, model);
    return `Current self: mastery ${twin.currentSelf.mastery}, risk ${twin.currentSelf.risk}. If you maintain behaviour, in 14 days you slip to mastery ${twin.projectedSelf.mastery}, risk ${twin.projectedSelf.risk}. Following the recommended plan, your 30-day future self reaches mastery ${twin.futureSelf.mastery}, risk ${twin.futureSelf.risk}.`;
  }
  if (q.includes("risk")) {
    const rf = deriveRiskForecast(s, model);
    const worst = rf.subjectTrajectories[0];
    return `Composite risk is ${rf.current}/100 today, forecast to reach ${rf.horizons[2].risk}/100 in 30 days if unaddressed. Steepest trajectory: ${worst?.subjectName} (${worst?.current} → ${worst?.in30}). ${rf.explanation.projectedImpact}`;
  }
  if (q.includes("bottleneck") || q.includes("unlock") || q.includes("structural")) {
    const insights = deriveStrategicInsights(s, model).filter((i) => i.id === "strat-bottleneck");
    if (insights.length) return `${insights[0].title}. ${insights[0].explanation.reason} ${insights[0].explanation.projectedImpact}`;
  }
  if (q.includes("mission") || q.includes("priorit") || q.includes("what should") || q.includes("first") || q.includes("now")) {
    const mf = deriveMissionForecasts(s, model)[0];
    if (mf) return `Highest future value: "${mf.title}" (${mf.futureValue}/100). ${mf.forecastExplanation.reason}`;
  }
  if (q.includes("exam") || q.includes("assessment") || q.includes("test") || q.includes("score")) {
    const af = deriveAssessmentForecasts(s, model)[0];
    if (af) return `Next: ${af.subjectName} in ${af.daysToAssessment} days. Projected readiness at exam ${af.readinessAtExam}% → score band ${af.projectedScore.low}–${af.projectedScore.high}% (${af.confidence}% confidence). ${af.explanation.projectedImpact}`;
  }
  if (q.includes("study method") || q.includes("works best") || q.includes("effective")) {
    const eff = deriveSessionEffectiveness(s);
    return eff.recommendation;
  }

  // Default: strategist overview.
  const insights = deriveStrategicInsights(s, model);
  if (insights.length) {
    return `Strategic read: ${insights[0].title}. ${insights[0].explanation.reason} You're a "${model.archetype}" (profile confidence ${model.profileConfidence}%). Ask about your future trajectory, forgetting forecast, exam outlook, or run a what-if simulation.`;
  }
  return `You're a "${model.archetype}" learning ~${model.learningVelocity} mastery pts/hour with ${model.recallAccuracy}% recall accuracy. Ask me about your forgetting forecast, risk trajectory, exam outlook, or what-if scenarios.`;
}

// ===================================================================
// Hook layer — memoised, reactive to the intelligence store.
// ===================================================================

export interface PredictiveBundle {
  studentModel: StudentLearningModel;
  memoryModel: PersonalMemoryModel;
  conceptForecasts: ConceptForecast[];
  sessionEffectiveness: SessionEffectivenessReport;
  velocity: SubjectVelocity[];
  forgettingForecast: ForgettingForecast;
  riskForecast: RiskForecast;
  assessmentForecasts: AssessmentForecast[];
  missionForecasts: MissionForecast[];
  digitalTwin: DigitalTwin;
  futureSelfPaths: TrajectoryPath[];
  strategicInsights: StrategicInsight[];
}

let cache: { version: number; data: PredictiveBundle } | null = null;

function compute(): PredictiveBundle {
  const state = useIntelligenceStore.getState();
  const core: CoreState = {
    conceptsById: state.conceptsById,
    subjectsById: state.subjectsById,
    sessions: state.sessions,
    assessments: state.assessments,
    completedMissionIds: state.completedMissionIds,
  };
  const studentModel = deriveStudentModel(core);
  return {
    studentModel,
    memoryModel: derivePersonalMemoryModel(core, studentModel),
    conceptForecasts: deriveConceptForecasts(core, studentModel),
    sessionEffectiveness: deriveSessionEffectiveness(core),
    velocity: deriveLearningVelocity(core),
    forgettingForecast: deriveForgettingForecast(core, studentModel),
    riskForecast: deriveRiskForecast(core, studentModel),
    assessmentForecasts: deriveAssessmentForecasts(core, studentModel),
    missionForecasts: deriveMissionForecasts(core, studentModel),
    digitalTwin: deriveDigitalTwin(core, studentModel),
    futureSelfPaths: deriveFutureSelfPaths(core, studentModel),
    strategicInsights: deriveStrategicInsights(core, studentModel),
  };
}

function getPredictive(): PredictiveBundle {
  const version = useIntelligenceStore.getState().version;
  if (cache && cache.version === version) return cache.data;
  const data = compute();
  cache = { version, data };
  return data;
}

function subscribe(cb: () => void) {
  return useIntelligenceStore.subscribe(cb);
}

export function usePredictive(): PredictiveBundle {
  return useSyncExternalStore(subscribe, getPredictive, getPredictive);
}

// Imperative access for event handlers (what-if simulations).
export function getCoreState(): CoreState {
  const state = useIntelligenceStore.getState();
  return {
    conceptsById: state.conceptsById,
    subjectsById: state.subjectsById,
    sessions: state.sessions,
    assessments: state.assessments,
    completedMissionIds: state.completedMissionIds,
  };
}
