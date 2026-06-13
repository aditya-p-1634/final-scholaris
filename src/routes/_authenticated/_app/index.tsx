import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity, Brain, TrendingUp, ShieldAlert, Target, ArrowRight,
  Flame, Sparkles, AlertTriangle, Clock, Compass, GitBranch, Hourglass,
  Lightbulb, LineChart, Crosshair,
  Trophy, Zap, HeartPulse, CheckCircle2, CalendarRange, TrendingDown,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { PageHeader, StatCard, Panel, StatusDot, MetricBar, Explain, DeltaPill } from "@/components/widgets";
import { useIntelligence, useIntelligenceActions } from "@/lib/intelligence";
import { usePredictive, simulateWhatIf, getCoreState, type WhatIfId, type WhatIfScenario } from "@/lib/predictive";
import { useExecution, type MomentumReport, type DailyVictory, type StreakReport, type AcademicHealth, type DailyDebrief, type WeeklyReview } from "@/lib/execution";

export const Route = createFileRoute("/_authenticated/_app/")({
  head: () => ({
    meta: [
      { title: "Command Center — Scholaris" },
      { name: "description", content: "Your academic intelligence command center — decisions, missions, risk and ROI at a glance." },
    ],
  }),
  component: CommandCenter,
});

function CommandCenter() {
  const { concepts, subjects, missions, insights, academicStatus, focusToday, masteryTrend } = useIntelligence();
  const { runMission } = useIntelligenceActions();
  const predictive = usePredictive();
  const execution = useExecution();
  const navigate = useNavigate();

  const topMissions = missions.filter((m) => !m.completed).slice(0, 4);
  const criticalAlerts = insights.filter((i) => i.severity === "critical" || i.kind === "alert").slice(0, 3);
  const roiFeed = insights.filter((i) => i.kind === "roi" || i.kind === "recommendation").slice(0, 3);
  const weakest = [...concepts].sort((a, b) => a.mastery - b.mastery).slice(0, 5);

  const startTodaysPlan = () => {
    const next = missions.find((m) => !m.completed);
    if (next) {
      runMission(next.id);
      navigate({ to: "/missions" });
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Command Center"
        title="Good evening, Alex."
        description="Here's what to do today, whether you're improving, and what's at risk."
        actions={
          <button onClick={startTodaysPlan} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer">
            Start today's plan <ArrowRight className="h-3.5 w-3.5" />
          </button>
        }
      />

      {/* Execution layer — action first, analytics second. */}
      <ExecutionTop execution={execution} runMission={runMission} />


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Mastery" value={academicStatus.overallMastery} suffix="/100" trend={academicStatus.trend7d} icon={Activity} tone="default" />
        <StatCard label="Memory" value={academicStatus.overallMemory} suffix="/100" icon={Brain} tone="info" />
        <StatCard label="Knowledge ROI" value={academicStatus.overallRoi} suffix="/100" icon={TrendingUp} tone="success" />
        <StatCard label="Risk Index" value={academicStatus.overallRisk} suffix="/100" icon={ShieldAlert} tone="warning" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Panel title="Academic trajectory" description="Last 7 days — mastery, memory and ROI" className="lg:col-span-2">
          <div className="h-64 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={masteryTrend} margin={{ top: 10, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="gMastery" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.16 250)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="oklch(0.72 0.16 250)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gMemory" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.14 230)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="oklch(0.72 0.14 230)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
                <XAxis dataKey="day" stroke="oklch(0.68 0.02 250)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.02 250)" fontSize={11} tickLine={false} axisLine={false} domain={[30, 90]} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.013 250)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="mastery" stroke="oklch(0.72 0.16 250)" strokeWidth={2} fill="url(#gMastery)" />
                <Area type="monotone" dataKey="memory" stroke="oklch(0.72 0.14 230)" strokeWidth={2} fill="url(#gMemory)" />
                <Area type="monotone" dataKey="roi" stroke="oklch(0.72 0.16 155)" strokeWidth={2} fill="transparent" strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Today's focus" description={`${focusToday.completedMinutes}m of ${focusToday.totalMinutes}m planned`}>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Session progress</span>
                <span className="font-mono">{focusToday.sessionsCompleted}/{focusToday.sessionsPlanned}</span>
              </div>
              <MetricBar value={(focusToday.completedMinutes / focusToday.totalMinutes) * 100} tone="default" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Reviewed</div>
                <div className="text-xl font-semibold mt-0.5 tabular-nums">{focusToday.conceptsReviewed}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Recovered</div>
                <div className="text-xl font-semibold mt-0.5 tabular-nums text-success">{focusToday.conceptsRecovered}</div>
              </div>
            </div>
            <Link to="/sessions" className="block text-xs text-primary font-medium hover:underline">
              View session timeline →
            </Link>
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Panel title="Mission Priority Feed" description="ROI-ranked next actions" action={<Link to="/missions" className="text-xs text-primary hover:underline">All missions</Link>} className="lg:col-span-2">
          <div className="space-y-2">
            {topMissions.map((m, i) => (
              <motion.button
                key={m.id}
                onClick={() => runMission(m.id)}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group w-full text-left flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card hover:border-border hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <div className={`h-9 w-9 shrink-0 rounded-md grid place-items-center ${
                  m.priority === "critical" ? "bg-destructive/15 text-destructive" :
                  m.priority === "high" ? "bg-warning/15 text-warning" :
                  "bg-primary/15 text-primary"
                }`}>
                  {m.priority === "critical" ? <Flame className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{m.type}</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{m.subjectName}</span>
                  </div>
                  <div className="text-sm font-medium mt-0.5 truncate">{m.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{m.reason}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono text-success">ROI {m.roiScore}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center justify-end gap-0.5 mt-0.5">
                    <Clock className="h-2.5 w-2.5" />{m.estimatedMinutes}m
                  </div>
                </div>
              </motion.button>
            ))}
            {topMissions.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">All missions completed. The engine is recalibrating.</div>
            )}
          </div>
        </Panel>

        <Panel title="Academic Alerts" description="Requires attention now">
          <div className="space-y-3">
            {criticalAlerts.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-snug">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.body}</div>
                  <div className="text-[11px] text-muted-foreground/70 mt-1.5">{a.timestamp}</div>
                </div>
              </div>
            ))}
            {criticalAlerts.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">No alerts — all systems stable.</div>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Subject Battlefield" description="Live rankings" action={<Link to="/battlefield" className="text-xs text-primary hover:underline">Open</Link>} className="lg:col-span-2">
          <div className="divide-y divide-border/60">
            {subjects.slice(0, 5).map((s) => (
              <Link to="/subjects/$id" params={{ id: s.id }} key={s.id} className="flex items-center gap-4 py-3 hover:bg-accent/20 px-2 -mx-2 rounded-md transition-colors">
                <div className="text-xs font-mono text-muted-foreground w-5">{s.rank}</div>
                <div className="h-9 w-9 rounded-md shrink-0" style={{ background: `linear-gradient(135deg, ${s.color}, oklch(0.40 0.05 250))` }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{s.name}</span>
                    <StatusDot tone={s.status === "dominant" ? "success" : s.status === "stable" ? "info" : s.status === "at-risk" ? "warning" : "danger"} />
                  </div>
                  <div className="text-xs text-muted-foreground">{s.code} · {s.concepts} concepts · {s.weakConcepts} weak</div>
                </div>
                <div className="hidden sm:flex items-center gap-5 text-xs tabular-nums">
                  <div className="w-16 text-right"><div className="text-muted-foreground text-[10px]">Mastery</div><div className="font-mono">{s.mastery}</div></div>
                  <div className="w-16 text-right"><div className="text-muted-foreground text-[10px]">ROI</div><div className="font-mono text-success">{s.roi}</div></div>
                  <div className="w-16 text-right"><div className="text-muted-foreground text-[10px]">Risk</div><div className={`font-mono ${s.risk > 60 ? "text-destructive" : s.risk > 40 ? "text-warning" : ""}`}>{s.risk}</div></div>
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Weak Concept Feed" description="At highest risk of being lost" action={<Link to="/concepts" className="text-xs text-primary hover:underline">All</Link>}>
          <div className="space-y-3">
            {weakest.map((c) => (
              <Link to="/concepts/$id" params={{ id: c.id }} key={c.id} className="block group">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">{c.name}</span>
                  <span className="text-xs font-mono text-muted-foreground shrink-0">{c.mastery}</span>
                </div>
                <MetricBar value={c.mastery} tone={c.mastery < 30 ? "danger" : c.mastery < 50 ? "warning" : "default"} />
                <div className="text-[11px] text-muted-foreground mt-1">{c.subjectName} · {c.lastReviewed}</div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Knowledge ROI Feed" description="Where your time creates the most value" className="mt-6">
        <div className="grid md:grid-cols-3 gap-3">
          {roiFeed.map((r) => (
            <div key={r.id} className="rounded-lg border border-border/60 p-4 bg-gradient-to-br from-success/5 to-transparent">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-success" />
                <span className="text-[10px] uppercase tracking-wider font-semibold text-success">{r.kind === "roi" ? "ROI Insight" : "Recommendation"}</span>
              </div>
              <div className="text-sm font-medium leading-snug">{r.title}</div>
              <div className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{r.body}</div>
            </div>
          ))}
        </div>
      </Panel>

      <PredictiveSection predictive={predictive} runMission={runMission} />
    </div>
  );
}

function snapshotTone(risk: number): "success" | "info" | "warning" | "danger" {
  return risk >= 65 ? "danger" : risk >= 45 ? "warning" : risk >= 25 ? "info" : "success";
}

function PredictiveSection({ predictive, runMission }: { predictive: ReturnType<typeof usePredictive>; runMission: (id: string) => void }) {
  const { studentModel, digitalTwin, riskForecast, forgettingForecast, strategicInsights, missionForecasts, futureSelfPaths } = predictive;
  const twins = [digitalTwin.currentSelf, digitalTwin.projectedSelf, digitalTwin.futureSelf];
  const topMission = missionForecasts[0];

  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-1">
        <Compass className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">Predictive Intelligence</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Adaptive model · learner archetype <span className="text-foreground font-medium">{studentModel.archetype}</span> · profile confidence {studentModel.profileConfidence}%
      </p>

      {/* Academic Digital Twin */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {twins.map((t, i) => (
          <Panel key={t.label} title={t.label} description={t.description}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[10px] uppercase tracking-wider font-semibold ${i === 0 ? "text-info" : i === 1 ? "text-warning" : "text-success"}`}>
                {i === 0 ? "Now" : i === 1 ? "Maintain" : "Recommended"}
              </span>
              <StatusDot tone={snapshotTone(t.risk)} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label="Mastery" value={t.mastery} delta={i > 0 ? t.mastery - twins[0].mastery : undefined} />
              <Metric label="Memory" value={t.memory} delta={i > 0 ? t.memory - twins[0].memory : undefined} />
              <Metric label="Risk" value={t.risk} delta={i > 0 ? t.risk - twins[0].risk : undefined} invert />
            </div>
            <div className="mt-3 pt-3 border-t border-border/60 flex justify-between text-xs">
              <span className="text-muted-foreground">Readiness</span>
              <span className="font-mono">{t.readiness}/100 · {t.weakConcepts} weak</span>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Risk Forecast */}
        <Panel title="Risk Forecast" description="Composite risk trajectory if behaviour is unchanged" className="lg:col-span-2">
          <div className="grid grid-cols-4 gap-3 mb-2">
            {riskForecast.horizons.map((h) => (
              <div key={h.days} className="rounded-lg border border-border/60 bg-card/50 p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{h.days}d</div>
                <div className={`text-2xl font-semibold tabular-nums mt-1 ${h.risk >= 65 ? "text-destructive" : h.risk >= 45 ? "text-warning" : ""}`}>{h.risk}</div>
                <div className="mt-0.5"><DeltaPill value={h.delta} invert /></div>
              </div>
            ))}
          </div>
          <Explain data={riskForecast.explanation} />
        </Panel>

        {/* Forgetting alerts */}
        <Panel title="Forgetting Forecast" description={`${forgettingForecast.alerts.length} concept${forgettingForecast.alerts.length === 1 ? "" : "s"} approaching the cliff`}>
          {forgettingForecast.alerts.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No critical concepts projected to be forgotten within 10 days.</div>
          ) : (
            <div className="space-y-2.5">
              {forgettingForecast.alerts.slice(0, 4).map((a) => (
                <Link to="/concepts/$id" params={{ id: a.conceptId }} key={a.conceptId} className="block p-2.5 rounded-lg border border-border/60 bg-card/50 hover:border-border">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate flex items-center gap-1.5">
                      <Hourglass className={`h-3 w-3 shrink-0 ${a.severity === "critical" ? "text-destructive" : "text-warning"}`} />
                      {a.conceptName}
                    </span>
                    <span className={`text-xs font-mono shrink-0 ${a.severity === "critical" ? "text-destructive" : "text-warning"}`}>{a.daysUntil}d</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 ml-4.5">{a.subjectName} · {a.date}</div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Strategic priorities */}
      <Panel title="Strategic Priorities" description="Academic strategist · ranked by future impact" className="mb-6"
        action={<Link to="/coach" className="text-xs text-primary hover:underline">Open strategist</Link>}>
        <div className="space-y-3">
          {strategicInsights.slice(0, 4).map((s) => (
            <div key={s.id} className="rounded-lg border border-border/60 bg-card/50 p-3.5">
              <div className="flex items-start gap-2.5">
                <div className={`h-7 w-7 shrink-0 rounded-md grid place-items-center ${
                  s.severity === "critical" ? "bg-destructive/15 text-destructive" :
                  s.severity === "high" ? "bg-warning/15 text-warning" :
                  s.severity === "opportunity" ? "bg-success/15 text-success" : "bg-primary/15 text-primary"
                }`}>
                  {s.severity === "opportunity" ? <Lightbulb className="h-3.5 w-3.5" /> : s.severity === "critical" ? <Crosshair className="h-3.5 w-3.5" /> : <GitBranch className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-snug">{s.title}</div>
                  <Explain data={s.explanation} />
                </div>
              </div>
            </div>
          ))}
          {strategicInsights.length === 0 && (
            <div className="text-sm text-muted-foreground py-6 text-center">No strategic signals — the engine is calibrating from your behaviour.</div>
          )}
        </div>
      </Panel>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Future Self paths */}
        <Panel title="Future Self Simulator" description={`Trajectories over ${futureSelfPaths[0]?.horizonDays ?? 14} days`} className="lg:col-span-2">
          <div className="space-y-3">
            {futureSelfPaths.map((p) => (
              <div key={p.id} className="rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium">{p.label}</div>
                    <div className="text-[11px] text-muted-foreground">{p.description}</div>
                  </div>
                  <LineChart className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <PathMetric label="Mastery" value={p.metrics.mastery} />
                  <PathMetric label="Memory" value={p.metrics.memory} />
                  <PathMetric label="Risk" value={p.metrics.risk} danger />
                  <PathMetric label="Ready" value={p.metrics.readiness} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* What-If */}
        <WhatIfPanel />
      </div>

      {topMission && (
        <Panel title="Highest future-value action" className="mt-6"
          action={<button onClick={() => runMission(topMission.id)} className="text-xs text-primary hover:underline cursor-pointer">Run now</button>}>
          <div className="text-sm font-medium">{topMission.title}</div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="text-success font-mono">Future value {topMission.futureValue}/100</span>
            <span>· -{topMission.riskPrevented} risk</span>
            <span>· {topMission.conceptsUnlocked} unlocks</span>
          </div>
          <Explain data={topMission.forecastExplanation} />
        </Panel>
      )}
    </div>
  );
}

function Metric({ label, value, delta, invert }: { label: string; value: number; delta?: number; invert?: boolean }) {
  return (
    <div className="rounded-md bg-muted/40 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {typeof delta === "number" && <div className="flex justify-center"><DeltaPill value={delta} invert={invert} /></div>}
    </div>
  );
}

function PathMetric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${danger && value >= 60 ? "text-destructive" : danger && value >= 45 ? "text-warning" : ""}`}>{value}</div>
    </div>
  );
}

const WHAT_IF_OPTIONS: { id: WhatIfId; label: string }[] = [
  { id: "ignore-top-mission", label: "Ignore my top mission" },
  { id: "study-5-extra-hours", label: "Study 5 extra hours this week" },
  { id: "recover-bottleneck", label: "Recover my biggest bottleneck" },
  { id: "skip-revision-14d", label: "Skip revisions for 14 days" },
];

function WhatIfPanel() {
  const predictive = usePredictive();
  const [scenario, setScenario] = useState<WhatIfScenario | null>(null);
  const run = (id: WhatIfId) => setScenario(simulateWhatIf(getCoreState(), predictive.studentModel, id));

  return (
    <Panel title="What-If Analysis" description="Simulate an intervention">
      <div className="space-y-1.5">
        {WHAT_IF_OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => run(o.id)}
            className={`w-full text-left text-xs px-3 h-9 rounded-md border transition-colors cursor-pointer ${
              scenario?.id === o.id ? "border-primary bg-primary/10 text-foreground" : "border-border/60 bg-card/50 text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {scenario && (
        <div className="mt-3 pt-3 border-t border-border/60">
          <p className="text-xs text-foreground leading-relaxed">{scenario.explanation.reason}</p>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div className="rounded-md bg-muted/40 py-1.5">
              <div className="text-[10px] uppercase text-muted-foreground">Risk</div>
              <DeltaPill value={scenario.deltaRisk} invert />
            </div>
            <div className="rounded-md bg-muted/40 py-1.5">
              <div className="text-[10px] uppercase text-muted-foreground">Mastery</div>
              <DeltaPill value={scenario.deltaMastery} />
            </div>
            <div className="rounded-md bg-muted/40 py-1.5">
              <div className="text-[10px] uppercase text-muted-foreground">Memory</div>
              <DeltaPill value={scenario.deltaMemory} />
            </div>
          </div>
          <Explain data={scenario.explanation} />
        </div>
      )}
    </Panel>
  );
}
