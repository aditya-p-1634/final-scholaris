import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Activity, Brain, TrendingUp, ShieldAlert, Calendar, Clock,
  Sparkles, Target, AlertTriangle, GitBranch, ChevronRight, Layers,
} from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis,
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from "recharts";
import { PageHeader, Panel, StatCard, StatusDot, MetricBar } from "@/components/widgets";
import {
  useIntelligence, useIntelligenceActions, useIntelligenceStore, computeSubjectReadiness,
} from "@/lib/intelligence";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/subjects/$id")({
  loader: ({ params }) => ({ id: params.id }),
  head: () => ({
    meta: [
      { title: `Subject Intelligence — Scholaris` },
      { name: "description", content: `Complete intelligence profile for this subject.` },
    ],
  }),
  component: SubjectIntelligence,
  notFoundComponent: () => (
    <div className="text-center py-20">
      <p className="text-sm text-muted-foreground">Subject not found.</p>
      <Link to="/battlefield" className="text-primary text-sm mt-2 inline-block">Back to battlefield</Link>
    </div>
  ),
});

function SubjectIntelligence() {
  const { id } = Route.useLoaderData();
  const { subjects, concepts, missions, recommendations } = useIntelligence();
  const { runMission } = useIntelligenceActions();
  const navigate = useNavigate();

  const s = subjects.find((x) => x.id === id);
  if (!s) throw notFound();

  const subjectConcepts = concepts.filter((c) => c.subjectId === s.id);
  const subjectMissions = missions.filter((m) => m.subjectId === s.id);
  const subjectRecs = recommendations.filter((r) => r.subjectId === s.id);

  const trend = Array.from({ length: 8 }).map((_, i) => {
    const t = i / 7;
    return {
      week: `W${i + 1}`,
      mastery: Math.round(s.mastery - (1 - t) * (Math.abs(s.trend) * 2 + 6)),
      memory: Math.round(s.memory - (1 - t) * 8),
      roi: Math.round(s.roi - (1 - t) * 5),
      risk: Math.round(s.risk + (1 - t) * (s.trend < 0 ? -10 : 4)),
    };
  });

  const radarData = [
    { metric: "Mastery", value: s.mastery },
    { metric: "Memory", value: s.memory },
    { metric: "ROI", value: s.roi },
    { metric: "Stability", value: 100 - s.risk },
    { metric: "Coverage", value: subjectConcepts.length ? Math.round(((subjectConcepts.length - s.weakConcepts) / subjectConcepts.length) * 100) : 0 },
    { metric: "Engagement", value: Math.min(100, s.hoursThisWeek * 10) },
  ];

  const topicMap = new Map<string, { topic: string; mastery: number; count: number }>();
  subjectConcepts.forEach((c) => {
    const t = topicMap.get(c.topic) ?? { topic: c.topic, mastery: 0, count: 0 };
    t.mastery += c.mastery;
    t.count += 1;
    topicMap.set(c.topic, t);
  });
  const topics = Array.from(topicMap.values())
    .map((t) => ({ ...t, mastery: Math.round(t.mastery / t.count) }))
    .sort((a, b) => b.mastery - a.mastery);

  const strongTopics = topics.filter((t) => t.mastery >= 70);
  const developingTopics = topics.filter((t) => t.mastery >= 45 && t.mastery < 70);
  const weakTopics = topics.filter((t) => t.mastery < 45);

  const dist = {
    strong: subjectConcepts.filter((c) => c.status === "mastered" || c.status === "strong").length,
    developing: subjectConcepts.filter((c) => c.status === "developing").length,
    weak: subjectConcepts.filter((c) => c.status === "weak").length,
    forgotten: subjectConcepts.filter((c) => c.status === "forgotten").length,
  };

  // Graph-derived intelligence: real bottlenecks, structural foundations, critical-path nodes.
  const bottlenecks = [...subjectConcepts]
    .filter((c) => c.isBottleneck)
    .sort((a, b) => b.bottleneckScore - a.bottleneckScore)
    .slice(0, 4);

  const foundation = [...subjectConcepts]
    .filter((c) => c.downstreamCount > 0)
    .sort((a, b) => b.structuralImportance - a.structuralImportance)
    .slice(0, 4);

  const criticalConcepts = [...subjectConcepts]
    .sort((a, b) => b.criticalPathScore - a.criticalPathScore)
    .slice(0, 4);

  const structuralWeaknesses = subjectConcepts.filter((c) => c.structuralRisk >= 8).length;

  const readiness = computeSubjectReadiness(useIntelligenceStore.getState(), s.id);
  const predictedLow = Math.max(0, readiness - 6);
  const predictedHigh = Math.min(100, readiness + 5);
  const activeMissions = subjectMissions.filter((m) => !m.completed);

  const runTopMission = () => {
    const top = activeMissions[0];
    if (top) runMission(top.id);
  };

  return (
    <div>
      <Link to="/battlefield" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3 w-3" /> Subject Battlefield
      </Link>

      <PageHeader
        eyebrow={`${s.code} · Subject Intelligence`}
        title={s.name}
        description={`Rank #${s.rank} · ${subjectConcepts.length} concepts tracked · ${s.weakConcepts} require intervention`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 h-9 rounded-md border border-border bg-card text-xs">
              <StatusDot tone={s.status === "dominant" ? "success" : s.status === "stable" ? "info" : s.status === "at-risk" ? "warning" : "danger"} />
              <span className="font-medium capitalize">{s.status.replace("-", " ")}</span>
            </div>
            {activeMissions[0] && (
              <button onClick={runTopMission} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 cursor-pointer">
                <Target className="h-3.5 w-3.5" /> Run top mission
              </button>
            )}
            <button onClick={() => navigate({ to: "/recommendations" })} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-xs font-medium hover:bg-accent cursor-pointer">
              <Sparkles className="h-3.5 w-3.5" /> Recommendations
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Mastery" value={s.mastery} suffix="/100" trend={s.trend} icon={Activity} />
        <StatCard label="Memory" value={s.memory} suffix="/100" icon={Brain} tone="info" />
        <StatCard label="ROI" value={s.roi} suffix="/100" icon={TrendingUp} tone="success" />
        <StatCard label="Risk" value={s.risk} suffix="/100" icon={ShieldAlert} tone={s.risk > 60 ? "danger" : s.risk > 40 ? "warning" : "default"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Panel title="Trend analysis" description="Eight-week intelligence trajectory" className="lg:col-span-2">
          <div className="h-72 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
                <XAxis dataKey="week" stroke="oklch(0.68 0.02 250)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.02 250)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.013 250)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="line" />
                <Line type="monotone" dataKey="mastery" stroke="oklch(0.72 0.16 250)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="memory" stroke="oklch(0.72 0.14 230)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="roi" stroke="oklch(0.72 0.16 155)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="risk" stroke="oklch(0.62 0.22 25)" strokeWidth={2} dot={false} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Intelligence radar" description="Six-axis academic signal">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="oklch(1 0 0 / 0.08)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "oklch(0.78 0.02 250)", fontSize: 10 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke={s.color} fill={s.color} fillOpacity={0.28} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Panel title="Topic breakdown" description="Grouped by mastery band" className="lg:col-span-2">
          <div className="grid sm:grid-cols-3 gap-4">
            <TopicColumn label="Strong" tone="success" topics={strongTopics} />
            <TopicColumn label="Developing" tone="warning" topics={developingTopics} />
            <TopicColumn label="Weak" tone="danger" topics={weakTopics} />
          </div>
        </Panel>

        <Panel title="Concept distribution">
          <div className="space-y-3">
            <DistRow label="Total" value={subjectConcepts.length} tone="default" pct={100} />
            <DistRow label="Strong" value={dist.strong} tone="success" pct={(dist.strong / Math.max(1, subjectConcepts.length)) * 100} />
            <DistRow label="Developing" value={dist.developing} tone="default" pct={(dist.developing / Math.max(1, subjectConcepts.length)) * 100} />
            <DistRow label="Weak" value={dist.weak} tone="warning" pct={(dist.weak / Math.max(1, subjectConcepts.length)) * 100} />
            <DistRow label="Forgotten" value={dist.forgotten} tone="danger" pct={(dist.forgotten / Math.max(1, subjectConcepts.length)) * 100} />
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Panel title="Assessment intelligence" description="Readiness for upcoming evaluations">
          {s.nextAssessment ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <Calendar className="h-4 w-4 text-destructive shrink-0" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-destructive">Next assessment</div>
                  <div className="text-sm font-medium mt-0.5">{s.nextAssessment}{s.daysToAssessment !== undefined ? ` · in ${s.daysToAssessment}d` : ""}</div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold">Readiness</span>
                  <span className="font-mono">{readiness}/100</span>
                </div>
                <MetricBar value={readiness} tone={readiness > 70 ? "success" : readiness > 50 ? "warning" : "danger"} />
              </div>
              <div className="rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Predicted performance</div>
                <div className="text-2xl font-semibold tabular-nums">{predictedLow}–{predictedHigh}<span className="text-sm text-muted-foreground ml-1">%</span></div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Confidence band based on current concept readiness</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-8 text-center">No scheduled assessments.</div>
          )}
        </Panel>

        <Panel title="Mission intelligence" description="Active and recommended" className="lg:col-span-2">
          {activeMissions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No active missions. The intelligence engine is calibrated.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {activeMissions.slice(0, 4).map((m) => (
                <button
                  key={m.id}
                  onClick={() => runMission(m.id)}
                  className="text-left p-3.5 rounded-lg border border-border/60 bg-card/50 hover:border-border transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Target className="h-3 w-3 text-primary" />
                    <span className={cn("text-[10px] uppercase tracking-wider font-semibold",
                      m.priority === "critical" ? "text-destructive" :
                      m.priority === "high" ? "text-warning" : "text-muted-foreground"
                    )}>{m.priority}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">· {m.type}</span>
                  </div>
                  <div className="text-sm font-medium mb-1">{m.title}</div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2">{m.reason}</div>
                  <div className="flex items-center gap-3 mt-2 text-[11px]">
                    <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-2.5 w-2.5" />{m.estimatedMinutes}m</span>
                    <span className="text-success font-medium">ROI {m.roiScore}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Panel title="Coach insights" description="Subject-specific strategic guidance">
          <div className="space-y-3">
            <CoachLine
              tone={s.trend < 0 ? "warning" : "success"}
              text={s.trend < 0
                ? `Momentum has reversed (${s.trend.toFixed(1)}% this week). Reallocate 2 sessions from low-risk subjects to rebuild ${s.name}'s foundation.`
                : `Trajectory is healthy. Maintain the current cadence — ${s.hoursThisWeek}h/week is producing measurable mastery gains.`}
            />
            <CoachLine
              tone={bottlenecks[0] ? "danger" : "info"}
              text={bottlenecks[0]
                ? `Top structural bottleneck: "${bottlenecks[0].name}" gates ${bottlenecks[0].downstreamCount} downstream concept${bottlenecks[0].downstreamCount === 1 ? "" : "s"} at mastery ${bottlenecks[0].mastery}/100. Clearing it lifts pressure across the chain.`
                : `No structural bottlenecks — no weak concept is gating multiple downstream nodes.`}
            />
            <CoachLine
              tone={s.dependencyHealth < 60 ? "warning" : "success"}
              text={`Dependency health ${s.dependencyHealth}/100${structuralWeaknesses ? ` · ${structuralWeaknesses} concept${structuralWeaknesses === 1 ? "" : "s"} carrying structural risk from weak prerequisites` : " · foundations are holding"}.`}
            />
            <CoachLine
              tone={s.risk > 60 ? "danger" : "success"}
              text={s.risk > 60
                ? `Risk index ${s.risk}/100 is critical. A 25-minute recovery sprint on weak topics today reduces projected exam risk by ~12%.`
                : `Risk profile is contained at ${s.risk}/100. Prioritize ROI expansion over recovery this week.`}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{subjectRecs.length} live recommendations</span>
            <Link to="/coach" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              Open AI Coach <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </Panel>

        <Panel title="Graph intelligence" description={`Dependency health ${s.dependencyHealth}/100 · ${bottlenecks.length} bottleneck${bottlenecks.length === 1 ? "" : "s"} · ${structuralWeaknesses} structural weakness${structuralWeaknesses === 1 ? "" : "es"}`}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-success mb-2 flex items-center gap-1.5">
                <GitBranch className="h-3 w-3" /> Critical foundation
              </div>
              <div className="space-y-2">
                {foundation.map((c) => (
                  <Link key={c.id} to="/concepts/$id" params={{ id: c.id }} className="block group">
                    <div className="text-sm font-medium group-hover:text-primary transition-colors truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">Unlocks {c.downstreamCount} · structural {c.structuralImportance}/100</div>
                  </Link>
                ))}
                {foundation.length === 0 && <div className="text-xs text-muted-foreground italic">No structural anchors detected.</div>}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-destructive mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" /> Bottlenecks
              </div>
              <div className="space-y-2">
                {bottlenecks.map((c) => (
                  <Link key={c.id} to="/concepts/$id" params={{ id: c.id }} className="block group">
                    <div className="text-sm font-medium group-hover:text-primary transition-colors truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">Gates {c.downstreamCount} · mastery {c.mastery} · risk {c.risk}</div>
                  </Link>
                ))}
                {bottlenecks.length === 0 && <div className="text-xs text-muted-foreground italic">No bottlenecks right now.</div>}
              </div>
            </div>
          </div>
          {criticalConcepts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-warning mb-2 flex items-center gap-1.5">
                <Layers className="h-3 w-3" /> Most critical concepts
              </div>
              <div className="grid grid-cols-2 gap-2">
                {criticalConcepts.map((c) => (
                  <Link key={c.id} to="/concepts/$id" params={{ id: c.id }} className="block group">
                    <div className="text-sm font-medium group-hover:text-primary transition-colors truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">Critical path {c.criticalPathScore}/100 · depth {c.dependencyDepth}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="All concepts in this subject"
        description={`${subjectConcepts.length} tracked · drill down for full intelligence`}
        action={<Link to="/concepts" className="text-xs text-primary hover:underline">Concept library</Link>}
      >
        {subjectConcepts.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No concepts tracked yet for this subject.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {subjectConcepts.map((c) => (
              <Link to="/concepts/$id" params={{ id: c.id }} key={c.id} className="block group p-3 rounded-lg border border-border/50 hover:border-border hover:bg-card/50 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium group-hover:text-primary transition-colors truncate">{c.name}</span>
                  <span className="text-xs font-mono text-muted-foreground shrink-0 ml-2">{c.mastery}/100</span>
                </div>
                <MetricBar value={c.mastery} tone={c.mastery < 30 ? "danger" : c.mastery < 50 ? "warning" : c.mastery > 80 ? "success" : "default"} />
                <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Layers className="h-2.5 w-2.5" />{c.topic}</span>
                  <span>{c.lastReviewed}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function CoachLine({ tone, text }: { tone: "success" | "warning" | "danger" | "info"; text: string }) {
  const borderCls = {
    success: "border-success/30 bg-success/5",
    warning: "border-warning/30 bg-warning/5",
    danger: "border-destructive/30 bg-destructive/5",
    info: "border-info/30 bg-info/5",
  }[tone];
  return (
    <div className={cn("flex gap-2.5 p-3 rounded-lg border", borderCls)}>
      <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-foreground/70" />
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}

function TopicColumn({ label, tone, topics }: { label: string; tone: "success" | "warning" | "danger"; topics: { topic: string; mastery: number; count: number }[] }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2.5">
        <StatusDot tone={tone} />
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label} · {topics.length}</span>
      </div>
      {topics.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">None</div>
      ) : (
        <div className="space-y-2.5">
          {topics.map((t) => (
            <div key={t.topic}>
              <div className="flex justify-between text-xs mb-1">
                <span className="truncate pr-2">{t.topic}</span>
                <span className="font-mono text-muted-foreground">{t.mastery}</span>
              </div>
              <MetricBar value={t.mastery} tone={tone} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DistRow({ label, value, tone, pct }: { label: string; value: number; tone: "default" | "success" | "warning" | "danger"; pct: number }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm">{label}</span>
        <span className="text-sm font-mono">{value}</span>
      </div>
      <MetricBar value={pct} tone={tone} />
    </div>
  );
}
