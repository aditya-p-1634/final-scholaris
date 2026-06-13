import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity, Brain, TrendingUp, ShieldAlert, Target, ArrowRight,
  Flame, Sparkles, AlertTriangle, Clock,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { PageHeader, StatCard, Panel, StatusDot, MetricBar } from "@/components/widgets";
import { useIntelligence, useIntelligenceActions } from "@/lib/intelligence";

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
        description="Your academic intelligence is calibrated. Here's what matters today."
        actions={
          <button onClick={startTodaysPlan} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer">
            Start today's plan <ArrowRight className="h-3.5 w-3.5" />
          </button>
        }
      />

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
    </div>
  );
}
