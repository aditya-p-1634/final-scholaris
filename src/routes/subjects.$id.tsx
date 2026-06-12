import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft, Activity, Brain, TrendingUp, ShieldAlert, Calendar, Clock,
  Sparkles, Target, AlertTriangle, GitBranch, ChevronRight, Layers,
} from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis,
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from "recharts";
import { PageHeader, Panel, StatCard, StatusDot, MetricBar } from "@/components/widgets";
import { subjects, concepts, missions } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subjects/$id")({
  loader: ({ params }) => {
    const subject = subjects.find((s) => s.id === params.id);
    if (!subject) throw notFound();
    return { subject };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.subject.name ?? "Subject"} — Subject Intelligence` },
      { name: "description", content: `Complete intelligence profile for ${loaderData?.subject.name}.` },
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
  const { subject: s } = Route.useLoaderData();
  const subjectConcepts = concepts.filter((c) => c.subjectId === s.id);
  const subjectMissions = missions.filter((m) => m.subjectId === s.id);

  // Trend series — deterministic shape from current metrics
  const trend = Array.from({ length: 8 }).map((_, i) => {
    const t = i / 7;
    return {
      week: `W${i + 1}`,
      mastery: Math.round(s.mastery - (1 - t) * (s.trend * 4 + 6)),
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
    { metric: "Coverage", value: Math.round(((s.concepts - s.weakConcepts) / s.concepts) * 100) },
    { metric: "Engagement", value: Math.min(100, s.hoursThisWeek * 10) },
  ];

  // Topic breakdown derived from concept list
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

  // Concept distribution
  const dist = {
    strong: subjectConcepts.filter((c) => c.status === "mastered" || c.status === "strong").length,
    developing: subjectConcepts.filter((c) => c.status === "developing").length,
    weak: subjectConcepts.filter((c) => c.status === "weak").length,
    forgotten: subjectConcepts.filter((c) => c.status === "forgotten").length,
  };

  // Bottlenecks: high importance, low mastery
  const bottlenecks = [...subjectConcepts]
    .sort((a, b) => b.importance * (100 - b.mastery) - a.importance * (100 - a.mastery))
    .slice(0, 4);

  // Critical foundation: high importance + high mastery (load-bearing)
  const foundation = [...subjectConcepts]
    .filter((c) => c.importance >= 8)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 4);

  const readiness = Math.max(0, Math.min(100, Math.round(s.mastery * 0.55 + s.memory * 0.35 - s.risk * 0.2 + 12)));
  const predictedLow = Math.max(0, readiness - 6);
  const predictedHigh = Math.min(100, readiness + 5);

  const recommended = subjectMissions.filter((m) => !m.completed).slice(0, 3);

  return (
    <div>
      <Link to="/battlefield" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3 w-3" /> Subject Battlefield
      </Link>

      <PageHeader
        eyebrow={`${s.code} · Subject Intelligence`}
        title={s.name}
        description={`Rank #${s.rank} · ${s.concepts} concepts tracked · ${s.weakConcepts} require intervention`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 h-9 rounded-md border border-border bg-card text-xs">
              <StatusDot tone={s.status === "dominant" ? "success" : s.status === "stable" ? "info" : s.status === "at-risk" ? "warning" : "danger"} />
              <span className="font-medium capitalize">{s.status.replace("-", " ")}</span>
            </div>
            <Link to="/recommendations" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
              <Sparkles className="h-3.5 w-3.5" /> Recommendations
            </Link>
          </div>
        }
      />

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Mastery" value={s.mastery} suffix="/100" trend={s.trend} icon={Activity} />
        <StatCard label="Memory" value={s.memory} suffix="/100" icon={Brain} tone="info" />
        <StatCard label="ROI" value={s.roi} suffix="/100" icon={TrendingUp} tone="success" />
        <StatCard label="Risk" value={s.risk} suffix="/100" icon={ShieldAlert} tone={s.risk > 60 ? "danger" : s.risk > 40 ? "warning" : "default"} />
      </div>

      {/* Trends + Radar */}
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

      {/* Topic breakdown + Concept distribution */}
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
            <DistRow label="Total" value={s.concepts} tone="default" pct={100} />
            <DistRow label="Strong" value={dist.strong} tone="success" pct={(dist.strong / s.concepts) * 100} />
            <DistRow label="Developing" value={dist.developing} tone="default" pct={(dist.developing / s.concepts) * 100} />
            <DistRow label="Weak" value={dist.weak} tone="warning" pct={(dist.weak / s.concepts) * 100} />
            <DistRow label="Forgotten" value={dist.forgotten} tone="danger" pct={(dist.forgotten / s.concepts) * 100} />
          </div>
        </Panel>
      </div>

      {/* Assessment Intelligence + Mission Intelligence */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Panel title="Assessment intelligence" description="Readiness for upcoming evaluations">
          {s.nextAssessment ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <Calendar className="h-4 w-4 text-destructive shrink-0" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-destructive">Next assessment</div>
                  <div className="text-sm font-medium mt-0.5">{s.nextAssessment}</div>
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
          {subjectMissions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No active missions. The intelligence engine is calibrated.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {subjectMissions.slice(0, 4).map((m) => (
                <div key={m.id} className="p-3.5 rounded-lg border border-border/60 bg-card/50 hover:border-border transition-colors">
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
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Coach + Dependencies */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Panel title="Coach insights" description="Subject-specific strategic guidance">
          <div className="space-y-3">
            <CoachLine
              tone="warning"
              text={s.trend < 0
                ? `Momentum has reversed (${s.trend.toFixed(1)}% this week). Reallocate 2 sessions from low-risk subjects to rebuild ${s.name}'s foundation.`
                : `Trajectory is healthy. Maintain the current cadence — ${s.hoursThisWeek}h/week is producing measurable mastery gains.`}
            />
            <CoachLine
              tone="info"
              text={`The bottleneck right now is "${bottlenecks[0]?.name ?? "—"}". It is high-importance and gating ${Math.max(2, Math.round(s.weakConcepts / 4))} downstream concepts.`}
            />
            <CoachLine
              tone={s.risk > 60 ? "danger" : "success"}
              text={s.risk > 60
                ? `Risk index ${s.risk}/100 is critical. A 25-minute recovery sprint on weak topics today reduces projected exam risk by ~12%.`
                : `Risk profile is contained at ${s.risk}/100. Prioritize ROI expansion over recovery this week.`}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">3 insights generated · updated {new Date().toLocaleDateString()}</span>
            <Link to="/coach" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              Open AI Coach <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </Panel>

        <Panel title="Dependency overview" description="Foundation and bottleneck concepts">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-success mb-2 flex items-center gap-1.5">
                <GitBranch className="h-3 w-3" /> Critical foundation
              </div>
              <div className="space-y-2">
                {foundation.map((c) => (
                  <Link key={c.id} to="/concepts/$id" params={{ id: c.id }} className="block group">
                    <div className="text-sm font-medium group-hover:text-primary transition-colors truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">Importance {c.importance}/10 · mastery {c.mastery}</div>
                  </Link>
                ))}
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
                    <div className="text-[11px] text-muted-foreground">Risk {c.risk} · mastery {c.mastery}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Concepts list */}
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

      {recommended.length > 0 && (
        <div className="mt-6">
          <Link to="/diagnostics" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            Diagnose underlying causes <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}
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
  const dotTone = tone === "success" ? "success" : tone === "warning" ? "warning" : "danger";
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2.5">
        <StatusDot tone={dotTone} />
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
