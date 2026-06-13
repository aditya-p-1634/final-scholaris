// Scholaris Academic Execution System.
// ====================================================
// This module transforms Scholaris from a system that only *understands*
// academics into one that *drives daily action, consistency and motivation*.
//
// It is PURELY DERIVED from the existing intelligence store. It never mutates
// state, never adds prediction engines, never touches the database, auth or
// onboarding. Every output here answers an execution question:
//
//   Momentum        → "Am I moving forward?"
//   Daily Victory   → "What should I do right now?"
//   Streaks         → "Am I consistent?"
//   Daily Debrief   → "What did I accomplish today?"
//   Weekly Review   → "What improved, what declined, what next?"
//   Health Score    → "How healthy is my academic system?"
//   Motivation      → evidence-based encouragement (no generic quotes)
//
// Everything reuses the existing derivation primitives so the execution layer
// stays consistent with the rest of the engine.

import { useSyncExternalStore } from "react";
import {
  useIntelligenceStore,
  deriveConcepts,
  deriveSubjects,
  deriveMissions,
  deriveAcademicStatus,
  type SessionLogEntry,
  type AssessmentLogEntry,
  type ConceptCore,
  type SubjectMeta,
  type DerivedMission,
} from "./intelligence";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n);

interface CoreState {
  conceptsById: Record<string, ConceptCore>;
  subjectsById: Record<string, SubjectMeta>;
  sessions: SessionLogEntry[];
  assessments: AssessmentLogEntry[];
  completedMissionIds: string[];
}

const DAY = 86400000;

function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}
function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Estimate the risk a session removed: recovery sessions on weak concepts
// drop the most risk; the gain (mastery pts) is a clean evidence proxy.
function sessionRiskReduced(s: SessionLogEntry): number {
  const typeWeight =
    s.type === "Recovery" ? 0.9 :
    s.type === "Reinforcement" ? 0.5 :
    s.type === "Diagnostic" ? 0.35 :
    s.type === "Review" ? 0.4 : 0.3;
  return s.gain * typeWeight;
}

// ===================================================================
// MOMENTUM ENGINE — "Am I moving forward?"
// ===================================================================

export type TrendDirection = "rising" | "stable" | "declining";

export interface MomentumComponent {
  label: string;
  value: number; // 0–100
  detail: string;
}

export interface MomentumReport {
  dailyScore: number;   // 0–100
  weeklyScore: number;  // 0–100
  trend: TrendDirection;
  trendDelta: number;   // weekly vs prior-week momentum delta
  components: MomentumComponent[];
  headline: string;
}

// Compute a momentum score over an arbitrary session/assessment window.
function windowMomentum(
  sessions: SessionLogEntry[],
  assessments: AssessmentLogEntry[],
  activeDays: number,
  targetDays: number,
): { score: number; components: MomentumComponent[] } {
  const missions = sessions.length; // each session is a unit of executed work
  const masteryGained = sessions.reduce((a, s) => a + s.gain, 0);
  const riskReduced = sessions.reduce((a, s) => a + sessionRiskReduced(s), 0);
  const recovered = sessions.filter((s) => s.type === "Recovery").length;
  const minutes = sessions.reduce((a, s) => a + s.duration, 0);
  const quality = minutes > 0 ? (masteryGained / minutes) * 60 : 0; // pts/hour
  const assessmentProgress = assessments.length
    ? assessments.reduce((a, x) => a + clamp(x.actual - (x.predicted - 10) + 50), 0) / assessments.length
    : 0;

  const cMissions = clamp((missions / Math.max(1, targetDays * 2)) * 100);
  const cMastery = clamp((masteryGained / Math.max(1, targetDays * 18)) * 100);
  const cRisk = clamp((riskReduced / Math.max(1, targetDays * 12)) * 100);
  const cRecovered = clamp((recovered / Math.max(1, targetDays)) * 100);
  const cConsistency = clamp((activeDays / Math.max(1, targetDays)) * 100);
  const cQuality = clamp((quality / 36) * 100);
  const cAssessment = assessments.length ? clamp(assessmentProgress) : 50;

  const score = round(
    cMissions * 0.18 +
    cMastery * 0.20 +
    cRisk * 0.16 +
    cRecovered * 0.12 +
    cConsistency * 0.16 +
    cQuality * 0.10 +
    cAssessment * 0.08,
  );

  const components: MomentumComponent[] = [
    { label: "Missions completed", value: round(cMissions), detail: `${missions} executed` },
    { label: "Mastery gained", value: round(cMastery), detail: `+${round(masteryGained)} pts` },
    { label: "Risk reduced", value: round(cRisk), detail: `~${round(riskReduced)} pts removed` },
    { label: "Concepts recovered", value: round(cRecovered), detail: `${recovered} recovered` },
    { label: "Consistency", value: round(cConsistency), detail: `${activeDays}/${targetDays} active days` },
    { label: "Session quality", value: round(cQuality), detail: `${round(quality)} pts/hr` },
    { label: "Assessment progress", value: round(cAssessment), detail: assessments.length ? `${assessments.length} logged` : "no recent attempts" },
  ];
  return { score, components };
}

export function deriveMomentum(s: CoreState): MomentumReport {
  const now = Date.now();
  const todayStart = startOfToday();
  const weekAgo = now - 7 * DAY;
  const twoWeeksAgo = now - 14 * DAY;

  const todaySessions = s.sessions.filter((x) => x.timestamp >= todayStart);
  const weekSessions = s.sessions.filter((x) => x.timestamp >= weekAgo);
  const priorWeekSessions = s.sessions.filter((x) => x.timestamp >= twoWeeksAgo && x.timestamp < weekAgo);
  const todayAssess = s.assessments.filter((x) => x.timestamp >= todayStart);
  const weekAssess = s.assessments.filter((x) => x.timestamp >= weekAgo);
  const priorWeekAssess = s.assessments.filter((x) => x.timestamp >= twoWeeksAgo && x.timestamp < weekAgo);

  const weekActiveDays = new Set(weekSessions.map((x) => dayKey(x.timestamp))).size;
  const priorActiveDays = new Set(priorWeekSessions.map((x) => dayKey(x.timestamp))).size;

  const daily = windowMomentum(todaySessions, todayAssess, todaySessions.length ? 1 : 0, 1);
  const weekly = windowMomentum(weekSessions, weekAssess, weekActiveDays, 7);
  const prior = windowMomentum(priorWeekSessions, priorWeekAssess, priorActiveDays, 7);

  const trendDelta = round(weekly.score - prior.score);
  const trend: TrendDirection =
    trendDelta >= 6 ? "rising" : trendDelta <= -6 ? "declining" : "stable";

  const headline =
    trend === "rising"
      ? `Rising momentum — up ${Math.abs(trendDelta)} pts over last week.`
      : trend === "declining"
      ? `Declining momentum — down ${Math.abs(trendDelta)} pts. Re-engage to recover.`
      : weekly.score >= 50
      ? "Stable momentum — you're holding a steady pace."
      : "Low momentum — a single focused session will restart your trajectory.";

  return {
    dailyScore: daily.score,
    weeklyScore: weekly.score,
    trend,
    trendDelta,
    components: weekly.components,
    headline,
  };
}

// ===================================================================
// DAILY VICTORY — "What should I do right now?"
// ===================================================================

export interface DailyVictory {
  missionId: string;
  title: string;
  subjectName: string;
  whyItMatters: string;
  estimatedMinutes: number;
  expectedBenefit: string;
  riskReduction: number;
  futureImpact: string;
  conceptIds: string[];
  roiScore: number;
  priority: DerivedMission["priority"];
}

export function deriveDailyVictory(s: CoreState): DailyVictory | null {
  const missions = deriveMissions(s).filter((m) => !m.completed);
  if (missions.length === 0) return null;
  // The single most important action: highest combined urgency, ROI & risk removed.
  const ranked = [...missions].sort((a, b) => {
    const pri = { critical: 3, high: 2, medium: 1, low: 0 } as const;
    const sa = pri[a.priority] * 40 + a.roiScore + a.riskReduction * 0.6;
    const sb = pri[b.priority] * 40 + b.roiScore + b.riskReduction * 0.6;
    return sb - sa;
  });
  const m = ranked[0];

  const concepts = deriveConcepts(s);
  const involved = concepts.filter((c) => m.conceptIds.includes(c.id));
  const downstream = involved.reduce((a, c) => a + c.downstreamCount, 0);

  const futureImpact =
    downstream > 0
      ? `Strengthens ${downstream} downstream concept${downstream === 1 ? "" : "s"} that depend on this work.`
      : m.expectedImpact;

  return {
    missionId: m.id,
    title: m.title,
    subjectName: m.subjectName,
    whyItMatters: m.reason,
    estimatedMinutes: m.estimatedMinutes,
    expectedBenefit: m.expectedImpact,
    riskReduction: m.riskReduction,
    futureImpact,
    conceptIds: m.conceptIds,
    roiScore: m.roiScore,
    priority: m.priority,
  };
}

// ===================================================================
// ACADEMIC STREAKS — meaningful, not gamified noise.
// ===================================================================

export interface StreakReport {
  key: string;
  label: string;
  days: number;
  active: boolean; // counted up to today
  description: string;
}

// Count consecutive active calendar days ending today (or yesterday — a grace
// day so a streak isn't lost until a full day passes without activity).
function consecutiveDays(daySet: Set<string>): { days: number; active: boolean } {
  if (daySet.size === 0) return { days: 0, active: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayStr = new Date(today.getTime() - DAY).toISOString().slice(0, 10);

  let cursor: Date;
  let active = false;
  if (daySet.has(todayStr)) {
    cursor = today;
    active = true;
  } else if (daySet.has(yesterdayStr)) {
    cursor = new Date(today.getTime() - DAY);
    active = true;
  } else {
    return { days: 0, active: false };
  }

  let count = 0;
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    count++;
    cursor = new Date(cursor.getTime() - DAY);
  }
  return { days: count, active };
}

function daySetFrom(items: { timestamp: number }[]): Set<string> {
  return new Set(items.map((x) => dayKey(x.timestamp)));
}

export function deriveStreaks(s: CoreState): StreakReport[] {
  const study = consecutiveDays(daySetFrom(s.sessions));
  const mission = consecutiveDays(daySetFrom(s.sessions.filter((x) => x.duration >= 20)));
  const recovery = consecutiveDays(daySetFrom(s.sessions.filter((x) => x.type === "Recovery")));
  const learning = consecutiveDays(
    daySetFrom(s.sessions.filter((x) => x.type === "Reinforcement" || x.type === "Expansion" || x.type === "Review")),
  );
  const prep = consecutiveDays(
    daySetFrom([
      ...s.sessions.filter((x) => x.type === "Diagnostic"),
      ...s.assessments,
    ]),
  );

  return [
    { key: "study", label: "Study streak", days: study.days, active: study.active, description: "Days in a row with a focused session." },
    { key: "mission", label: "Mission streak", days: mission.days, active: mission.active, description: "Consecutive days completing a real mission." },
    { key: "recovery", label: "Recovery streak", days: recovery.days, active: recovery.active, description: "Days you recovered a weak or forgotten concept." },
    { key: "learning", label: "Learning streak", days: learning.days, active: learning.active, description: "Days reinforcing or expanding what you know." },
    { key: "prep", label: "Assessment prep streak", days: prep.days, active: prep.active, description: "Days preparing through diagnostics or assessments." },
  ];
}

// ===================================================================
// DAILY DEBRIEF — end-of-day academic report.
// ===================================================================

export interface DailyDebrief {
  missionsCompleted: number;
  masteryGained: number;
  riskReduced: number;
  conceptsImproved: number;
  timeInvested: number; // minutes
  biggestAchievement: string;
  summary: string;
  hadActivity: boolean;
}

export function deriveDailyDebrief(s: CoreState): DailyDebrief {
  const todayStart = startOfToday();
  const today = s.sessions.filter((x) => x.timestamp >= todayStart);
  const masteryGained = round(today.reduce((a, x) => a + x.gain, 0));
  const riskReduced = round(today.reduce((a, x) => a + sessionRiskReduced(x), 0));
  const conceptsImproved = new Set(today.map((x) => x.conceptId)).size;
  const timeInvested = today.reduce((a, x) => a + x.duration, 0);
  const recovered = today.filter((x) => x.type === "Recovery");

  // Biggest achievement = the session that moved the needle most.
  const best = [...today].sort((a, b) => b.gain - a.gain)[0];
  const biggestAchievement = best
    ? `${best.type === "Recovery" ? "Recovered" : "Strengthened"} ${best.conceptName} (+${best.gain} mastery).`
    : "No sessions yet today.";

  const summary = today.length
    ? `Today you ${recovered.length ? `recovered ${recovered.length} concept${recovered.length === 1 ? "" : "s"}, ` : ""}reduced risk by ~${riskReduced}%, and increased mastery by +${masteryGained} pts across ${conceptsImproved} concept${conceptsImproved === 1 ? "" : "s"} in ${timeInvested} minutes.`
    : "No work logged yet today. Completing your daily victory will start the report.";

  return {
    missionsCompleted: today.filter((x) => x.duration >= 20).length,
    masteryGained,
    riskReduced,
    conceptsImproved,
    timeInvested,
    biggestAchievement,
    summary,
    hadActivity: today.length > 0,
  };
}

// ===================================================================
// WEEKLY REVIEW — what improved, what declined, what next.
// ===================================================================

export interface WeeklyReview {
  wins: string[];
  mistakes: string[];
  opportunities: string[];
  strategicPriorities: string[];
  improvedSummary: string;
  declinedSummary: string;
}

export function deriveWeeklyReview(s: CoreState): WeeklyReview {
  const now = Date.now();
  const weekAgo = now - 7 * DAY;
  const week = s.sessions.filter((x) => x.timestamp >= weekAgo);
  const subjects = deriveSubjects(s);
  const concepts = deriveConcepts(s);

  const masteryGained = round(week.reduce((a, x) => a + x.gain, 0));
  const recovered = week.filter((x) => x.type === "Recovery").length;
  const riskReduced = round(week.reduce((a, x) => a + sessionRiskReduced(x), 0));
  const activeDays = new Set(week.map((x) => dayKey(x.timestamp))).size;

  const improving = [...subjects].filter((x) => x.trend > 1).sort((a, b) => b.trend - a.trend);
  const declining = [...subjects].filter((x) => x.trend < -1).sort((a, b) => a.trend - b.trend);
  const highRoi = [...concepts].sort((a, b) => b.roi - a.roi).slice(0, 2);
  const bottlenecks = concepts.filter((c) => c.isBottleneck).sort((a, b) => b.bottleneckScore - a.bottleneckScore);
  const neglected = concepts.filter((c) => c.daysSinceReview > 7 && c.importance >= 7);
  const criticalSubjects = subjects.filter((x) => x.status === "critical" || x.status === "at-risk");

  const wins: string[] = [];
  if (masteryGained > 0) wins.push(`Gained +${masteryGained} mastery points across ${week.length} session${week.length === 1 ? "" : "s"}.`);
  if (recovered > 0) wins.push(`Recovered ${recovered} weak concept${recovered === 1 ? "" : "s"}, reducing risk by ~${riskReduced}%.`);
  if (improving.length) wins.push(`${improving[0].name} improved ${improving[0].trend.toFixed(1)}% this week.`);
  if (activeDays >= 4) wins.push(`Consistent cadence — active on ${activeDays} of 7 days.`);
  if (wins.length === 0) wins.push("A fresh week — your first session this week becomes your first win.");

  const mistakes: string[] = [];
  if (declining.length) mistakes.push(`${declining[0].name} declined ${Math.abs(declining[0].trend).toFixed(1)}% — cadence slipped.`);
  if (neglected.length) mistakes.push(`${neglected.length} high-importance concept${neglected.length === 1 ? "" : "s"} went unreviewed for over a week.`);
  if (activeDays > 0 && activeDays < 3) mistakes.push(`Only ${activeDays} active day${activeDays === 1 ? "" : "s"} — momentum needs more frequent touches.`);
  if (mistakes.length === 0) mistakes.push("No major regressions detected this week.");

  const opportunities: string[] = [];
  if (highRoi.length) opportunities.push(`${highRoi[0].name} is your highest-ROI target (ROI ${highRoi[0].roi}).`);
  if (bottlenecks.length) opportunities.push(`Clearing ${bottlenecks[0].name} unlocks ${bottlenecks[0].downstreamCount} downstream concept${bottlenecks[0].downstreamCount === 1 ? "" : "s"}.`);
  if (criticalSubjects.length) opportunities.push(`${criticalSubjects[0].name} has the most headroom to de-risk.`);
  if (opportunities.length === 0) opportunities.push("Compound gains by reinforcing your strongest subjects.");

  const strategicPriorities: string[] = [];
  if (criticalSubjects.length) strategicPriorities.push(`Defend ${criticalSubjects[0].name} before it cascades.`);
  if (bottlenecks.length) strategicPriorities.push(`Recover the bottleneck ${bottlenecks[0].name} first.`);
  if (neglected.length) strategicPriorities.push(`Schedule reviews for ${Math.min(3, neglected.length)} neglected concept${neglected.length === 1 ? "" : "s"}.`);
  strategicPriorities.push(`Hold a ${Math.max(4, activeDays)}-day cadence next week.`);

  return {
    wins,
    mistakes,
    opportunities,
    strategicPriorities,
    improvedSummary: improving.length
      ? `${improving.length} subject${improving.length === 1 ? "" : "s"} trending up, led by ${improving[0].name}.`
      : "No subjects trended up this week.",
    declinedSummary: declining.length
      ? `${declining.length} subject${declining.length === 1 ? "" : "s"} slipped, worst is ${declining[0].name}.`
      : "No subjects declined this week.",
  };
}

// ===================================================================
// ACADEMIC HEALTH SCORE — "How healthy is my academic system?"
// ===================================================================

export interface HealthComponent {
  label: string;
  value: number; // 0–100, normalized so higher = healthier
  weight: number;
}

export interface AcademicHealth {
  score: number; // 0–100
  label: string;
  tone: "success" | "info" | "warning" | "danger";
  components: HealthComponent[];
  headline: string;
}

export function deriveAcademicHealth(s: CoreState, momentum: MomentumReport): AcademicHealth {
  const status = deriveAcademicStatus(s);
  const subjects = deriveSubjects(s);
  const readiness = subjects.length
    ? round(subjects.reduce((a, x) => a + x.readiness, 0) / subjects.length)
    : 0;

  const components: HealthComponent[] = [
    { label: "Mastery", value: status.overallMastery, weight: 0.26 },
    { label: "Memory", value: status.overallMemory, weight: 0.22 },
    { label: "Risk control", value: clamp(100 - status.overallRisk), weight: 0.22 },
    { label: "Momentum", value: momentum.weeklyScore, weight: 0.16 },
    { label: "Assessment readiness", value: readiness, weight: 0.14 },
  ];

  const score = round(components.reduce((a, c) => a + c.value * c.weight, 0));
  const tone: AcademicHealth["tone"] =
    score >= 75 ? "success" : score >= 55 ? "info" : score >= 40 ? "warning" : "danger";
  const label =
    score >= 75 ? "Healthy" : score >= 55 ? "Stable" : score >= 40 ? "Strained" : "At risk";

  const weakest = [...components].sort((a, b) => a.value - b.value)[0];
  const headline = `Your academic system is ${label.toLowerCase()}. ${weakest.label} is the limiting factor at ${weakest.value}/100.`;

  return { score, label, tone, components, headline };
}

// ===================================================================
// MOTIVATION ENGINE — evidence-based, never generic.
// ===================================================================

export function deriveMotivation(
  s: CoreState,
  momentum: MomentumReport,
  victory: DailyVictory | null,
): string[] {
  const out: string[] = [];
  const now = Date.now();
  const weekAgo = now - 7 * DAY;
  const week = s.sessions.filter((x) => x.timestamp >= weekAgo);
  const concepts = deriveConcepts(s);

  const riskReduced = round(week.reduce((a, x) => a + sessionRiskReduced(x), 0));
  if (riskReduced > 0) out.push(`You reduced risk by ~${riskReduced}% this week — measurable, not luck.`);

  const recoveredBottleneck = week
    .filter((x) => x.type === "Recovery")
    .map((x) => concepts.find((c) => c.id === x.conceptId))
    .find((c) => c && c.downstreamCount >= 2);
  if (recoveredBottleneck) {
    out.push(`You recovered ${recoveredBottleneck.name}, a bottleneck affecting ${recoveredBottleneck.downstreamCount} downstream concepts.`);
  }

  if (momentum.trend === "rising") {
    out.push(`Momentum is rising (+${Math.abs(momentum.trendDelta)} pts) — you're ahead of last week's pace.`);
  }

  if (victory && victory.riskReduction > 0) {
    out.push(`Completing today's victory will remove ~${victory.riskReduction} risk points in ${victory.estimatedMinutes} minutes.`);
  }

  const masteryGained = round(week.reduce((a, x) => a + x.gain, 0));
  if (masteryGained >= 20) out.push(`+${masteryGained} mastery points this week is real, compounding progress.`);

  if (out.length === 0) {
    out.push("One focused session today restarts your momentum — the engine will track every point you gain.");
  }
  return out.slice(0, 4);
}

// ===================================================================
// Hook layer — memoised, reactive to the intelligence store.
// ===================================================================

export interface ExecutionBundle {
  momentum: MomentumReport;
  dailyVictory: DailyVictory | null;
  streaks: StreakReport[];
  debrief: DailyDebrief;
  weeklyReview: WeeklyReview;
  health: AcademicHealth;
  motivation: string[];
}

let cache: { version: number; data: ExecutionBundle } | null = null;

function compute(): ExecutionBundle {
  const state = useIntelligenceStore.getState();
  const core: CoreState = {
    conceptsById: state.conceptsById,
    subjectsById: state.subjectsById,
    sessions: state.sessions,
    assessments: state.assessments,
    completedMissionIds: state.completedMissionIds,
  };
  const momentum = deriveMomentum(core);
  const dailyVictory = deriveDailyVictory(core);
  return {
    momentum,
    dailyVictory,
    streaks: deriveStreaks(core),
    debrief: deriveDailyDebrief(core),
    weeklyReview: deriveWeeklyReview(core),
    health: deriveAcademicHealth(core, momentum),
    motivation: deriveMotivation(core, momentum, dailyVictory),
  };
}

function getExecution(): ExecutionBundle {
  const version = useIntelligenceStore.getState().version;
  if (cache && cache.version === version) return cache.data;
  const data = compute();
  cache = { version, data };
  return data;
}

function subscribe(cb: () => void) {
  return useIntelligenceStore.subscribe(cb);
}

export function useExecution(): ExecutionBundle {
  return useSyncExternalStore(subscribe, getExecution, getExecution);
}
