// Daily Operating System — UI modules.
// Reusable building blocks (also used by Commander Mode later):
//   - SystemStatusBar
//   - MorningBriefing
//   - StrategicAlerts
//   - RecoveryCenter
//   - ExecutionPlan
//   - SessionRecommendationCard
//   - EveningDebrief
//   - TomorrowPreview
//   - WeeklyDigestPanel
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle, ArrowRight, Brain, Calendar, CheckCircle2, Clock,
  Compass, Crosshair, Flame, GitBranch, HeartPulse, Lightbulb, ShieldAlert,
  Sparkles, Sunrise, Sunset, Target, TrendingUp, TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { Panel, MetricBar, StatusDot } from "@/components/widgets";
import { cn } from "@/lib/utils";
import {
  useSessionStore,
  blueprintFromMission,
  blueprintFromRecovery,
  blueprintFromMainQuest,
} from "@/lib/session-mode";
import type {
  DailyOSBundle, SystemStatus, MorningBriefing as MB,
  EveningDebrief as ED, TomorrowPreview as TP, WeeklyDigest,
  StrategicAlert, ExecutionPlanItem, SessionRecommendation,
} from "@/lib/daily-os";

const sevTone: Record<StrategicAlert["severity"], "danger" | "warning" | "info" | "default"> = {
  critical: "danger", high: "warning", medium: "info", info: "default",
};
const sevText: Record<StrategicAlert["severity"], string> = {
  critical: "text-destructive", high: "text-warning", medium: "text-info", info: "text-muted-foreground",
};
const alertIcon: Record<StrategicAlert["icon"], LucideIcon> = {
  memory: Brain, exam: Calendar, risk: ShieldAlert,
  momentum: TrendingUp, recovery: HeartPulse, discipline: Flame,
};

const kindIcon: Record<ExecutionPlanItem["kind"], LucideIcon> = {
  main: Target, critical: AlertTriangle, recovery: HeartPulse,
  assessment: Calendar, roi: TrendingUp, risk: ShieldAlert,
};
const kindAccent: Record<ExecutionPlanItem["kind"], string> = {
  main: "text-primary", critical: "text-destructive", recovery: "text-info",
  assessment: "text-warning", roi: "text-success", risk: "text-warning",
};

function useLaunch() {
  const launch = useSessionStore((s) => s.launch);
  const navigate = useNavigate();
  return (bp: ReturnType<typeof blueprintFromMission> | ReturnType<typeof blueprintFromMainQuest>) => {
    if (!bp) return;
    launch(bp);
    navigate({ to: "/session" });
  };
}

// ===================================================================
// SYSTEM STATUS BAR
// ===================================================================

export function SystemStatusBar({ status }: { status: SystemStatus }) {
  const outlookTone =
    status.outlook === "Strong" ? "success" :
    status.outlook === "On Track" ? "info" :
    status.outlook === "At Risk" ? "warning" : "danger";
  const items = [
    { label: "Discipline", value: `${status.discipline}/100`, sub: status.disciplineTier, tone: "default" as const },
    { label: "Momentum", value: `${status.momentum}/100`, sub: capitalize(status.momentumState), tone: "info" as const },
    { label: "Identity", value: status.identityTitle, sub: status.identityArchetype, tone: "default" as const },
    { label: "Academic Health", value: status.healthLabel, sub: `${status.health}/100`, tone: status.healthTone },
    { label: "Strategic Outlook", value: status.outlook, sub: status.outlookReason, tone: outlookTone },
  ];
  const toneText: Record<string, string> = {
    default: "text-foreground", success: "text-success", info: "text-info",
    warning: "text-warning", danger: "text-destructive",
  };
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl border border-border bg-card px-4 py-3.5">
          <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-1.5">
            {it.label}
          </div>
          <div className={cn("text-lg font-semibold tracking-tight truncate", toneText[it.tone])}>
            {it.value}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{it.sub}</div>
        </div>
      ))}
    </div>
  );
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ===================================================================
// STRATEGIC ALERTS
// ===================================================================

export function StrategicAlerts({ alerts }: { alerts: StrategicAlert[] }) {
  if (alerts.length === 0) {
    return (
      <Panel title="Strategic Alerts" description="Early-warning intelligence.">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-success" />
          No alerts — the system is stable. Maintain cadence.
        </div>
      </Panel>
    );
  }
  return (
    <Panel title="Strategic Alerts" description="Early-warning intelligence — act now to prevent compounding cost.">
      <div className="space-y-2">
        {alerts.map((a) => {
          const Icon = alertIcon[a.icon];
          return (
            <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
              <div className={cn("mt-0.5 h-7 w-7 rounded-md bg-background grid place-items-center", sevText[a.severity])}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-medium truncate">{a.title}</div>
                  <span className={cn("text-[10px] uppercase tracking-wider font-semibold", sevText[a.severity])}>
                    {a.severity}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{a.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ===================================================================
// MAIN QUEST + CRITICAL QUESTS
// ===================================================================

export function MainQuestCard({ briefing }: { briefing: MB }) {
  const launch = useLaunch();
  const mq = briefing.mainQuest.victory;

  if (!mq) {
    return (
      <Panel title="Main Quest" description="The single most important thing to do next.">
        <div className="text-sm text-muted-foreground">
          No active mission queued. Log a session or import a syllabus to seed today's plan.
        </div>
      </Panel>
    );
  }

  return (
    <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/5 to-transparent p-5 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Crosshair className="h-4 w-4 text-primary" />
        <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-primary">Main Quest</span>
        <span className="ml-auto text-xs text-muted-foreground inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> ~{mq.estimatedMinutes} min
        </span>
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{mq.title}</h3>
      <div className="text-xs text-muted-foreground mt-1">{mq.subjectName}</div>
      <p className="mt-3 text-sm text-foreground/85">{mq.whyItMatters}</p>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Stake label="ROI" value={`${mq.roiScore}/100`} icon={TrendingUp} tone="success" />
        <Stake label="Risk reduced" value={`~${mq.riskReduction} pts`} icon={ShieldAlert} tone="warning" />
        <Stake label="Downstream" value={mq.futureImpact.includes("downstream") ? mq.futureImpact.split("Strengthens ")[1]?.split(" downstream")[0] + " unlocks" : "Future impact"} icon={GitBranch} tone="info" />
      </div>

      <button
        onClick={() => launch(blueprintFromMainQuest())}
        className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 cursor-pointer"
      >
        Execute now <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Stake({ label, value, icon: Icon, tone }: { label: string; value: string; icon: LucideIcon; tone: "success" | "warning" | "info" }) {
  const t: Record<string, string> = { success: "text-success", warning: "text-warning", info: "text-info" };
  return (
    <div className="rounded-lg bg-background/60 border border-border/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground inline-flex items-center gap-1">
        <Icon className={cn("h-3 w-3", t[tone])} /> {label}
      </div>
      <div className="text-sm font-semibold mt-0.5 truncate">{value}</div>
    </div>
  );
}

export function CriticalQuests({ items }: { items: ExecutionPlanItem[] }) {
  const launch = useSessionStore((s) => s.launch);
  const navigate = useNavigate();
  if (items.length === 0) return null;
  return (
    <Panel title="Critical Quests" description="High-priority work outside the main quest.">
      <div className="space-y-2">
        {items.map((q) => {
          const Icon = kindIcon[q.kind];
          return (
            <div key={q.id} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5">
              <div className={cn("h-7 w-7 rounded-md bg-muted grid place-items-center", kindAccent[q.kind])}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{q.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {q.subject ? `${q.subject} · ` : ""}{q.reason}
                </div>
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">{q.minutes}m</div>
              {(q.missionId || q.conceptId) && (
                <button
                  className="text-xs h-7 px-2.5 rounded-md border border-border hover:bg-muted cursor-pointer"
                  onClick={() => {
                    const bp = q.missionId ? blueprintFromMission(q.missionId) : blueprintFromRecovery(q.conceptId!);
                    if (bp) { launch(bp); navigate({ to: "/session" }); }
                  }}
                >Start</button>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ===================================================================
// RECOVERY CENTER
// ===================================================================

export function RecoveryCenter({ briefing }: { briefing: MB }) {
  const launch = useSessionStore((s) => s.launch);
  const navigate = useNavigate();
  const { quests, smallestAction, headline } = briefing.recovery;

  return (
    <Panel title="Recovery Center" description="Missed work and the smallest useful step to restart.">
      <div className="text-sm text-muted-foreground mb-3">{headline}</div>

      {smallestAction && (
        <div className="rounded-lg border border-info/30 bg-info/5 px-3 py-2.5 mb-3 flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-info shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-info">Smallest useful action</div>
            <div className="text-sm font-medium truncate">{smallestAction.title}</div>
            <div className="text-xs text-muted-foreground">~{smallestAction.minutes} min · breaks inertia</div>
          </div>
          {(smallestAction.missionId || smallestAction.conceptId) && (
            <button
              className="text-xs h-7 px-2.5 rounded-md bg-info text-info-foreground cursor-pointer"
              onClick={() => {
                const bp = smallestAction.missionId
                  ? blueprintFromMission(smallestAction.missionId)
                  : blueprintFromRecovery(smallestAction.conceptId!);
                if (bp) { launch(bp); navigate({ to: "/session" }); }
              }}
            >Start</button>
          )}
        </div>
      )}

      {quests.length > 0 ? (
        <div className="space-y-2">
          {quests.map((q) => (
            <div key={q.id} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2">
              <StatusDot tone={q.severity === "critical" ? "danger" : q.severity === "high" ? "warning" : "info"} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{q.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {q.subjectName} · {q.reason}
                </div>
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">{q.estimatedMinutes}m</div>
              <button
                className="text-xs h-7 px-2.5 rounded-md border border-border hover:bg-muted cursor-pointer"
                onClick={() => {
                  const bp = blueprintFromRecovery(q.conceptId);
                  if (bp) { launch(bp); navigate({ to: "/session" }); }
                }}
              >Recover</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-success" /> Nothing to recover — knowledge base is healthy.
        </div>
      )}
    </Panel>
  );
}

// ===================================================================
// EXECUTION PLAN
// ===================================================================

export function ExecutionPlan({ items }: { items: ExecutionPlanItem[] }) {
  const launch = useSessionStore((s) => s.launch);
  const navigate = useNavigate();
  if (items.length === 0) {
    return (
      <Panel title="Today's Execution Plan">
        <div className="text-sm text-muted-foreground">No plan yet — import your syllabus to seed it.</div>
      </Panel>
    );
  }
  return (
    <Panel title="Today's Execution Plan" description="Prioritised sequence built from your intelligence systems.">
      <ol className="space-y-2">
        {items.map((it, i) => {
          const Icon = kindIcon[it.kind];
          return (
            <li key={it.id} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5">
              <div className="h-6 w-6 rounded-md bg-muted text-xs font-semibold grid place-items-center tabular-nums">
                {i + 1}
              </div>
              <Icon className={cn("h-3.5 w-3.5", kindAccent[it.kind])} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{it.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  <span className="uppercase tracking-wider text-[10px] font-semibold mr-2">{it.kind}</span>
                  {it.subject ? `${it.subject} · ` : ""}{it.reason}
                </div>
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">{it.minutes}m</div>
              {(it.missionId || it.conceptId) && (
                <button
                  className="text-xs h-7 px-2.5 rounded-md border border-border hover:bg-muted cursor-pointer"
                  onClick={() => {
                    const bp = it.missionId
                      ? blueprintFromMission(it.missionId)
                      : blueprintFromRecovery(it.conceptId!);
                    if (bp) { launch(bp); navigate({ to: "/session" }); }
                  }}
                >Start</button>
              )}
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

// ===================================================================
// SESSION RECOMMENDATION
// ===================================================================

export function SessionRecommendationCard({ rec }: { rec: SessionRecommendation }) {
  return (
    <Panel title="Recommended Session" description="Tuned to your momentum, discipline, risk and workload.">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
          <Compass className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{rec.label} · {rec.minutes} min</div>
          <div className="text-xs text-muted-foreground mt-1">{rec.reasoning}</div>
        </div>
      </div>
    </Panel>
  );
}

// ===================================================================
// MORNING BRIEFING (composite)
// ===================================================================

export function MorningBriefing({ briefing }: { briefing: MB }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sunrise className="h-4 w-4 text-warning" />
        <h2 className="text-base font-semibold tracking-tight">Morning Briefing</h2>
      </div>
      <MainQuestCard briefing={briefing} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CriticalQuests items={briefing.criticalQuests} />
        <RecoveryCenter briefing={briefing} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ExecutionPlan items={briefing.executionPlan} />
        </div>
        <div className="space-y-4">
          <SessionRecommendationCard rec={briefing.sessionRecommendation} />
          <StrategicAlerts alerts={briefing.strategicAlerts} />
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// EVENING DEBRIEF
// ===================================================================

export function EveningDebrief({ debrief }: { debrief: ED }) {
  const qualityTone: Record<string, "success" | "info" | "warning" | "danger"> = {
    Strong: "success", Solid: "info", Light: "warning", None: "danger",
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sunset className="h-4 w-4 text-info" />
        <h2 className="text-base font-semibold tracking-tight">Evening Debrief</h2>
      </div>

      {!debrief.hadActivity && (
        <Panel>
          <div className="text-sm text-muted-foreground">
            No work logged today yet. The debrief will activate once you complete a session.
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Daily Performance Review">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Missions completed" value={debrief.performance.missionsCompleted} />
            <Metric label="Concepts improved" value={debrief.performance.conceptsImproved} />
            <Metric label="Mastery gained" value={`+${debrief.performance.masteryGained}`} />
            <Metric label="Risk reduced" value={`~${debrief.performance.riskReduced}%`} />
            <Metric label="Study time" value={`${debrief.performance.studyMinutes}m`} />
            <Metric label="Execution" value={debrief.performance.executionQuality} tone={qualityTone[debrief.performance.executionQuality]} />
          </div>
          <div className="mt-3 text-xs text-muted-foreground border-t border-border/60 pt-3">
            <span className="font-semibold text-foreground">Biggest achievement:</span> {debrief.performance.biggestAchievement}
          </div>
        </Panel>

        <Panel title="Discipline Review" description={`Rating: ${debrief.discipline.rating}`}>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Metric label="Promises kept" value={debrief.discipline.promisesKept} tone="success" />
            <Metric label="Target" value={debrief.discipline.promisesTarget} />
            <Metric label="Broken" value={debrief.discipline.promisesBroken} tone={debrief.discipline.promisesBroken > 0 ? "warning" : "success"} />
          </div>
          <div className="mt-3 space-y-2.5">
            <BarRow label="Consistency" value={debrief.discipline.consistency} />
            <BarRow label="Reliability" value={debrief.discipline.reliability} />
            <BarRow label="Recovery rate" value={debrief.discipline.recoveryRate} />
          </div>
        </Panel>

        <Panel title="Momentum Review">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-semibold tabular-nums">{debrief.momentum.score}</div>
            <div className="text-xs text-muted-foreground">
              <div className="inline-flex items-center gap-1">
                {debrief.momentum.trend === "rising" ? <TrendingUp className="h-3 w-3 text-success" /> :
                 debrief.momentum.trend === "declining" ? <TrendingDown className="h-3 w-3 text-destructive" /> :
                 <ArrowRight className="h-3 w-3" />}
                <span className="capitalize">{debrief.momentum.trend}</span>
                {debrief.momentum.delta !== 0 && (
                  <span className={cn("ml-1 font-medium", debrief.momentum.delta > 0 ? "text-success" : "text-destructive")}>
                    {debrief.momentum.delta > 0 ? "+" : ""}{debrief.momentum.delta}
                  </span>
                )}
              </div>
              <div className="mt-1">{debrief.momentum.executionQuality}</div>
            </div>
          </div>
        </Panel>

        <Panel title="Identity Review">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Current rank</div>
              <div className="text-base font-semibold">{debrief.identity.title} · L{debrief.identity.level}</div>
              <div className="text-xs text-muted-foreground">{debrief.identity.archetype}</div>
            </div>
          </div>
          {debrief.identity.growth.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              {debrief.identity.growth.map((g) => (
                <div key={g.trait} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{g.trait}</span>
                  <span className={cn("font-semibold tabular-nums", g.delta > 0 ? "text-success" : "text-destructive")}>
                    {g.delta > 0 ? "+" : ""}{g.delta}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground mt-3">No identity change this week yet.</div>
          )}
        </Panel>
      </div>

      <Panel title="System Reflection" description="Evidence-based — never generic.">
        <ul className="space-y-2">
          {debrief.reflections.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Lightbulb className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "success" | "warning" | "danger" | "info" }) {
  const t: Record<string, string> = {
    default: "text-foreground", success: "text-success", info: "text-info",
    warning: "text-warning", danger: "text-destructive",
  };
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className={cn("text-base font-semibold tabular-nums", t[tone])}>{value}</div>
    </div>
  );
}

function BarRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}/100</span>
      </div>
      <MetricBar value={value} tone={value >= 70 ? "success" : value >= 45 ? "default" : "warning"} />
    </div>
  );
}

// ===================================================================
// TOMORROW PREVIEW
// ===================================================================

export function TomorrowPreview({ preview }: { preview: TP }) {
  return (
    <Panel title="Tomorrow Preview" description="Wake up knowing exactly what comes next.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-1">Main quest</div>
          {preview.mainQuest ? (
            <>
              <div className="text-sm font-semibold">{preview.mainQuest.title}</div>
              <div className="text-xs text-muted-foreground">
                {preview.mainQuest.subject} · ~{preview.mainQuest.minutes}m
              </div>
              <div className="text-xs text-muted-foreground mt-1">{preview.mainQuest.reason}</div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No mission queued.</div>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-1">Strategic focus</div>
          <div className="text-sm">{preview.strategicFocus}</div>
        </div>
      </div>

      {preview.upcomingAssessments.length > 0 && (
        <div className="mt-4 border-t border-border/60 pt-3">
          <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-2">Upcoming assessments</div>
          <div className="space-y-1.5">
            {preview.upcomingAssessments.map((a) => (
              <div key={a.subject} className="flex items-center justify-between text-sm">
                <span className="truncate">{a.subject}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{a.days}d · {a.readiness}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {preview.criticalRisks.length > 0 && (
        <div className="mt-4 border-t border-border/60 pt-3">
          <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-2">Critical risks</div>
          <ul className="space-y-1.5 text-sm">
            {preview.criticalRisks.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview.recoveryNeeds.length > 0 && (
        <div className="mt-4 border-t border-border/60 pt-3">
          <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-2">Recovery needs</div>
          <ul className="space-y-1.5 text-sm">
            {preview.recoveryNeeds.map((r, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="truncate">{r.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{r.subject} · {r.minutes}m</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

// ===================================================================
// WEEKLY DIGEST
// ===================================================================

export function WeeklyDigestPanel({ weekly }: { weekly: WeeklyDigest }) {
  const items: { label: string; value: string; tone?: "success" | "warning" | "info" | "default" }[] = [
    { label: "Greatest achievement", value: weekly.greatestAchievement, tone: "success" },
    { label: "Biggest mistake", value: weekly.biggestMistake, tone: "warning" },
    { label: "Most improved", value: weekly.mostImprovedSubject, tone: "info" },
    { label: "Highest risk", value: weekly.highestRiskSubject, tone: "warning" },
    { label: "Discipline trend", value: weekly.disciplineTrend },
    { label: "Momentum trend", value: weekly.momentumTrend },
    { label: "Identity growth", value: weekly.identityGrowth },
    { label: "Recommended focus next week", value: weekly.recommendedFocus, tone: "success" },
  ];
  return (
    <Panel title="Weekly Review" description="Growth, mistakes and what to do next week.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((it) => (
          <div key={it.label} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-1">{it.label}</div>
            <div className="text-sm">{it.value}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ===================================================================
// FULL PAGE
// ===================================================================

export function DailyOSPage({ bundle }: { bundle: DailyOSBundle }) {
  const isEvening = bundle.phase === "evening" || bundle.phase === "night";
  return (
    <div className="space-y-8">
      <SystemStatusBar status={bundle.systemStatus} />

      {!isEvening ? (
        <>
          <MorningBriefing briefing={bundle.briefing} />
          <EveningDebrief debrief={bundle.debrief} />
        </>
      ) : (
        <>
          <EveningDebrief debrief={bundle.debrief} />
          <MorningBriefing briefing={bundle.briefing} />
        </>
      )}

      <TomorrowPreview preview={bundle.tomorrow} />
      <WeeklyDigestPanel weekly={bundle.weekly} />
    </div>
  );
}
