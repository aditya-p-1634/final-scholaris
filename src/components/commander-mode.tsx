// Commander Mode — Scholaris' unified Academic System Interface.
// ====================================================================
// This is the central nervous system of Scholaris. It composes every
// existing engine (Daily OS, Academic System, Execution, Predictive,
// Intelligence, Session Mode) into a single coherent execution surface.
//
// Layout (top → bottom):
//   1. System Header        — vital signs at-a-glance
//   2. Main Quest Center    — single most important next action
//   3. Quick Actions        — open the rituals & capture surface
//   4. Today's Execution    — plan + recommended session
//   5. Recovery Center      — missed work + smallest useful action
//   6. Strategic Alerts     — early-warning intelligence
//   7. Discipline / Momentum / Identity panels — behavioral signals
//
// The user should be able to spend 90% of their time here. Every CTA
// either launches Session Mode, opens the Universal Capture surface, or
// links to the dedicated ritual page (Today · Daily OS).

import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity, AlertTriangle, ArrowRight, BookOpen, Brain, Calendar,
  CheckCircle2, Clock, Compass, Crosshair, Crown, Fingerprint, Flame,
  Gauge, GitBranch, HeartPulse, Lightbulb, ShieldAlert, Signal,
  Sparkles, Sunrise, Sunset, Target, TrendingDown, TrendingUp, Trophy, Zap,
  type LucideIcon,
} from "lucide-react";
import { Panel, MetricBar, StatusDot } from "@/components/widgets";
import { cn } from "@/lib/utils";
import { useDailyOS, type DailyOSBundle, type SystemStatus, type StrategicAlert, type ExecutionPlanItem, type SessionRecommendation } from "@/lib/daily-os";
import { useAcademicSystem } from "@/lib/academic-system";
import {
  useSessionStore, blueprintFromMainQuest, blueprintFromMission, blueprintFromRecovery,
} from "@/lib/session-mode";

// =====================================================================
// Top-level
// =====================================================================

export function CommanderMode() {
  const bundle = useDailyOS();
  const system = useAcademicSystem();

  return (
    <div className="space-y-6">
      <SystemHeader status={bundle.systemStatus} />
      <MainQuestCenter bundle={bundle} />
      <QuickActions phase={bundle.phase} />

      <div className="grid lg:grid-cols-3 gap-4">
        <TodayExecutionPanel bundle={bundle} className="lg:col-span-2" />
        <RecommendedSessionPanel rec={bundle.briefing.sessionRecommendation} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <RecoveryPanel bundle={bundle} className="lg:col-span-2" />
        <StrategicAlertsPanel alerts={bundle.briefing.strategicAlerts} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <DisciplinePanel discipline={system.discipline} />
        <MomentumPanel momentum={system.momentum} />
        <IdentityPanel identity={system.identity} />
      </div>
    </div>
  );
}

// =====================================================================
// 1. System Header
// =====================================================================

function SystemHeader({ status }: { status: SystemStatus }) {
  const outlookTone =
    status.outlook === "Strong" ? "success" :
    status.outlook === "On Track" ? "info" :
    status.outlook === "At Risk" ? "warning" : "danger";
  const outlookText: Record<string, string> = {
    success: "text-success", info: "text-info", warning: "text-warning", danger: "text-destructive",
  };

  const items = [
    { label: "Discipline", value: `${status.discipline}`, sub: status.disciplineTier, icon: Flame, tone: "default" as const },
    { label: "Momentum", value: capitalize(status.momentumState), sub: `${status.momentum}/100 · ${status.momentumTrend}`, icon: status.momentum >= 60 ? TrendingUp : TrendingDown, tone: "info" as const },
    { label: "Identity", value: status.identityTitle, sub: `${status.identityArchetype} · L${status.identityLevel}`, icon: Fingerprint, tone: "default" as const },
    { label: "Academic Health", value: status.healthLabel, sub: `${status.health}/100`, icon: HeartPulse, tone: status.healthTone },
    { label: "Outlook", value: status.outlook, sub: status.outlookReason, icon: Compass, tone: outlookTone as "success" | "warning" | "info" | "danger" },
  ];

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-card via-card to-muted/20 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-success">System Online</span>
          <Signal className="h-3 w-3 text-muted-foreground/60 ml-1" />
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          Commander Mode · unified academic interface
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border/60">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.label} className="px-4 py-3.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn("h-3 w-3", outlookText[it.tone] ?? "text-muted-foreground")} />
                <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">{it.label}</div>
              </div>
              <div className={cn("text-base font-semibold tracking-tight truncate", outlookText[it.tone])}>{it.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">{it.sub}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

// =====================================================================
// 2. Main Quest Center
// =====================================================================

function MainQuestCenter({ bundle }: { bundle: DailyOSBundle }) {
  const launch = useLaunch();
  const v = bundle.briefing.mainQuest.victory;

  if (!v) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <Crown className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <div className="text-sm font-medium">No main quest queued</div>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          Log a session with Quick Capture or import a syllabus to seed today's plan. The system will surface the highest-value next action automatically.
        </p>
      </div>
    );
  }

  const priorityTone =
    v.priority === "critical" ? "bg-destructive/15 text-destructive border-destructive/30" :
    v.priority === "high" ? "bg-warning/15 text-warning border-warning/30" :
    "bg-primary/15 text-primary border-primary/30";

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-[0_0_40px_-12px_oklch(0.72_0.16_250/0.45)]">
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-9 w-9 rounded-lg bg-primary/20 text-primary grid place-items-center">
            <Crown className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-primary">Main Quest Center</div>
            <div className="text-[11px] text-muted-foreground">The single most important action right now</div>
          </div>
          <span className={cn("text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border", priorityTone)}>
            {v.priority}
          </span>
        </div>

        <h2 className="text-2xl font-semibold tracking-tight">{v.title}</h2>
        <div className="text-xs text-muted-foreground mt-1">{v.subjectName}</div>
        <p className="mt-3 text-sm text-foreground/85 leading-relaxed max-w-3xl">
          <span className="font-semibold text-foreground/90">Why this matters: </span>{v.whyItMatters}
        </p>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat icon={Clock} label="Time" value={`~${v.estimatedMinutes} min`} tone="default" />
          <Stat icon={TrendingUp} label="ROI" value={`${v.roiScore}/100`} tone="success" />
          <Stat icon={Trophy} label="Reward" value={`+${Math.max(4, Math.round(v.roiScore / 12))} mastery · -${v.riskReduction} risk`} tone="success" />
          <Stat icon={AlertTriangle} label="Penalty if skipped" value={bundle.briefing.mainQuest.stakes.replace(/^Skipping it /, "Leaves ")} tone="warning" />
        </div>

        {v.futureImpact && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <GitBranch className="h-3 w-3" />
            <span>{v.futureImpact}</span>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            onClick={() => launch(blueprintFromMainQuest())}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Zap className="h-4 w-4" /> Start Session
          </button>
          <Link
            to="/missions"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
          >
            See all missions <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: "default" | "success" | "warning" | "info" }) {
  const t: Record<string, string> = {
    default: "text-foreground", success: "text-success", warning: "text-warning", info: "text-info",
  };
  return (
    <div className="rounded-lg bg-background/60 border border-border/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground inline-flex items-center gap-1">
        <Icon className={cn("h-3 w-3", t[tone])} /> {label}
      </div>
      <div className="text-sm font-semibold mt-0.5 truncate">{value}</div>
    </div>
  );
}

// =====================================================================
// 3. Quick Actions
// =====================================================================

function QuickActions({ phase }: { phase: DailyOSBundle["phase"] }) {
  const launch = useLaunch();
  const navigate = useNavigate();

  const openCapture = () => {
    // Universal Capture listens for ⌘/Ctrl+J — dispatch synthetically.
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "j", ctrlKey: true, bubbles: true }));
  };

  const showMorning = phase === "morning" || phase === "midday";

  const actions: { label: string; icon: LucideIcon; onClick: () => void; tone?: string }[] = [
    { label: "Start Main Quest", icon: Crown, onClick: () => launch(blueprintFromMainQuest()), tone: "primary" },
    { label: "Open Session Mode", icon: Zap, onClick: () => navigate({ to: "/session" }) },
    { label: "Quick Capture", icon: Sparkles, onClick: openCapture },
    showMorning
      ? { label: "Morning Briefing", icon: Sunrise, onClick: () => navigate({ to: "/today" }) }
      : { label: "Evening Debrief", icon: Sunset, onClick: () => navigate({ to: "/today" }) },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {actions.map((a) => {
        const Icon = a.icon;
        const isPrimary = a.tone === "primary";
        return (
          <button
            key={a.label}
            onClick={a.onClick}
            className={cn(
              "group flex items-center gap-2.5 h-12 px-3.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer text-left",
              isPrimary
                ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                : "border-border bg-card hover:bg-muted/40",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", isPrimary ? "text-primary" : "text-muted-foreground group-hover:text-foreground transition-colors")} />
            <span className="truncate flex-1">{a.label}</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

// =====================================================================
// 4. Today's Execution Panel
// =====================================================================

const planKindIcon: Record<ExecutionPlanItem["kind"], LucideIcon> = {
  main: Target, critical: AlertTriangle, recovery: HeartPulse,
  assessment: Calendar, roi: TrendingUp, risk: ShieldAlert,
};
const planKindAccent: Record<ExecutionPlanItem["kind"], string> = {
  main: "text-primary", critical: "text-destructive", recovery: "text-info",
  assessment: "text-warning", roi: "text-success", risk: "text-warning",
};

function TodayExecutionPanel({ bundle, className }: { bundle: DailyOSBundle; className?: string }) {
  const launch = useSessionStore((s) => s.launch);
  const navigate = useNavigate();
  const items = bundle.briefing.executionPlan;

  return (
    <Panel
      title="Today's Execution Plan"
      description="Prioritised sequence — start any item to launch Session Mode."
      className={className}
      action={<Link to="/today" className="text-xs text-primary hover:underline">Full ritual</Link>}
    >
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center flex flex-col items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success/60" />
          No plan yet — capture an activity or import your syllabus.
        </div>
      ) : (
        <ol className="space-y-2">
          {items.map((it, i) => {
            const Icon = planKindIcon[it.kind];
            const launchItem = () => {
              const bp = it.missionId ? blueprintFromMission(it.missionId)
                : it.conceptId ? blueprintFromRecovery(it.conceptId) : null;
              if (bp) { launch(bp); navigate({ to: "/session" }); }
            };
            return (
              <li key={it.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2.5 hover:bg-accent/20 transition-colors">
                <div className="h-6 w-6 rounded-md bg-muted text-xs font-semibold grid place-items-center tabular-nums shrink-0">{i + 1}</div>
                <Icon className={cn("h-3.5 w-3.5 shrink-0", planKindAccent[it.kind])} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{it.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    <span className="uppercase tracking-wider text-[10px] font-semibold mr-1.5">{it.kind}</span>
                    {it.subject ? `${it.subject} · ` : ""}{it.reason}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground tabular-nums shrink-0">{it.minutes}m</div>
                {(it.missionId || it.conceptId) && (
                  <button
                    onClick={launchItem}
                    className="text-xs h-7 px-2.5 rounded-md bg-primary/15 text-primary font-medium hover:bg-primary/25 transition-colors cursor-pointer shrink-0"
                  >
                    Start
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

function RecommendedSessionPanel({ rec }: { rec: SessionRecommendation }) {
  const navigate = useNavigate();
  return (
    <Panel title="Recommended Focus" description="Tuned to momentum, discipline, risk and workload.">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-lg bg-primary/15 text-primary grid place-items-center shrink-0">
          <Compass className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{rec.label}</div>
          <div className="text-xs text-muted-foreground">~{rec.minutes} min</div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{rec.reasoning}</p>
      <button
        onClick={() => navigate({ to: "/session" })}
        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
      >
        <Zap className="h-3.5 w-3.5" /> Launch Session
      </button>
    </Panel>
  );
}

// =====================================================================
// 5. Recovery Center
// =====================================================================

function RecoveryPanel({ bundle, className }: { bundle: DailyOSBundle; className?: string }) {
  const launch = useSessionStore((s) => s.launch);
  const navigate = useNavigate();
  const { quests, smallestAction, headline } = bundle.briefing.recovery;

  return (
    <Panel
      title="Recovery Center"
      description={headline}
      className={className}
      action={<Link to="/missions" className="text-xs text-primary hover:underline">All</Link>}
    >
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
              className="text-xs h-7 px-2.5 rounded-md bg-info text-info-foreground font-medium cursor-pointer"
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

      {quests.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center flex flex-col items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success/60" />
          No recovery debt — knowledge base is being maintained well.
        </div>
      ) : (
        <div className="space-y-2">
          {quests.slice(0, 5).map((q) => (
            <div key={q.id} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2">
              <StatusDot tone={q.severity === "critical" ? "danger" : q.severity === "high" ? "warning" : "info"} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{q.title}</div>
                <div className="text-xs text-muted-foreground truncate">{q.subjectName} · {q.reason}</div>
              </div>
              <div className="text-xs text-muted-foreground tabular-nums shrink-0">{q.estimatedMinutes}m</div>
              <button
                className="text-xs h-7 px-2.5 rounded-md border border-border hover:bg-muted cursor-pointer shrink-0"
                onClick={() => {
                  const bp = blueprintFromRecovery(q.conceptId);
                  if (bp) { launch(bp); navigate({ to: "/session" }); }
                }}
              >Recover</button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// =====================================================================
// 6. Strategic Alerts
// =====================================================================

const alertSevText: Record<StrategicAlert["severity"], string> = {
  critical: "text-destructive", high: "text-warning", medium: "text-info", info: "text-muted-foreground",
};
const alertIconMap: Record<StrategicAlert["icon"], LucideIcon> = {
  memory: Brain, exam: Calendar, risk: ShieldAlert,
  momentum: TrendingUp, recovery: HeartPulse, discipline: Flame,
};

function StrategicAlertsPanel({ alerts }: { alerts: StrategicAlert[] }) {
  if (alerts.length === 0) {
    return (
      <Panel title="Strategic Alerts" description="Early-warning intelligence.">
        <div className="text-sm text-muted-foreground flex items-center gap-2 py-4">
          <CheckCircle2 className="h-4 w-4 text-success" />
          All systems stable. Maintain cadence.
        </div>
      </Panel>
    );
  }
  return (
    <Panel title="Strategic Alerts" description="Act now to prevent compounding cost.">
      <div className="space-y-2">
        {alerts.slice(0, 5).map((a) => {
          const Icon = alertIconMap[a.icon];
          return (
            <div key={a.id} className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
              <div className={cn("mt-0.5 h-6 w-6 rounded-md bg-background grid place-items-center shrink-0", alertSevText[a.severity])}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{a.title}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{a.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// =====================================================================
// 7. Discipline / Momentum / Identity
// =====================================================================

function DisciplinePanel({ discipline: d }: { discipline: ReturnType<typeof useAcademicSystem>["discipline"] }) {
  const tone = d.score >= 68 ? "text-success" : d.score >= 50 ? "text-info" : d.score >= 30 ? "text-warning" : "text-destructive";
  return (
    <Panel title="Discipline" description={`${d.tier} · ${d.score}/100`}>
      <div className="flex items-baseline gap-1.5 mb-3">
        <Flame className={cn("h-4 w-4 mr-1", tone)} />
        <span className={cn("text-3xl font-semibold tabular-nums", tone)}>{d.score}</span>
        <span className="text-xs text-muted-foreground">/100</span>
        {d.streak > 0 && (
          <span className="ml-auto text-xs text-warning font-medium inline-flex items-center gap-1">
            <Flame className="h-3 w-3" />{d.streak}d
          </span>
        )}
      </div>
      <div className="space-y-2">
        <Bar label="Reliability" value={d.reliability} />
        <Bar label="Consistency" value={d.consistency} />
        <Bar label="Recovery" value={d.recoveryRate} />
      </div>
      <p className="text-[11px] text-muted-foreground mt-3 leading-snug">{d.headline}</p>
    </Panel>
  );
}

function MomentumPanel({ momentum: m }: { momentum: ReturnType<typeof useAcademicSystem>["momentum"] }) {
  const stateTone =
    m.state === "accelerating" ? "text-success" :
    m.state === "steady" ? "text-info" :
    m.state === "stalling" ? "text-warning" : "text-destructive";
  const TrendIcon = m.trend === "rising" ? TrendingUp : m.trend === "declining" ? TrendingDown : Activity;
  return (
    <Panel title="Momentum" description={`${capitalize(m.state)} · ${m.trend}`}>
      <div className="flex items-baseline gap-1.5 mb-3">
        <TrendIcon className={cn("h-4 w-4 mr-1", stateTone)} />
        <span className={cn("text-3xl font-semibold tabular-nums", stateTone)}>{m.unifiedScore}</span>
        <span className="text-xs text-muted-foreground">/100</span>
        {m.trendDelta !== 0 && (
          <span className={cn("ml-auto text-xs font-medium tabular-nums", m.trendDelta > 0 ? "text-success" : "text-destructive")}>
            {m.trendDelta > 0 ? "+" : ""}{m.trendDelta} wk
          </span>
        )}
      </div>
      <div className="space-y-2">
        {m.dimensions.slice(0, 3).map((dim) => (
          <Bar key={dim.label} label={dim.label} value={dim.value} />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-3 leading-snug">{m.headline}</p>
    </Panel>
  );
}

function IdentityPanel({ identity: id }: { identity: ReturnType<typeof useAcademicSystem>["identity"] }) {
  return (
    <Panel title="Identity" description={`Lv ${id.level} · ${id.title}`}>
      <div className="flex items-center gap-2 mb-3">
        <Fingerprint className="h-4 w-4 text-info" />
        <div className="text-lg font-semibold tracking-tight truncate">{id.archetype}</div>
      </div>
      <div className="mb-3">
        <div className="flex justify-between text-[11px] mb-1">
          <span className="text-muted-foreground">Evolution to L{id.level + 1}</span>
          <span className="font-mono">{id.levelProgress}%</span>
        </div>
        <MetricBar value={id.levelProgress} tone="default" />
        <div className="text-[10px] text-muted-foreground mt-1">{id.pointsToNext} pts to next rank</div>
      </div>
      {id.weeklyGrowth.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {id.weeklyGrowth.slice(0, 4).map((g) => (
            <span key={g.trait} className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium",
              g.delta > 0 ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
            )}>
              {g.trait} {g.delta > 0 ? "+" : ""}{g.delta}
            </span>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground leading-snug">{id.headline}</p>
    </Panel>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
      <MetricBar value={value} tone={value >= 70 ? "success" : value >= 45 ? "default" : "warning"} />
    </div>
  );
}

// =====================================================================
// Shared helpers
// =====================================================================

function useLaunch() {
  const launch = useSessionStore((s) => s.launch);
  const navigate = useNavigate();
  return (bp: ReturnType<typeof blueprintFromMainQuest>) => {
    if (!bp) return;
    launch(bp);
    navigate({ to: "/session" });
  };
}
