import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Activity, Brain, TrendingUp, ShieldAlert, Calendar, Clock } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from "recharts";
import { PageHeader, Panel, StatCard, StatusDot, MetricBar } from "@/components/widgets";
import { subjects, concepts, missions } from "@/lib/mock-data";

export const Route = createFileRoute("/subjects/$id")({
  loader: ({ params }) => {
    const subject = subjects.find((s) => s.id === params.id);
    if (!subject) throw notFound();
    return { subject };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.subject.name ?? "Subject"} — Scholaris` },
      { name: "description", content: `Intelligence breakdown for ${loaderData?.subject.name}.` },
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

  const radarData = [
    { metric: "Mastery", value: s.mastery },
    { metric: "Memory", value: s.memory },
    { metric: "ROI", value: s.roi },
    { metric: "Stability", value: 100 - s.risk },
    { metric: "Coverage", value: Math.round(((s.concepts - s.weakConcepts) / s.concepts) * 100) },
    { metric: "Engagement", value: Math.min(100, s.hoursThisWeek * 10) },
  ];

  return (
    <div>
      <Link to="/battlefield" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3 w-3" /> Battlefield
      </Link>

      <PageHeader
        eyebrow={s.code}
        title={s.name}
        description={`Rank #${s.rank} · ${s.concepts} concepts tracked · ${s.weakConcepts} require attention`}
        actions={
          <div className="flex items-center gap-1.5 px-3 h-9 rounded-md border border-border bg-card text-xs">
            <StatusDot tone={s.status === "dominant" ? "success" : s.status === "stable" ? "info" : s.status === "at-risk" ? "warning" : "danger"} />
            <span className="font-medium capitalize">{s.status.replace("-", " ")}</span>
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
        <Panel title="Intelligence radar" description="Six-axis academic signal" className="lg:col-span-2">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="oklch(1 0 0 / 0.08)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "oklch(0.78 0.02 250)", fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke={s.color} fill={s.color} fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Schedule">
          <div className="space-y-4">
            {s.nextAssessment && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <Calendar className="h-4 w-4 text-destructive shrink-0" />
                <div>
                  <div className="text-xs uppercase tracking-wider font-semibold text-destructive">Next assessment</div>
                  <div className="text-sm font-medium mt-0.5">{s.nextAssessment}</div>
                </div>
              </div>
            )}
            <div className="space-y-2.5">
              <Row label="Weak concepts" value={`${s.weakConcepts}/${s.concepts}`} />
              <Row label="Hours this week" value={`${s.hoursThisWeek}h`} />
              <Row label="Status" value={s.status} mono={false} />
              <Row label="Trend (7d)" value={`${s.trend >= 0 ? "+" : ""}${s.trend.toFixed(1)}%`} />
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Concepts in this subject" description={`${subjectConcepts.length} tracked`} action={<Link to="/concepts" className="text-xs text-primary hover:underline">All concepts</Link>}>
          {subjectConcepts.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No concepts tracked yet for this subject.</div>
          ) : (
            <div className="space-y-3">
              {subjectConcepts.map((c) => (
                <Link to="/concepts/$id" params={{ id: c.id }} key={c.id} className="block group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">{c.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{c.mastery}/100</span>
                  </div>
                  <MetricBar value={c.mastery} tone={c.mastery < 30 ? "danger" : c.mastery < 50 ? "warning" : c.mastery > 80 ? "success" : "default"} />
                  <div className="text-[11px] text-muted-foreground mt-1">{c.topic} · {c.lastReviewed}</div>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Active missions for this subject" description={`${subjectMissions.length} queued`} action={<Link to="/missions" className="text-xs text-primary hover:underline">All</Link>}>
          {subjectMissions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No active missions. The intelligence engine is calibrated.</div>
          ) : (
            <div className="space-y-2.5">
              {subjectMissions.map((m) => (
                <div key={m.id} className="p-3 rounded-lg border border-border/60 bg-card/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                      m.priority === "critical" ? "text-destructive" :
                      m.priority === "high" ? "text-warning" : "text-muted-foreground"
                    }`}>{m.priority}</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.type}</span>
                  </div>
                  <div className="text-sm font-medium">{m.title}</div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{m.estimatedMinutes}m</span>
                    <span className="text-success">ROI {m.roiScore}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono" : "capitalize"}>{value}</span>
    </div>
  );
}
