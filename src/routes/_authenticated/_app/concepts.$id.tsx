import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft, Activity, Brain, TrendingUp, ShieldAlert, Sparkles,
  GitBranch, ArrowDown, ArrowUp, Target, AlertTriangle, ChevronRight,
  History, ClipboardCheck, Crosshair, Play,
} from "lucide-react";
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Area, AreaChart, Legend,
} from "recharts";
import { PageHeader, Panel, StatCard, StatusDot, MetricBar } from "@/components/widgets";
import { useIntelligence, useIntelligenceActions } from "@/lib/intelligence";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/concepts/$id")({
  loader: ({ params }) => ({ id: params.id }),
  head: () => ({
    meta: [{ title: `Concept Intelligence — Scholaris` }],
  }),
  component: ConceptIntelligence,
  notFoundComponent: () => <div className="text-center py-20 text-sm text-muted-foreground">Concept not found.</div>,
});

function ConceptIntelligence() {
  const { id } = Route.useLoaderData();
  const { concepts, missions, sessions } = useIntelligence();
  const { runSession } = useIntelligenceActions();

  const c = concepts.find((x) => x.id === id);
  if (!c) throw notFound();

  const decayCurve = Array.from({ length: 28 }, (_, i) => {
    const day = i - 13;
    const isPast = day <= 0;
    const memory = isPast
      ? Math.max(8, Math.round(c.memoryStrength + day * c.decayRate * 6 + Math.sin(day) * 4))
      : Math.max(4, Math.round(c.memoryStrength * Math.exp(-day * c.decayRate)));
    const recovered = isPast ? null : Math.min(100, Math.round(c.memoryStrength + day * 4));
    return { day: day === 0 ? "Today" : day > 0 ? `+${day}d` : `${day}d`, memory, recovered, isPast };
  });

  const prerequisites = c.prerequisiteIds.map((pid) => concepts.find((x) => x.id === pid)).filter(Boolean) as typeof concepts;
  const dependents = c.dependentIds.map((did) => concepts.find((x) => x.id === did)).filter(Boolean) as typeof concepts;
  const upstreamAll = c.upstreamIds.map((id) => concepts.find((x) => x.id === id)).filter(Boolean) as typeof concepts;
  const downstreamAll = c.downstreamIds.map((id) => concepts.find((x) => x.id === id)).filter(Boolean) as typeof concepts;
  const weakPrereqs = prerequisites.filter((p) => p.mastery < 60);

  const relatedMissions = missions.filter((m) => m.conceptIds.includes(c.id));
  const activeMissions = relatedMissions.filter((m) => !m.completed);
  const conceptSessions = sessions.filter((s) => s.conceptId === c.id);

  const decayStatus = c.memoryStrength > 70 ? "stable" : c.memoryStrength > 45 ? "decaying" : "critical";
  const recoveryStatus = c.mastery < 35 ? "urgent-recovery" : c.mastery < 60 ? "needs-reinforcement" : "on-track";

  const sessionType = c.mastery < 40 ? "Recovery" as const : c.mastery < 70 ? "Reinforcement" as const : "Review" as const;
  const sessionMinutes = c.mastery < 40 ? 25 : c.mastery < 70 ? 18 : 12;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link to="/concepts" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Concepts
        </Link>
        <Link to="/subjects/$id" params={{ id: c.subjectId }} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          {c.subjectName} <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <PageHeader
        eyebrow={`${c.subjectName} · ${c.topic} · Concept Intelligence`}
        title={c.name}
        description="Complete intelligence profile — memory, dependencies, history, and AI analysis"
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs px-3 h-9 rounded-md border border-border bg-card capitalize">
              <StatusDot tone={c.status === "mastered" ? "success" : c.status === "strong" ? "info" : c.status === "weak" ? "warning" : c.status === "forgotten" ? "danger" : "default"} />
              {c.status}
            </span>
            <button
              onClick={() => runSession({ conceptId: c.id, type: sessionType, minutes: sessionMinutes })}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" /> Run {sessionType.toLowerCase()} session
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Mastery" value={c.mastery} suffix="/100" icon={Activity} />
        <StatCard label="Memory" value={c.memoryStrength} suffix="/100" icon={Brain} tone="info" />
        <StatCard label="ROI" value={c.roi} suffix="/100" icon={TrendingUp} tone="success" />
        <StatCard label="Risk" value={c.risk} suffix="/100" icon={ShieldAlert} tone={c.risk > 60 ? "danger" : c.risk > 40 ? "warning" : "default"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Panel title="Concept health" description="Decay and recovery posture">
          <div className="space-y-3.5">
            <HealthRow label="Current state" value={c.status} tone={c.status === "forgotten" || c.status === "weak" ? "danger" : c.status === "developing" ? "warning" : "success"} />
            <HealthRow label="Decay status" value={decayStatus} tone={decayStatus === "critical" ? "danger" : decayStatus === "decaying" ? "warning" : "success"} />
            <HealthRow label="Recovery status" value={recoveryStatus.replace("-", " ")} tone={recoveryStatus === "urgent-recovery" ? "danger" : recoveryStatus === "needs-reinforcement" ? "warning" : "success"} />
            <HealthRow label="Decay rate" value={c.decayRate.toFixed(2)} tone={c.decayRate > 0.2 ? "danger" : c.decayRate > 0.12 ? "warning" : "success"} />
            <HealthRow label="Bottleneck" value={c.isBottleneck ? `yes · gates ${c.downstreamCount}` : "no"} tone={c.isBottleneck ? "danger" : "success"} />
            <HealthRow label="Critical path" value={c.isCriticalPath ? `yes · ${c.criticalPathScore}/100` : "no"} tone={c.isCriticalPath ? "warning" : "success"} />
          </div>
        </Panel>

        <Panel title="Intelligence profile" description="Strategic significance" className="lg:col-span-2">
          <div className="grid sm:grid-cols-3 gap-4">
            <ProfileBlock
              icon={Crosshair}
              title="Structural position"
              body={`Depth ${c.dependencyDepth} in the graph · ${c.dependencyCount} upstream / ${c.downstreamCount} downstream concept${c.downstreamCount === 1 ? "" : "s"}. Structural importance ${c.structuralImportance}/100.`}
            />
            <ProfileBlock
              icon={TrendingUp}
              title="Strategic importance"
              body={c.roi > 80
                ? `ROI is exceptional (${c.roi}/100). Investment here yields outsized mastery gains${c.downstreamCount ? ` and unlocks ${c.downstreamCount} downstream concept${c.downstreamCount === 1 ? "" : "s"}` : ""}.`
                : `ROI ${c.roi}/100 — moderate. Pair with adjacent concepts for compounded returns.`}
            />
            <ProfileBlock
              icon={ClipboardCheck}
              title={c.isBottleneck ? "Bottleneck signal" : "Exam importance"}
              body={c.isBottleneck
                ? `Weak node gating ${c.downstreamCount} downstream concept${c.downstreamCount === 1 ? "" : "s"}. Bottleneck score ${c.bottleneckScore}/100 — clearing this releases compounded risk.`
                : c.importance >= 8
                ? `High-yield exam concept. Historically appears in ${Math.round(c.importance * 6)}% of assessments in ${c.subjectName}.`
                : `Standard exam weight. Expected in periodic problem sets but rarely a focal point.`}
            />
          </div>
        </Panel>
      </div>

      <Panel title="Memory analysis" description="Past retention, predicted forgetting, and recovery forecast" className="mb-6">
        <div className="h-80 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={decayCurve} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="mem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.14 230)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.72 0.14 230)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="rec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.16 155)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="oklch(0.72 0.16 155)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
              <XAxis dataKey="day" stroke="oklch(0.68 0.02 250)" fontSize={10} tickLine={false} axisLine={false} interval={2} />
              <YAxis stroke="oklch(0.68 0.02 250)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "oklch(0.20 0.013 250)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="line" />
              <ReferenceLine y={40} stroke="oklch(0.62 0.22 25 / 0.6)" strokeDasharray="3 3" label={{ value: "Forgetting threshold", fill: "oklch(0.62 0.22 25)", fontSize: 10, position: "insideTopRight" }} />
              <Area type="monotone" dataKey="memory" name="Memory (predicted)" stroke="oklch(0.72 0.14 230)" strokeWidth={2} fill="url(#mem)" />
              <Area type="monotone" dataKey="recovered" name="With recovery plan" stroke="oklch(0.72 0.16 155)" strokeWidth={2} strokeDasharray="5 3" fill="url(#rec)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <MiniStat label="Days until forgetting threshold" value={c.memoryStrength > 40 ? `${Math.round((c.memoryStrength - 40) / Math.max(0.05, c.decayRate * 5))}d` : "Already crossed"} tone={c.memoryStrength > 40 ? "warning" : "danger"} />
          <MiniStat label="Recovery sprint required" value={`${Math.max(12, Math.round((100 - c.mastery) / 3))} min`} tone="info" />
          <MiniStat label="Predicted post-recovery mastery" value={`${Math.min(95, c.mastery + 18)}/100`} tone="success" />
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Panel title="Prerequisites" description={`${prerequisites.length} direct · ${c.dependencyCount} upstream total · depth ${c.dependencyDepth}${weakPrereqs.length ? ` · ${weakPrereqs.length} weak` : ""}`}>
          {prerequisites.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No upstream prerequisites tracked.</div>
          ) : (
            <div className="space-y-2">
              {prerequisites.map((p, i) => (
                <div key={p.id}>
                  <Link to="/concepts/$id" params={{ id: p.id }} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 hover:border-border hover:bg-card/50 transition-colors group">
                    <div className="h-7 w-7 rounded-md bg-info/15 grid place-items-center shrink-0">
                      <GitBranch className="h-3.5 w-3.5 text-info" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium group-hover:text-primary transition-colors truncate">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground">Mastery {p.mastery} · importance {p.importance}/10</div>
                    </div>
                    <div className={cn("text-[10px] uppercase tracking-wider font-semibold",
                      p.mastery > 70 ? "text-success" : p.mastery > 40 ? "text-warning" : "text-destructive")}>
                      {p.status}
                    </div>
                  </Link>
                  {i < prerequisites.length - 1 && (
                    <div className="flex justify-center my-1.5"><ArrowDown className="h-3 w-3 text-muted-foreground/60" /></div>
                  )}
                </div>
              ))}
              <div className="flex justify-center my-1.5"><ArrowDown className="h-3 w-3 text-primary" /></div>
              <div className="p-2.5 rounded-lg border border-primary/40 bg-primary/5">
                <div className="text-sm font-medium text-primary">{c.name}</div>
                <div className="text-[11px] text-muted-foreground">Current concept</div>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Dependents" description={`${dependents.length} direct · ${c.downstreamCount} downstream total · unlock potential ${c.unlockPotential}/100`}>
          {dependents.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No downstream dependents tracked.</div>
          ) : (
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg border border-primary/40 bg-primary/5">
                <div className="text-sm font-medium text-primary">{c.name}</div>
                <div className="text-[11px] text-muted-foreground">Current concept</div>
              </div>
              <div className="flex justify-center my-1.5"><ArrowDown className="h-3 w-3 text-primary" /></div>
              {dependents.map((d) => (
                <Link key={d.id} to="/concepts/$id" params={{ id: d.id }} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 hover:border-border hover:bg-card/50 transition-colors group">
                  <div className="h-7 w-7 rounded-md bg-success/15 grid place-items-center shrink-0">
                    <ArrowUp className="h-3.5 w-3.5 text-success rotate-45" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium group-hover:text-primary transition-colors truncate">{d.name}</div>
                    <div className="text-[11px] text-muted-foreground">Mastery {d.mastery} · {d.topic}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Panel title="Session history" description={`${conceptSessions.length || c.reviewCount} learning sessions involving this concept`}>
          <div className="space-y-3">
            {conceptSessions.length > 0 ? conceptSessions.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-muted grid place-items-center shrink-0">
                  <History className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{s.type}</span>
                    <span className="text-xs text-muted-foreground">{s.dateLabel}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">+{s.gain} mastery · {s.duration}m session</div>
                </div>
              </div>
            )) : Array.from({ length: 4 }).map((_, i) => {
              const types = ["Active recall", "Spaced review", "Targeted drill", "Initial encoding"];
              const mastery = Math.max(20, c.mastery - i * 7);
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-muted grid place-items-center shrink-0">
                    <History className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 pb-3 border-b border-border/40 last:border-0 last:pb-0">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{types[i]}</span>
                      <span className="text-xs text-muted-foreground">{(i + 1) * 3}d ago</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">Mastery {Math.max(15, mastery - 8)} → {mastery} · {12 + i * 4}m</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Assessment history" description="Questions, performance, and mistake patterns">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <MiniStat label="Attempted" value={`${c.reviewCount * 3}`} tone="default" />
            <MiniStat label="Correct" value={`${Math.round(c.reviewCount * 3 * (c.mastery / 100))}`} tone="success" />
            <MiniStat label="Accuracy" value={`${c.mastery}%`} tone={c.mastery > 70 ? "success" : "warning"} />
          </div>
          <div className="space-y-2.5">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Mistake patterns</div>
            {[
              { label: "Confused with adjacent concept", pct: c.mastery < 50 ? 42 : 18 },
              { label: "Procedural slip under time pressure", pct: c.mastery < 60 ? 31 : 14 },
              { label: "Incomplete recall of dependencies", pct: c.memoryStrength < 50 ? 38 : 9 },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{m.label}</span>
                  <span className="font-mono text-muted-foreground">{m.pct}%</span>
                </div>
                <MetricBar value={m.pct} tone={m.pct > 30 ? "danger" : m.pct > 15 ? "warning" : "success"} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Mission connections" description="Active and historical missions touching this concept">
          {relatedMissions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No missions targeting this concept yet.{" "}
              <Link to="/recommendations" className="text-primary hover:underline">Generate one</Link>.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Active · {activeMissions.length}</div>
              {activeMissions.map((m) => (
                <div key={m.id} className="p-3 rounded-lg border border-border/60 bg-card/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-3 w-3 text-primary" />
                    <span className={cn("text-[10px] uppercase tracking-wider font-semibold",
                      m.priority === "critical" ? "text-destructive" :
                      m.priority === "high" ? "text-warning" : "text-muted-foreground"
                    )}>{m.priority}</span>
                  </div>
                  <div className="text-sm font-medium">{m.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{m.estimatedMinutes}m · ROI {m.roiScore}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="AI coach analysis" description="Diagnostic narrative">
          <div className="space-y-3">
            <CoachLine
              tone={c.mastery < 50 ? "danger" : "info"}
              label="Why mastery is here"
              text={c.mastery < 50
                ? `Mastery is suppressed (${c.mastery}/100) because the concept has only been reviewed ${c.reviewCount} time${c.reviewCount === 1 ? "" : "s"} and last engaged ${c.lastReviewed}. Encoding is incomplete.`
                : `Mastery is solid at ${c.mastery}/100. ${c.reviewCount} reviews have produced durable encoding.`}
            />
            <CoachLine
              tone={c.risk > 60 ? "danger" : c.risk > 40 ? "warning" : "success"}
              label="Why risk is here"
              text={c.structuralRisk >= 8
                ? `Risk ${c.risk}/100 — base risk ${c.baseRisk} plus +${c.structuralRisk} structural pressure from ${weakPrereqs.length} weak prerequisite${weakPrereqs.length === 1 ? "" : "s"}${weakPrereqs[0] ? ` (e.g. ${weakPrereqs[0].name})` : ""}. The foundation is softening underneath this node.`
                : c.risk > 60
                ? `Risk ${c.risk}/100 — decay rate ${c.decayRate.toFixed(2)} combined with importance ${c.importance}/10 makes this concept a critical liability.`
                : `Risk ${c.risk}/100 — concept is in a manageable band given current memory and review cadence.`}
            />
            <CoachLine
              tone={c.isBottleneck ? "danger" : c.downstreamCount > 0 ? "info" : "success"}
              label="Graph position"
              text={c.isBottleneck
                ? `Bottleneck — gates ${c.downstreamCount} downstream concept${c.downstreamCount === 1 ? "" : "s"} (${c.dependentIds.length} direct, depth ${c.dependencyDepth}). Recovering this releases compounded risk across ${downstreamAll.slice(0, 2).map((d) => d.name).join(", ") || "the chain"}.`
                : c.downstreamCount > 0
                ? `Sits ${c.dependencyDepth} level${c.dependencyDepth === 1 ? "" : "s"} deep. Mastering this unlocks ${c.downstreamCount} downstream concept${c.downstreamCount === 1 ? "" : "s"} (${c.dependentIds.length} direct). Structural importance ${c.structuralImportance}/100.`
                : `Leaf node in the graph — no downstream dependencies. Treat as a terminal mastery target.`}
            />
            <CoachLine
              tone="success"
              label="What should happen next"
              text={c.isBottleneck
                ? `Prioritize recovery. Clearing this bottleneck reduces risk on ${c.downstreamCount} downstream node${c.downstreamCount === 1 ? "" : "s"} by an estimated ${Math.round(c.propagatedRisk * 0.35)} pts each.`
                : c.mastery < 40
                ? `Recover immediately. A focused ${Math.max(18, Math.round((100 - c.mastery) / 3))}-minute active-recall sprint will lift mastery into the stable zone and reduce downstream risk.`
                : c.mastery < 70
                ? `Reinforce. Schedule one spaced-repetition pass within 48 hours to push this concept into the strong band.`
                : `Maintain. A brief review every 7–10 days preserves the current mastery without diminishing returns.`}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between">
            <Link to="/diagnostics" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Run diagnostic
            </Link>
            <Link to="/recommendations" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              View recommendations <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function HealthRow({ label, value, tone }: { label: string; value: string; tone: "success" | "warning" | "danger" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="inline-flex items-center gap-1.5">
        <StatusDot tone={tone} />
        <span className="text-sm font-medium capitalize">{value}</span>
      </div>
    </div>
  );
}

function ProfileBlock({ icon: Icon, title, body }: { icon: typeof Crosshair; title: string; body: string }) {
  return (
    <div className="p-3.5 rounded-lg border border-border/60 bg-card/40">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
        <Icon className="h-3 w-3" /> {title}
      </div>
      <p className="text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "default" | "success" | "warning" | "danger" | "info" }) {
  const toneCls = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    info: "text-info",
  }[tone];
  return (
    <div className="p-3 rounded-lg border border-border/60 bg-card/40">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">{label}</div>
      <div className={cn("text-lg font-semibold tabular-nums", toneCls)}>{value}</div>
    </div>
  );
}

function CoachLine({ tone, label, text }: { tone: "success" | "warning" | "danger" | "info"; label: string; text: string }) {
  const borderCls = {
    success: "border-success/30 bg-success/5",
    warning: "border-warning/30 bg-warning/5",
    danger: "border-destructive/30 bg-destructive/5",
    info: "border-info/30 bg-info/5",
  }[tone];
  return (
    <div className={cn("p-3 rounded-lg border", borderCls)}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
        <Sparkles className="h-3 w-3" /> {label}
      </div>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}
