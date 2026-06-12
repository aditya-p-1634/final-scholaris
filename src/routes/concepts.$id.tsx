import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Activity, Brain, TrendingUp, ShieldAlert, Clock, Sparkles } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { PageHeader, Panel, StatCard, StatusDot, MetricBar } from "@/components/widgets";
import { concepts } from "@/lib/mock-data";

export const Route = createFileRoute("/concepts/$id")({
  loader: ({ params }) => {
    const concept = concepts.find((c) => c.id === params.id);
    if (!concept) throw notFound();
    return { concept };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.concept.name ?? "Concept"} — Scholaris` },
    ],
  }),
  component: ConceptDetail,
  notFoundComponent: () => <div className="text-center py-20 text-sm text-muted-foreground">Concept not found.</div>,
});

const memoryCurve = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  memory: Math.max(8, Math.round(95 * Math.exp(-i * 0.12) + Math.random() * 6)),
}));

function ConceptDetail() {
  const { concept: c } = Route.useLoaderData();

  return (
    <div>
      <Link to="/concepts" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3 w-3" /> Concepts
      </Link>

      <PageHeader
        eyebrow={`${c.subjectName} · ${c.topic}`}
        title={c.name}
        actions={
          <span className="inline-flex items-center gap-1.5 text-xs px-3 h-9 rounded-md border border-border bg-card capitalize">
            <StatusDot tone={c.status === "mastered" ? "success" : c.status === "strong" ? "info" : c.status === "weak" ? "warning" : c.status === "forgotten" ? "danger" : "default"} />
            {c.status}
          </span>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Mastery" value={c.mastery} suffix="/100" icon={Activity} />
        <StatCard label="Memory" value={c.memoryStrength} suffix="/100" icon={Brain} tone="info" />
        <StatCard label="ROI" value={c.roi} suffix="/100" icon={TrendingUp} tone="success" />
        <StatCard label="Risk" value={c.risk} suffix="/100" icon={ShieldAlert} tone={c.risk > 60 ? "danger" : c.risk > 40 ? "warning" : "default"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Panel title="Memory decay curve" description="Projected retention without review" className="lg:col-span-2">
          <div className="h-64 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={memoryCurve} margin={{ top: 10, right: 8, left: -16 }}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
                <XAxis dataKey="day" stroke="oklch(0.68 0.02 250)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.02 250)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.013 250)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="memory" stroke="oklch(0.72 0.14 230)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Intelligence panel">
          <div className="space-y-3.5">
            <Item label="Importance" value={`${c.importance}/10`} />
            <Item label="Decay rate" value={c.decayRate.toFixed(2)} />
            <Item label="Reviews to date" value={String(c.reviewCount)} />
            <Item label="Last reviewed" value={c.lastReviewed} />
            <Item label="Topic" value={c.topic} />
          </div>
          <div className="mt-5 pt-4 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-success mb-2">
              <Sparkles className="h-3 w-3" /> Coach insight
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {c.mastery < 40
                ? "This concept is at high risk. A 15-minute recovery session would lift mastery to a stable range."
                : c.mastery < 70
                ? "A short reinforcement session would consolidate this concept and reduce decay."
                : "Concept is well established. Schedule a brief spaced-repetition pass to maintain mastery."}
            </p>
          </div>
        </Panel>
      </div>

      <Panel title="Activity timeline" description="Recent reviews and signals">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-muted grid place-items-center shrink-0">
                <Clock className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="flex-1 pb-3 border-b border-border/40 last:border-0">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{i === 1 ? "Active recall session" : i === 2 ? "Concept review" : i === 3 ? "Diagnostic question" : "Initial encoding"}</span>
                  <span className="text-xs text-muted-foreground">{i * 3}d ago</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Mastery {Math.max(20, c.mastery - i * 8)} → {Math.max(25, c.mastery - i * 6)}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
