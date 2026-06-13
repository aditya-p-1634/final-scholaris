import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, Zap } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { PageHeader, Panel, StatCard, MetricBar } from "@/components/widgets";
import { useIntelligence } from "@/lib/intelligence";

export const Route = createFileRoute("/roi")({
  head: () => ({ meta: [{ title: "Knowledge ROI — Scholaris" }] }),
  component: RoiDashboard,
});

function RoiDashboard() {
  const { concepts, subjects, academicStatus } = useIntelligence();
  const ranked = [...concepts].sort((a, b) => b.roi - a.roi).slice(0, 8);
  const subjectRoi = subjects.map((s) => ({ name: s.code, roi: s.roi }));

  return (
    <div>
      <PageHeader eyebrow="Intelligence" title="Knowledge ROI" description="Where every minute of study creates the most academic value." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Avg ROI" value={academicStatus.overallRoi} suffix="/100" icon={TrendingUp} tone="success" />
        <StatCard label="High-ROI concepts" value={concepts.filter((c) => c.roi > 80).length} icon={Zap} tone="success" />
        <StatCard label="Hours invested (7d)" value={academicStatus.weeklyHours} />
        <StatCard label="Mastered concepts" value={academicStatus.masteredConcepts} tone="success" />
      </div>

      <Panel title="ROI by subject" className="mb-6">
        <div className="h-72 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjectRoi} margin={{ top: 10, right: 8, left: -16 }}>
              <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
              <XAxis dataKey="name" stroke="oklch(0.68 0.02 250)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.68 0.02 250)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "oklch(0.20 0.013 250)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="roi" fill="oklch(0.72 0.16 155)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Highest-ROI concepts" description="Where your effort compounds the fastest">
        <div className="space-y-3">
          {ranked.map((c, i) => (
            <Link to="/concepts/$id" params={{ id: c.id }} key={c.id} className="flex items-center gap-4 hover:bg-accent/20 -mx-2 px-2 py-1 rounded-md transition-colors">
              <div className="w-6 text-xs font-mono text-muted-foreground">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm font-medium truncate">{c.name}</span>
                  <span className="text-xs font-mono text-success">ROI {c.roi}</span>
                </div>
                <MetricBar value={c.roi} tone="success" />
                <div className="text-[11px] text-muted-foreground mt-1">{c.subjectName} · mastery {c.mastery}</div>
              </div>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
