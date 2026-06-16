// Scholaris Academic System Layer.
// ====================================================
// This module is the BEHAVIORAL layer that sits on top of the existing
// intelligence engines. It does not add new prediction engines or new
// analytics — it converts the intelligence that already exists into DAILY
// ACTION. Every output answers an execution/behavior question:
//
//   Main Quest       → "What is the single most important thing to do next?"
//   Discipline       → "How reliable and consistent is my execution?"
//   Recovery Quests  → "What did I miss, and how do I recover it?"
//   Anti-Procrastn.  → "What am I avoiding, and what's the smallest first step?"
//   Accountability   → "Am I doing what the system asked of me?"
//   Identity         → "Who am I becoming through my behavior each week?"
//   Momentum V2      → "Am I accelerating, holding, or reversing?"
//
// It is PURELY DERIVED from the existing intelligence store (sessions,
// assessments, concepts, subjects, completed missions). It never mutates
// state, never touches the database, auth or onboarding. The existing
// intelligence systems remain unchanged and act purely as inputs here.

import { useSyncExternalStore } from "react";
import {
  useIntelligenceStore,
  deriveConcepts,
  deriveSubjects,
  deriveMissions,
  type ConceptCore,
  type SubjectMeta,
  type SessionLogEntry,
  type AssessmentLogEntry,
} from "./intelligence";
import {
  deriveMomentum,
  deriveDailyVictory,
  type MomentumReport,
  type DailyVictory,
  type TrendDirection,
} from "./execution";

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
function daySet(items: { timestamp: number }[]): Set<string> {
  return new Set(items.map((x) => dayKey(x.timestamp)));
}

// Consecutive active days ending today (with a one-day grace window).
function consecutiveDays(set: Set<string>): number {
  if (set.size === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const yStr = new Date(today.getTime() - DAY).toISOString().slice(0, 10);
  let cursor: Date;
  if (set.has(todayStr)) cursor = today;
  else if (set.has(yStr)) cursor = new Date(today.getTime() - DAY);
  else return 0;
  let count = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) {
    count++;
    cursor = new Date(cursor.getTime() - DAY);
  }
  return count;
}

function longestRun(set: Set<string>): number {
  if (set.size === 0) return 0;
  const days = [...set].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]).getTime();
    const cur = new Date(days[i]).getTime();
    if (cur - prev <= DAY * 1.5) run++;
    else run = 1;
    best = Math.max(best, run);
  }
  return best;
}

function idleDays(sessions: SessionLogEntry[]): number {
  if (sessions.length === 0) return 999;
  const last = Math.max(...sessions.map((s) => s.timestamp));
  return Math.floor((Date.now() - last) / DAY);
}

const TARGET_DAYS_PER_WEEK = 5;

// ===================================================================
// DISCIPLINE ENGINE — "How reliable and consistent is my execution?"
// Every completed mission (session) strengthens this score.
// ===================================================================

export type DisciplineTier =
  | "Forging" | "Building" | "Disciplined" | "Relentless" | "Unbreakable";

export interface DisciplineReport {
  score: number;        // 0–100
  tier: DisciplineTier;
  streak: number;       // consecutive active days
  longestStreak: number;
  consistency: number;  // 0–100 — active-day ratio (30d)
  reliability: number;  // 0–100 — follow-through (real sessions / sessions)
  recoveryRate: number; // 0–100 — share of weak work being addressed
  weeklyExecutions: number;
  delta: number;        // vs prior 14-day window
  headline: string;
  components: { label: string; value: number }[];
}

function disciplineTier(score: number): DisciplineTier {
  if (score >= 85) return "Unbreakable";
  if (score >= 68) return "Relentless";
  if (score >= 50) return "Disciplined";
  if (score >= 30) return "Building";
  return "Forging";
}

export function deriveDiscipline(s: CoreState): DisciplineReport {
  const now = Date.now();
  const concepts = deriveConcepts(s);
  const last30 = s.sessions.filter((x) => x.timestamp >= now - 30 * DAY);
  const last14 = s.sessions.filter((x) => x.timestamp >= now - 14 * DAY);
  const prior14 = s.sessions.filter((x) => x.timestamp >= now - 28 * DAY && x.timestamp < now - 14 * DAY);
  const last7 = s.sessions.filter((x) => x.timestamp >= now - 7 * DAY);

  const allDays = daySet(s.sessions);
  const streak = consecutiveDays(allDays);
  const longestStreak = longestRun(allDays);

  const activeDays30 = daySet(last30).size;
  const consistency = clamp((activeDays30 / 22) * 100); // 22 ≈ 5/7 of 30 days

  const real = last30.filter((x) => x.duration >= 20).length;
  const reliability = last30.length ? clamp((real / last30.length) * 100) : 40;

  const weakConcepts = concepts.filter((c) => c.mastery < 55 || c.memoryStrength < 45).length;
  const recoverySessions30 = last30.filter((x) => x.type === "Recovery").length;
  const recoveryRate = clamp((recoverySessions30 / Math.max(1, weakConcepts)) * 100);

  const cadence = clamp((daySet(last7).size / TARGET_DAYS_PER_WEEK) * 100);

  const score = round(
    consistency * 0.34 +
    reliability * 0.26 +
    cadence * 0.22 +
    recoveryRate * 0.18,
  );

  const curExec = last14.filter((x) => x.duration >= 20).length;
  const priorExec = prior14.filter((x) => x.duration >= 20).length;
  const delta = curExec - priorExec;

  const tier = disciplineTier(score);
  const headline =
    streak > 0
      ? `${streak}-day discipline streak — ${tier.toLowerCase()} tier at ${score}/100.`
      : score >= 40
      ? `Discipline holding at ${score}/100 — re-engage today to rebuild your streak.`
      : "Discipline is forming — one real session today sets the foundation.";

  return {
    score,
    tier,
    streak,
    longestStreak,
    consistency: round(consistency),
    reliability: round(reliability),
    recoveryRate: round(recoveryRate),
    weeklyExecutions: last7.filter((x) => x.duration >= 20).length,
    delta,
    headline,
    components: [
      { label: "Consistency", value: round(consistency) },
      { label: "Reliability", value: round(reliability) },
      { label: "Cadence", value: round(cadence) },
      { label: "Recovery", value: round(recoveryRate) },
    ],
  };
}

// ===================================================================
// RECOVERY QUEST ENGINE — "What did I miss, and how do I recover it?"
// Every missed/neglected high-value concept becomes a recovery quest.
// ===================================================================

export interface RecoveryQuest {
  id: string;
  conceptId: string;
  title: string;
  subjectName: string;
  reason: string;
  severity: "critical" | "high" | "medium";
  daysMissed: number;
  masteryGap: number;
  estimatedMinutes: number;
  riskReduction: number;
}

export interface RecoveryReport {
  quests: RecoveryQuest[];
  activeCount: number;
  criticalCount: number;
  headline: string;
}

export function deriveRecovery(s: CoreState): RecoveryReport {
  const concepts = deriveConcepts(s);

  // A concept enters recovery when valuable work was missed: it decayed,
  // its memory is collapsing, or a high-importance concept went unreviewed.
  const candidates = concepts.filter(
    (c) =>
      (c.importance >= 6 && c.daysSinceReview > 5 && c.mastery < 70) ||
      (c.memoryStrength < 40 && c.importance >= 5) ||
      c.mastery < 40,
  );

  const quests: RecoveryQuest[] = candidates
    .map((c) => {
      const severity: RecoveryQuest["severity"] =
        c.importance >= 8 && (c.mastery < 35 || c.daysSinceReview > 10)
          ? "critical"
          : c.importance >= 6 || c.mastery < 35
          ? "high"
          : "medium";
      const masteryGap = round(100 - c.mastery);
      const reason =
        c.daysSinceReview > 10
          ? `Unreviewed for ${c.daysSinceReview} days — knowledge is decaying.`
          : c.memoryStrength < 40
          ? `Memory collapsing (${round(c.memoryStrength)}/100) — recall is at risk.`
          : `Mastery dropped to ${round(c.mastery)}/100 — needs to be recovered.`;
      return {
        id: `recovery-${c.id}`,
        conceptId: c.id,
        title: `Recover ${c.name}`,
        subjectName: c.subjectName,
        reason,
        severity,
        daysMissed: c.daysSinceReview,
        masteryGap,
        estimatedMinutes: masteryGap > 50 ? 35 : 25,
        riskReduction: round(Math.min(40, c.risk * 0.5 + c.importance * 2)),
      };
    })
    .sort((a, b) => {
      const sev = { critical: 3, high: 2, medium: 1 } as const;
      return sev[b.severity] - sev[a.severity] || b.riskReduction - a.riskReduction;
    })
    .slice(0, 8);

  const criticalCount = quests.filter((q) => q.severity === "critical").length;
  const headline =
    quests.length === 0
      ? "No recovery debt — nothing has been missed. Keep the streak alive."
      : criticalCount > 0
      ? `${criticalCount} critical recovery quest${criticalCount === 1 ? "" : "s"} — recover these before they cascade.`
      : `${quests.length} recovery quest${quests.length === 1 ? "" : "s"} queued from missed work.`;

  return { quests, activeCount: quests.length, criticalCount, headline };
}

// ===================================================================
// ANTI-PROCRASTINATION ENGINE — "What am I avoiding?"
// ===================================================================

export interface ProcrastinationReport {
  avoidanceRisk: number; // 0–100 (higher = worse)
  level: "clear" | "watch" | "elevated" | "high";
  idleDays: number;
  deferredCount: number;
  avoidedSubject?: string;
  avoidedReason?: string;
  firstStep: { title: string; minutes: number; missionId?: string; conceptId?: string } | null;
  signals: string[];
  headline: string;
}

export function deriveProcrastination(
  s: CoreState,
  recovery: RecoveryReport,
): ProcrastinationReport {
  const subjects = deriveSubjects(s);
  const missions = deriveMissions(s).filter((m) => !m.completed);
  const idle = idleDays(s.sessions);

  // Long-deferred work: recovery quests neglected over a week.
  const deferred = recovery.quests.filter((q) => q.daysMissed > 7);
  const deferredCount = deferred.length;

  // The most-avoided subject: high risk + little recent time + declining.
  const avoided = [...subjects]
    .filter((x) => x.hoursThisWeek < 1 || x.trend < 0)
    .sort((a, b) => (b.risk - b.hoursThisWeek * 10) - (a.risk - a.hoursThisWeek * 10))[0];

  const signals: string[] = [];
  if (idle >= 2 && idle < 900) signals.push(`No sessions logged for ${idle} days.`);
  if (deferredCount > 0) signals.push(`${deferredCount} task${deferredCount === 1 ? "" : "s"} deferred for over a week.`);
  const criticalOutstanding = missions.filter((m) => m.priority === "critical").length;
  if (criticalOutstanding > 0) signals.push(`${criticalOutstanding} critical mission${criticalOutstanding === 1 ? "" : "s"} untouched.`);
  if (avoided) signals.push(`${avoided.name} is being avoided despite ${avoided.risk}/100 risk.`);

  const avoidanceRisk = clamp(
    Math.min(40, idle >= 900 ? 18 : idle * 9) +
    deferredCount * 12 +
    criticalOutstanding * 10 +
    (avoided ? clamp(avoided.risk * 0.25, 0, 22) : 0),
  );

  const level: ProcrastinationReport["level"] =
    avoidanceRisk >= 70 ? "high" : avoidanceRisk >= 45 ? "elevated" : avoidanceRisk >= 22 ? "watch" : "clear";

  // The smallest first step to break inertia: lowest-friction real action.
  const easiestRecovery = [...recovery.quests].sort((a, b) => a.estimatedMinutes - b.estimatedMinutes)[0];
  const shortestMission = [...missions].sort((a, b) => a.estimatedMinutes - b.estimatedMinutes)[0];
  let firstStep: ProcrastinationReport["firstStep"] = null;
  if (shortestMission && (!easiestRecovery || shortestMission.estimatedMinutes <= easiestRecovery.estimatedMinutes)) {
    firstStep = {
      title: shortestMission.title,
      minutes: Math.min(15, shortestMission.estimatedMinutes),
      missionId: shortestMission.id,
    };
  } else if (easiestRecovery) {
    firstStep = {
      title: easiestRecovery.title,
      minutes: Math.min(15, easiestRecovery.estimatedMinutes),
      conceptId: easiestRecovery.conceptId,
    };
  }

  const headline =
    level === "clear"
      ? "No avoidance detected — you're acting on what matters."
      : level === "watch"
      ? "Mild drift forming — a 15-minute start keeps it from compounding."
      : level === "elevated"
      ? "Avoidance is building. Break it with one small action right now."
      : "High avoidance — stop the spiral with the smallest possible first step.";

  return {
    avoidanceRisk,
    level,
    idleDays: idle >= 900 ? 0 : idle,
    deferredCount,
    avoidedSubject: avoided?.name,
    avoidedReason: avoided ? `${avoided.risk}/100 risk · ${avoided.hoursThisWeek}h this week` : undefined,
    firstStep,
    signals: signals.slice(0, 4),
    headline,
  };
}

// ===================================================================
// ACCOUNTABILITY ENGINE — "Am I doing what the system asked?"
// ===================================================================

export interface AccountabilityReport {
  reliabilityScore: number; // 0–100
  rating: "Unproven" | "Developing" | "Reliable" | "Trusted" | "Exemplary";
  commitmentsKept: number;
  commitmentsTarget: number;
  lapses: number;
  weeklyContract: { label: string; met: boolean; today: boolean }[];
  headline: string;
}

export function deriveAccountability(s: CoreState): AccountabilityReport {
  const active = daySet(s.sessions);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weeklyContract: AccountabilityReport["weeklyContract"] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY);
    const key = d.toISOString().slice(0, 10);
    weeklyContract.push({
      label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      met: active.has(key),
      today: i === 0,
    });
  }

  const kept = weeklyContract.filter((d) => d.met).length;
  const elapsed = weeklyContract.filter((d) => !d.today).length || 1;
  const lapses = Math.max(0, Math.min(TARGET_DAYS_PER_WEEK, elapsed) - kept);

  const reliabilityScore = clamp(
    (kept / TARGET_DAYS_PER_WEEK) * 100 - lapses * 6,
  );
  const rating: AccountabilityReport["rating"] =
    reliabilityScore >= 85 ? "Exemplary" :
    reliabilityScore >= 65 ? "Trusted" :
    reliabilityScore >= 45 ? "Reliable" :
    reliabilityScore >= 25 ? "Developing" : "Unproven";

  const headline =
    kept >= TARGET_DAYS_PER_WEEK
      ? `Every commitment kept this week — ${rating.toLowerCase()} reliability.`
      : `${kept}/${TARGET_DAYS_PER_WEEK} commitments kept${lapses ? `, ${lapses} lapse${lapses === 1 ? "" : "s"}` : ""}. Show up today to stay accountable.`;

  return {
    reliabilityScore: round(reliabilityScore),
    rating,
    commitmentsKept: kept,
    commitmentsTarget: TARGET_DAYS_PER_WEEK,
    lapses,
    weeklyContract,
    headline,
  };
}

// ===================================================================
// IDENTITY EVOLUTION ENGINE — "Who am I becoming?" (updates weekly)
// ===================================================================

export interface IdentityReport {
  archetype: string;
  title: string;
  level: number;
  levelProgress: number; // 0–100 to next level
  evolutionPoints: number;
  pointsToNext: number;
  evolvedThisWeek: boolean;
  traits: { label: string; value: number }[];
  weeklyGrowth: { trait: string; delta: number }[];
  headline: string;
}

const IDENTITY_TITLES = [
  "Novice", "Apprentice", "Practitioner", "Scholar",
  "Strategist", "Master", "Luminary",
];

export function deriveIdentity(
  s: CoreState,
  discipline: DisciplineReport,
  accountability: AccountabilityReport,
  momentum: MomentumReport,
  recovery: RecoveryReport,
): IdentityReport {
  const now = Date.now();
  const concepts = deriveConcepts(s);
  const week = s.sessions.filter((x) => x.timestamp >= now - 7 * DAY);
  const prior = s.sessions.filter((x) => x.timestamp >= now - 14 * DAY && x.timestamp < now - 7 * DAY);

  // Strategy trait: share of work aimed at high-leverage (bottleneck / high-ROI) concepts.
  const highValueIds = new Set(
    concepts.filter((c) => c.isBottleneck || c.roi >= 65).map((c) => c.id),
  );
  const strategicWeek = week.filter((x) => highValueIds.has(x.conceptId)).length;
  const strategy = week.length ? clamp((strategicWeek / week.length) * 100) : 30;

  const traits = [
    { label: "Consistency", value: discipline.consistency },
    { label: "Recovery", value: discipline.recoveryRate },
    { label: "Reliability", value: accountability.reliabilityScore },
    { label: "Execution", value: momentum.weeklyScore },
    { label: "Strategy", value: round(strategy) },
  ];

  // Archetype = the dominant, defining trait.
  const dominant = [...traits].sort((a, b) => b.value - a.value)[0];
  const archetypeByTrait: Record<string, string> = {
    Consistency: "The Consistent",
    Recovery: "The Reviver",
    Reliability: "The Dependable",
    Execution: "The Executor",
    Strategy: "The Strategist",
  };
  const archetype = dominant.value >= 25 ? archetypeByTrait[dominant.label] : "The Beginner";

  // Evolution points accumulate from REAL behavior — not cosmetic XP.
  // Durable signal: completed work, recovered concepts, disciplined weeks.
  const totalExecutions = s.sessions.filter((x) => x.duration >= 20).length;
  const totalRecoveries = s.sessions.filter((x) => x.type === "Recovery").length;
  const masteredConcepts = concepts.filter((c) => c.mastery >= 80).length;
  const evolutionPoints =
    totalExecutions * 10 + totalRecoveries * 8 + masteredConcepts * 15 + discipline.longestStreak * 6;

  // Level curve: each level needs progressively more real work.
  const levelFor = (pts: number) => Math.max(1, Math.floor(Math.sqrt(pts / 40)) + 1);
  const pointsForLevel = (lvl: number) => Math.pow(lvl - 1, 2) * 40;
  const level = levelFor(evolutionPoints);
  const floorPts = pointsForLevel(level);
  const nextPts = pointsForLevel(level + 1);
  const levelProgress = clamp(((evolutionPoints - floorPts) / Math.max(1, nextPts - floorPts)) * 100);
  const pointsToNext = Math.max(0, nextPts - evolutionPoints);

  const title = IDENTITY_TITLES[Math.min(IDENTITY_TITLES.length - 1, level - 1)];

  // Weekly growth — what strengthened vs last week.
  const weekReal = week.filter((x) => x.duration >= 20).length;
  const priorReal = prior.filter((x) => x.duration >= 20).length;
  const weekRec = week.filter((x) => x.type === "Recovery").length;
  const priorRec = prior.filter((x) => x.type === "Recovery").length;
  const weeklyGrowth = [
    { trait: "Execution", delta: weekReal - priorReal },
    { trait: "Recovery", delta: weekRec - priorRec },
    { trait: "Consistency", delta: daySet(week).size - daySet(prior).size },
  ].filter((g) => g.delta !== 0);

  const evolvedThisWeek = weeklyGrowth.some((g) => g.delta > 0);

  const headline =
    archetype === "The Beginner"
      ? "Your academic identity is forming — your behavior this week defines it."
      : evolvedThisWeek
      ? `You're evolving into ${archetype} — strengths grew this week.`
      : `You are ${archetype}. Hold the line to reach Level ${level + 1}.`;

  return {
    archetype,
    title,
    level,
    levelProgress: round(levelProgress),
    evolutionPoints: round(evolutionPoints),
    pointsToNext: round(pointsToNext),
    evolvedThisWeek,
    traits,
    weeklyGrowth,
    headline,
  };
}

// ===================================================================
// MOMENTUM ENGINE V2 — unified behavioral momentum.
// ===================================================================

export interface MomentumV2Report {
  base: MomentumReport;
  unifiedScore: number; // 0–100
  state: "accelerating" | "steady" | "stalling" | "reversing";
  trend: TrendDirection;
  trendDelta: number;
  dimensions: { label: string; value: number }[];
  headline: string;
}

export function deriveMomentumV2(
  base: MomentumReport,
  discipline: DisciplineReport,
  accountability: AccountabilityReport,
  procrastination: ProcrastinationReport,
): MomentumV2Report {
  const execution = base.weeklyScore;
  const resistance = clamp(100 - procrastination.avoidanceRisk);

  const unifiedScore = round(
    execution * 0.4 +
    discipline.score * 0.25 +
    accountability.reliabilityScore * 0.2 +
    resistance * 0.15,
  );

  const state: MomentumV2Report["state"] =
    base.trend === "declining" && unifiedScore < 45
      ? "reversing"
      : base.trend === "declining" || unifiedScore < 40
      ? "stalling"
      : base.trend === "rising" && unifiedScore >= 55
      ? "accelerating"
      : "steady";

  const headline =
    state === "accelerating"
      ? `Accelerating — unified momentum ${unifiedScore}/100 and rising.`
      : state === "steady"
      ? `Steady momentum at ${unifiedScore}/100 — protect the cadence.`
      : state === "stalling"
      ? `Stalling at ${unifiedScore}/100 — one focused action restarts it.`
      : `Reversing — momentum at ${unifiedScore}/100. Recover today before it compounds.`;

  return {
    base,
    unifiedScore,
    state,
    trend: base.trend,
    trendDelta: base.trendDelta,
    dimensions: [
      { label: "Execution", value: round(execution) },
      { label: "Discipline", value: discipline.score },
      { label: "Reliability", value: accountability.reliabilityScore },
      { label: "Resistance", value: round(resistance) },
    ],
    headline,
  };
}

// ===================================================================
// MAIN QUEST SYSTEM — "What is the single most important thing next?"
// ===================================================================

export interface SideQuest {
  missionId: string;
  title: string;
  subjectName: string;
  minutes: number;
  roi: number;
  priority: string;
}

export interface MainQuestReport {
  victory: DailyVictory | null;
  directive: string;
  stakes: string;
  sideQuests: SideQuest[];
}

export function deriveMainQuest(s: CoreState): MainQuestReport {
  const victory = deriveDailyVictory(s);
  const missions = deriveMissions(s).filter((m) => !m.completed);

  const ranked = [...missions].sort((a, b) => {
    const pri = { critical: 3, high: 2, medium: 1, low: 0 } as const;
    return pri[b.priority] * 40 + b.roiScore - (pri[a.priority] * 40 + a.roiScore);
  });
  const sideQuests: SideQuest[] = ranked
    .filter((m) => m.id !== victory?.missionId)
    .slice(0, 3)
    .map((m) => ({
      missionId: m.id,
      title: m.title,
      subjectName: m.subjectName,
      minutes: m.estimatedMinutes,
      roi: m.roiScore,
      priority: m.priority,
    }));

  const directive = victory
    ? `Do this first: ${victory.title}.`
    : "Your queue is clear — log a session to keep momentum alive.";

  const stakes = victory
    ? victory.riskReduction > 0
      ? `Skipping it leaves ~${victory.riskReduction} risk points on the board.`
      : victory.futureImpact
    : "Nothing is at immediate risk — a great moment to get ahead.";

  return { victory, directive, stakes, sideQuests };
}

// ===================================================================
// Hook layer — memoised, reactive to the intelligence store.
// ===================================================================

export interface AcademicSystemBundle {
  mainQuest: MainQuestReport;
  discipline: DisciplineReport;
  recovery: RecoveryReport;
  procrastination: ProcrastinationReport;
  accountability: AccountabilityReport;
  identity: IdentityReport;
  momentum: MomentumV2Report;
}

let cache: { version: number; data: AcademicSystemBundle } | null = null;

function compute(): AcademicSystemBundle {
  const state = useIntelligenceStore.getState();
  const core: CoreState = {
    conceptsById: state.conceptsById,
    subjectsById: state.subjectsById,
    sessions: state.sessions,
    assessments: state.assessments,
    completedMissionIds: state.completedMissionIds,
  };

  const baseMomentum = deriveMomentum(core);
  const discipline = deriveDiscipline(core);
  const recovery = deriveRecovery(core);
  const accountability = deriveAccountability(core);
  const procrastination = deriveProcrastination(core, recovery);
  const momentum = deriveMomentumV2(baseMomentum, discipline, accountability, procrastination);
  const identity = deriveIdentity(core, discipline, accountability, baseMomentum, recovery);
  const mainQuest = deriveMainQuest(core);

  return { mainQuest, discipline, recovery, procrastination, accountability, identity, momentum };
}

function getSystem(): AcademicSystemBundle {
  const version = useIntelligenceStore.getState().version;
  if (cache && cache.version === version) return cache.data;
  const data = compute();
  cache = { version, data };
  return data;
}

function subscribe(cb: () => void) {
  return useIntelligenceStore.subscribe(cb);
}

export function useAcademicSystem(): AcademicSystemBundle {
  return useSyncExternalStore(subscribe, getSystem, getSystem);
}
