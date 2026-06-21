// Scholaris Daily Operating System.
// ====================================================================
// Composes every existing engine (Intelligence, Execution, Predictive,
// Academic System) into the daily ritual that drives Scholaris:
//
//   Morning Briefing   → direction for the day
//   System Status      → discipline / momentum / identity / health / outlook
//   Strategic Alerts   → early intervention signals
//   Execution Plan     → today's prioritised sequence
//   Recovery Center    → what was missed + smallest useful action
//   Session Rec.       → which kind of session to run, and why
//   Evening Debrief    → performance + discipline + momentum + identity review
//   Tomorrow Preview   → never wake up unsure of what to do next
//   Weekly Review      → growth, mistakes, focus next week
//
// No new prediction engine, no new state. Pure composition of what the
// system already knows, turned into daily direction and accountability.

import { useMemo } from "react";
import {
  useIntelligence,
  type DerivedMission,
  type DerivedInsight,
} from "./intelligence";
import {
  useExecution,
  type DailyVictory,
  type DailyDebrief,
  type WeeklyReview as WeeklyReviewReport,
  type AcademicHealth,
  type MomentumReport,
} from "./execution";
import {
  useAcademicSystem,
  type DisciplineReport,
  type RecoveryQuest,
  type RecoveryReport,
  type AccountabilityReport,
  type IdentityReport,
  type MomentumV2Report,
  type MainQuestReport,
  type ProcrastinationReport,
} from "./academic-system";
import {
  usePredictive,
  type AssessmentForecast,
  type ForgettingAlert,
} from "./predictive";

export type DayPhase = "morning" | "midday" | "evening" | "night";

export function currentPhase(d: Date = new Date()): DayPhase {
  const h = d.getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "midday";
  if (h < 22) return "evening";
  return "night";
}

function greetingFor(phase: DayPhase, name = "Alex"): string {
  switch (phase) {
    case "morning": return `Good morning, ${name}.`;
    case "midday":  return `Midday check-in, ${name}.`;
    case "evening": return `Evening, ${name}.`;
    case "night":   return `Late night, ${name}.`;
  }
}

// =============================================================
// SYSTEM STATUS — the at-a-glance vital signs
// =============================================================

export type StrategicOutlook = "Strong" | "On Track" | "At Risk" | "Critical";

export interface SystemStatus {
  discipline: number;
  disciplineTier: string;
  momentum: number;
  momentumState: MomentumV2Report["state"];
  momentumTrend: MomentumReport["trend"];
  identityTitle: string;
  identityArchetype: string;
  identityLevel: number;
  health: number;
  healthLabel: AcademicHealth["label"];
  healthTone: AcademicHealth["tone"];
  outlook: StrategicOutlook;
  outlookReason: string;
}

function deriveOutlook(
  health: AcademicHealth,
  momentum: MomentumV2Report,
  procrastination: ProcrastinationReport,
  assessments: AssessmentForecast[],
): { outlook: StrategicOutlook; reason: string } {
  const urgentExam = assessments.find((a) => a.daysToAssessment <= 10 && a.readinessAtExam < 60);
  if (health.tone === "danger" || momentum.state === "reversing" || urgentExam) {
    return {
      outlook: "Critical",
      reason: urgentExam
        ? `${urgentExam.subjectName} assessment in ${urgentExam.daysToAssessment}d at ${urgentExam.readinessAtExam}% readiness.`
        : "Health and momentum are eroding — intervene today.",
    };
  }
  if (health.tone === "warning" || momentum.state === "stalling" || procrastination.level === "elevated" || procrastination.level === "high") {
    return { outlook: "At Risk", reason: "Drift forming — execute the main quest to stabilise." };
  }
  if (momentum.state === "accelerating" && health.score >= 70) {
    return { outlook: "Strong", reason: "Health, momentum and discipline all aligned." };
  }
  return { outlook: "On Track", reason: "Steady cadence — protect it." };
}

// =============================================================
// STRATEGIC ALERTS
// =============================================================

export interface StrategicAlert {
  id: string;
  severity: "critical" | "high" | "medium" | "info";
  icon: "memory" | "exam" | "risk" | "momentum" | "recovery" | "discipline";
  title: string;
  detail: string;
  cta?: { to: string; label: string };
}

function buildAlerts(args: {
  forgetting: ForgettingAlert[];
  assessments: AssessmentForecast[];
  recovery: RecoveryReport;
  momentum: MomentumV2Report;
  discipline: DisciplineReport;
  procrastination: ProcrastinationReport;
  insights: DerivedInsight[];
}): StrategicAlert[] {
  const out: StrategicAlert[] = [];

  for (const f of args.forgetting.slice(0, 3)) {
    out.push({
      id: `forget-${f.conceptId}`,
      severity: f.severity === "critical" ? "critical" : f.severity === "high" ? "high" : "medium",
      icon: "memory",
      title: `${f.conceptName} likely forgotten in ${f.daysUntil}d`,
      detail: `${f.subjectName} · importance ${f.importance}/10. Review now to reset the decay clock.`,
      cta: { to: "/memory", label: "Review" },
    });
  }
  for (const a of args.assessments.slice(0, 2)) {
    if (a.daysToAssessment > 14) continue;
    const sev: StrategicAlert["severity"] =
      a.daysToAssessment <= 5 ? "critical" : a.daysToAssessment <= 10 ? "high" : "medium";
    out.push({
      id: `exam-${a.subjectId}`,
      severity: sev,
      icon: "exam",
      title: `${a.subjectName} assessment in ${a.daysToAssessment}d`,
      detail: `Readiness ${a.readinessNow}% → projected ${a.readinessAtExam}%. Likely band ${a.projectedScore.low}–${a.projectedScore.high}%.`,
      cta: { to: "/battlefield", label: "Prepare" },
    });
  }
  if (args.momentum.state === "reversing" || args.momentum.state === "stalling") {
    out.push({
      id: "momentum-decline",
      severity: args.momentum.state === "reversing" ? "high" : "medium",
      icon: "momentum",
      title: `Momentum ${args.momentum.state}`,
      detail: args.momentum.headline,
    });
  }
  if (args.recovery.criticalCount > 0) {
    out.push({
      id: "recovery-critical",
      severity: "high",
      icon: "recovery",
      title: `${args.recovery.criticalCount} critical recovery quest${args.recovery.criticalCount === 1 ? "" : "s"} pending`,
      detail: "Recover these before they cascade into dependent concepts.",
    });
  }
  if (args.procrastination.level === "high" || args.procrastination.level === "elevated") {
    out.push({
      id: "avoidance",
      severity: args.procrastination.level === "high" ? "high" : "medium",
      icon: "discipline",
      title: args.procrastination.avoidedSubject
        ? `${args.procrastination.avoidedSubject} is being avoided`
        : "Avoidance pattern detected",
      detail: args.procrastination.headline,
    });
  }
  if (args.discipline.streak === 0 && args.discipline.longestStreak > 2) {
    out.push({
      id: "streak-broken",
      severity: "medium",
      icon: "discipline",
      title: "Streak broken",
      detail: `Longest streak was ${args.discipline.longestStreak} days. One session today restarts it.`,
    });
  }
  for (const i of args.insights.filter((x) => x.severity === "critical").slice(0, 2)) {
    if (out.some((o) => o.title === i.title)) continue;
    out.push({
      id: `ins-${i.id}`,
      severity: "high",
      icon: "risk",
      title: i.title,
      detail: i.description,
    });
  }
  const sev = { critical: 3, high: 2, medium: 1, info: 0 } as const;
  return out.sort((a, b) => sev[b.severity] - sev[a.severity]).slice(0, 6);
}

// =============================================================
// EXECUTION PLAN
// =============================================================

export interface ExecutionPlanItem {
  id: string;
  kind: "main" | "critical" | "recovery" | "assessment" | "roi" | "risk";
  title: string;
  subject?: string;
  minutes: number;
  reason: string;
  missionId?: string;
  conceptId?: string;
}

function buildExecutionPlan(
  victory: DailyVictory | null,
  missions: DerivedMission[],
  recovery: RecoveryReport,
  assessments: AssessmentForecast[],
): ExecutionPlanItem[] {
  const plan: ExecutionPlanItem[] = [];
  const used = new Set<string>();

  if (victory) {
    plan.push({
      id: `main-${victory.missionId}`,
      kind: "main",
      title: victory.title,
      subject: victory.subjectName,
      minutes: victory.estimatedMinutes,
      reason: victory.whyItMatters,
      missionId: victory.missionId,
    });
    used.add(victory.missionId);
  }

  const critical = missions
    .filter((m) => !m.completed && m.priority === "critical" && !used.has(m.id))
    .slice(0, 2);
  for (const m of critical) {
    plan.push({
      id: `crit-${m.id}`,
      kind: "critical",
      title: m.title,
      subject: m.subjectName,
      minutes: m.estimatedMinutes,
      reason: m.reason,
      missionId: m.id,
    });
    used.add(m.id);
  }

  for (const a of assessments.filter((x) => x.daysToAssessment <= 10 && x.readinessAtExam < 75).slice(0, 1)) {
    plan.push({
      id: `asmt-${a.subjectId}`,
      kind: "assessment",
      title: `Prepare for ${a.subjectName} assessment`,
      subject: a.subjectName,
      minutes: 35,
      reason: `In ${a.daysToAssessment}d · readiness ${a.readinessNow}%`,
    });
  }

  for (const q of recovery.quests.filter((q) => q.severity !== "medium").slice(0, 2)) {
    plan.push({
      id: q.id,
      kind: "recovery",
      title: q.title,
      subject: q.subjectName,
      minutes: q.estimatedMinutes,
      reason: q.reason,
      conceptId: q.conceptId,
    });
  }

  const highRoi = missions
    .filter((m) => !m.completed && !used.has(m.id) && m.roiScore >= 65)
    .sort((a, b) => b.roiScore - a.roiScore)
    .slice(0, 1);
  for (const m of highRoi) {
    plan.push({
      id: `roi-${m.id}`,
      kind: "roi",
      title: m.title,
      subject: m.subjectName,
      minutes: m.estimatedMinutes,
      reason: `ROI ${m.roiScore}/100 · ${m.reason}`,
      missionId: m.id,
    });
  }

  return plan.slice(0, 6);
}

// =============================================================
// SESSION RECOMMENDATION
// =============================================================

export interface SessionRecommendation {
  kind: "deep" | "pomodoro" | "recovery" | "focus";
  label: string;
  minutes: number;
  reasoning: string;
}

function recommendSession(args: {
  momentum: MomentumV2Report;
  discipline: DisciplineReport;
  recovery: RecoveryReport;
  procrastination: ProcrastinationReport;
  assessments: AssessmentForecast[];
}): SessionRecommendation {
  const examSoon = args.assessments.some((a) => a.daysToAssessment <= 7);

  if (args.procrastination.level === "high" || args.discipline.streak === 0) {
    return {
      kind: "pomodoro",
      label: "Pomodoro",
      minutes: 25,
      reasoning: "Avoidance is high — a short 25-minute block breaks inertia without overwhelm.",
    };
  }
  if (args.recovery.criticalCount > 0) {
    return {
      kind: "recovery",
      label: "Recovery Session",
      minutes: 30,
      reasoning: "Critical recovery debt — restore the weakest concept before extending forward.",
    };
  }
  if (examSoon) {
    return {
      kind: "deep",
      label: "Deep Work",
      minutes: 90,
      reasoning: "Assessment in under a week — a long block compounds preparation faster.",
    };
  }
  if (args.momentum.state === "accelerating" && args.discipline.score >= 60) {
    return {
      kind: "deep",
      label: "Deep Work",
      minutes: 75,
      reasoning: "Momentum is accelerating — extend the block to ride it.",
    };
  }
  return {
    kind: "focus",
    label: "Focus Session",
    minutes: 50,
    reasoning: "Standard focus block keeps discipline and momentum stable.",
  };
}

// =============================================================
// MORNING BRIEFING
// =============================================================

export interface MorningBriefing {
  greeting: string;
  systemStatus: SystemStatus;
  mainQuest: MainQuestReport;
  criticalQuests: ExecutionPlanItem[];
  strategicAlerts: StrategicAlert[];
  recovery: {
    quests: RecoveryQuest[];
    smallestAction: { title: string; minutes: number; missionId?: string; conceptId?: string } | null;
    headline: string;
  };
  executionPlan: ExecutionPlanItem[];
  sessionRecommendation: SessionRecommendation;
}

// =============================================================
// EVENING DEBRIEF
// =============================================================

export interface EveningDebrief {
  hadActivity: boolean;
  performance: {
    missionsCompleted: number;
    conceptsImproved: number;
    masteryGained: number;
    riskReduced: number;
    studyMinutes: number;
    biggestAchievement: string;
    executionQuality: "Strong" | "Solid" | "Light" | "None";
  };
  discipline: {
    promisesKept: number;
    promisesTarget: number;
    promisesBroken: number;
    consistency: number;
    reliability: number;
    recoveryRate: number;
    rating: AccountabilityReport["rating"];
  };
  momentum: {
    score: number;
    delta: number;
    trend: MomentumReport["trend"];
    executionQuality: string;
  };
  identity: {
    title: string;
    archetype: string;
    level: number;
    growth: { trait: string; delta: number }[];
  };
  reflections: string[];
}

function executionQuality(d: DailyDebrief): "Strong" | "Solid" | "Light" | "None" {
  if (!d.hadActivity) return "None";
  if (d.missionsCompleted >= 3 && d.masteryGained >= 8) return "Strong";
  if (d.missionsCompleted >= 1) return "Solid";
  return "Light";
}

function buildReflections(args: {
  debrief: DailyDebrief;
  discipline: DisciplineReport;
  recovery: RecoveryReport;
  momentum: MomentumV2Report;
  victory: DailyVictory | null;
  identity: IdentityReport;
  accountability: AccountabilityReport;
}): string[] {
  const out: string[] = [];
  const d = args.debrief;
  if (!d.hadActivity) {
    out.push("No work logged today. A 15-minute session before sleep preserves your streak and keeps momentum alive.");
    return out;
  }
  if (args.victory && d.missionsCompleted >= 1) {
    out.push(`You acted on today's highest-value work and gained +${d.masteryGained} mastery across ${d.conceptsImproved} concept${d.conceptsImproved === 1 ? "" : "s"}.`);
  } else {
    out.push(`You logged ${d.timeInvested} minutes and improved ${d.conceptsImproved} concept${d.conceptsImproved === 1 ? "" : "s"} — the main quest still stands for tomorrow.`);
  }
  if (args.recovery.activeCount === 0) {
    out.push("No recovery debt — your knowledge base is being maintained well.");
  } else if (d.missionsCompleted > 0 && args.recovery.activeCount > 0) {
    out.push(`${args.recovery.activeCount} recovery quest${args.recovery.activeCount === 1 ? "" : "s"} remain — clearing one tomorrow compounds reliability.`);
  }
  if (args.discipline.streak >= 3) {
    out.push(`${args.discipline.streak}-day discipline streak — consistency is becoming identity.`);
  }
  if (args.accountability.commitmentsKept >= args.accountability.commitmentsTarget) {
    out.push("Every commitment kept this week — this is how reliability is built.");
  }
  if (args.momentum.state === "accelerating") {
    out.push("Momentum is accelerating — protect tomorrow's first 25 minutes.");
  } else if (args.momentum.state === "reversing") {
    out.push("Momentum reversed today — the smallest action tomorrow stops the slide.");
  }
  if (args.identity.evolvedThisWeek) {
    out.push(`Your identity strengthened this week toward ${args.identity.archetype}.`);
  }
  return out.slice(0, 5);
}

// =============================================================
// TOMORROW PREVIEW
// =============================================================

export interface TomorrowPreview {
  mainQuest: { title: string; subject: string; minutes: number; reason: string } | null;
  upcomingAssessments: { subject: string; days: number; readiness: number }[];
  criticalRisks: { title: string; detail: string }[];
  recoveryNeeds: { title: string; subject: string; minutes: number }[];
  strategicFocus: string;
}

// =============================================================
// WEEKLY REVIEW
// =============================================================

export interface WeeklyDigest {
  greatestAchievement: string;
  biggestMistake: string;
  mostImprovedSubject: string;
  highestRiskSubject: string;
  disciplineTrend: string;
  momentumTrend: string;
  identityGrowth: string;
  recommendedFocus: string;
  raw: WeeklyReviewReport;
}

// =============================================================
// BUNDLE
// =============================================================

export interface DailyOSBundle {
  phase: DayPhase;
  date: Date;
  systemStatus: SystemStatus;
  briefing: MorningBriefing;
  debrief: EveningDebrief;
  tomorrow: TomorrowPreview;
  weekly: WeeklyDigest;
}

export function useDailyOS(): DailyOSBundle {
  const { missions, insights, subjects } = useIntelligence();
  const execution = useExecution();
  const academic = useAcademicSystem();
  const predictive = usePredictive();

  return useMemo(() => {
    const phase = currentPhase();
    const date = new Date();

    const outlook = deriveOutlook(
      execution.health,
      academic.momentum,
      academic.procrastination,
      predictive.assessmentForecasts,
    );

    const systemStatus: SystemStatus = {
      discipline: academic.discipline.score,
      disciplineTier: academic.discipline.tier,
      momentum: academic.momentum.unifiedScore,
      momentumState: academic.momentum.state,
      momentumTrend: academic.momentum.trend,
      identityTitle: academic.identity.title,
      identityArchetype: academic.identity.archetype,
      identityLevel: academic.identity.level,
      health: execution.health.score,
      healthLabel: execution.health.label,
      healthTone: execution.health.tone,
      outlook: outlook.outlook,
      outlookReason: outlook.reason,
    };

    const alerts = buildAlerts({
      forgetting: predictive.forgettingForecast.alerts,
      assessments: predictive.assessmentForecasts,
      recovery: academic.recovery,
      momentum: academic.momentum,
      discipline: academic.discipline,
      procrastination: academic.procrastination,
      insights,
    });

    const plan = buildExecutionPlan(
      academic.mainQuest.victory,
      missions,
      academic.recovery,
      predictive.assessmentForecasts,
    );

    const criticalQuests = plan.filter((p) => p.kind !== "main").slice(0, 4);

    const briefing: MorningBriefing = {
      greeting: greetingFor(phase),
      systemStatus,
      mainQuest: academic.mainQuest,
      criticalQuests,
      strategicAlerts: alerts,
      recovery: {
        quests: academic.recovery.quests.slice(0, 5),
        smallestAction: academic.procrastination.firstStep,
        headline: academic.recovery.headline,
      },
      executionPlan: plan,
      sessionRecommendation: recommendSession({
        momentum: academic.momentum,
        discipline: academic.discipline,
        recovery: academic.recovery,
        procrastination: academic.procrastination,
        assessments: predictive.assessmentForecasts,
      }),
    };

    const d = execution.dailyDebrief;
    const debrief: EveningDebrief = {
      hadActivity: d.hadActivity,
      performance: {
        missionsCompleted: d.missionsCompleted,
        conceptsImproved: d.conceptsImproved,
        masteryGained: d.masteryGained,
        riskReduced: d.riskReduced,
        studyMinutes: d.timeInvested,
        biggestAchievement: d.biggestAchievement,
        executionQuality: executionQuality(d),
      },
      discipline: {
        promisesKept: academic.accountability.commitmentsKept,
        promisesTarget: academic.accountability.commitmentsTarget,
        promisesBroken: academic.accountability.lapses,
        consistency: academic.discipline.consistency,
        reliability: academic.discipline.reliability,
        recoveryRate: academic.discipline.recoveryRate,
        rating: academic.accountability.rating,
      },
      momentum: {
        score: academic.momentum.unifiedScore,
        delta: academic.momentum.trendDelta,
        trend: academic.momentum.trend,
        executionQuality: academic.momentum.base.headline,
      },
      identity: {
        title: academic.identity.title,
        archetype: academic.identity.archetype,
        level: academic.identity.level,
        growth: academic.identity.weeklyGrowth,
      },
      reflections: buildReflections({
        debrief: d,
        discipline: academic.discipline,
        recovery: academic.recovery,
        momentum: academic.momentum,
        victory: academic.mainQuest.victory,
        identity: academic.identity,
        accountability: academic.accountability,
      }),
    };

    const mq = academic.mainQuest.victory;
    const tomorrow: TomorrowPreview = {
      mainQuest: mq
        ? { title: mq.title, subject: mq.subjectName, minutes: mq.estimatedMinutes, reason: mq.whyItMatters }
        : null,
      upcomingAssessments: predictive.assessmentForecasts
        .filter((a) => a.daysToAssessment <= 14)
        .slice(0, 3)
        .map((a) => ({ subject: a.subjectName, days: a.daysToAssessment, readiness: a.readinessNow })),
      criticalRisks: alerts
        .filter((a) => a.severity === "critical" || a.severity === "high")
        .slice(0, 3)
        .map((a) => ({ title: a.title, detail: a.detail })),
      recoveryNeeds: academic.recovery.quests
        .slice(0, 3)
        .map((q) => ({ title: q.title, subject: q.subjectName, minutes: q.estimatedMinutes })),
      strategicFocus:
        mq ? `Lead with ${mq.title} — ${mq.whyItMatters}` :
        subjects.length === 0 ? "Import your syllabus to seed tomorrow's plan." :
        "Hold cadence and clear remaining recovery debt.",
    };

    const w = execution.weeklyReview;
    const improvedSubject = w.improvedSummary;
    const declinedSubject = w.declinedSummary;
    const weekly: WeeklyDigest = {
      greatestAchievement: w.wins[0] ?? "No wins logged yet this week.",
      biggestMistake: w.mistakes[0] ?? "No major mistakes this week.",
      mostImprovedSubject: improvedSubject,
      highestRiskSubject: declinedSubject,
      disciplineTrend:
        academic.discipline.delta > 0
          ? `Discipline up — ${academic.discipline.delta} more real sessions vs last fortnight.`
          : academic.discipline.delta < 0
          ? `Discipline down — ${Math.abs(academic.discipline.delta)} fewer real sessions vs last fortnight.`
          : "Discipline holding steady.",
      momentumTrend:
        academic.momentum.trend === "rising" ? "Momentum trending upward." :
        academic.momentum.trend === "declining" ? "Momentum trending downward." :
        "Momentum stable.",
      identityGrowth: academic.identity.headline,
      recommendedFocus: w.strategicPriorities[0] ?? "Hold cadence next week.",
      raw: w,
    };

    return { phase, date, systemStatus, briefing, debrief, tomorrow, weekly };
  }, [missions, insights, subjects, execution, academic, predictive]);
}
