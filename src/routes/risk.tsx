import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert, AlertTriangle } from "lucide-react";
import { ScatterChart, Scatter, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ZAxis } from "recharts";
import { PageHeader, Panel, StatCard } from "@/components/widgets";
import { concepts, subjects } from "@/lib/mock-data";

export const Route = createFileRoute("/risk")({
  head: () => ({ meta: [{ title: "Risk Dashboard — Scholaris" }] }),
  component: RiskDashboard,
});

function RiskDashboard() {
  const atRiskSubjects = subjects.filter((s) => s.risk >= 50).sort((a, b) => b.risk - a.risk);
  const scatter = concepts.map((c) => ({ x: c.mastery, y: c.risk, z: c.importance * 30, name: c.name, subject: c.subjectName }));

  return (
    <div>
      <PageHeader eyebrow="Intelligence" title="Risk Dashboard" description="Where you're most exposed to academic underperformance and decay." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Composite risk" value={45} suffix="/100" trend={-2.4} icon={ShieldAlert} tone="warning" />
        <StatCard label="Subjects at risk" value={atRiskSubjects.length} tone="danger" />
        <StatCard label="High-risk concepts" value={concepts.filter((c) => c.risk > 60).length} icon={AlertTriangle} tone="danger" />
        <StatCard label="Days to next exam" value="3" tone="warning" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Panel title="Risk vs mastery — concept map" description="Bubble size reflects concept importance" className="lg:col-span-2">
          <div className="h-80 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 16, left: -8, bottom: 8 }}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.06)" />
                <XAxis type="number" dataKey="x" name="Mastery" domain={[0, 100]} stroke="oklch(0.68 0.02 250)" fontSize={11} tickLine={false} axisLine={false} label={{ value: "Mastery", position: "insideBottom", offset: -2, fill: "oklch(0.68 0.02 250)", fontSize: 10 }} />
                <YAxis type="number" dataKey="y" name="Risk" domain={[0, 100]} stroke="oklch(0.68 0.02 250)" fontSize={11} tickLine={false} axisLine={false} />
                <ZAxis type="number" dataKey="z" range={[30, 220]} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.013 250)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 8, fontSize: 12 }} cursor={{ stroke: "oklch(1 0 0 / 0.1)" }} />
                <Scatter data={scatter} fill="oklch(0.62 0.22 25)" fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Subjects at risk">
          <div className="space-y-3">
            {atRiskSubjects.map((s) => (
              <Link to="/subjects/$id" params={{ id: s.id }} key={s.id} className="block p-3 rounded-lg border border-border/60 hover:border-border bg-card/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className={`text-xs font-mono ${s.risk > 70 ? "text-destructive" : "text-warning"}`}>{s.risk}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{s.code} · {s.weakConcepts} weak concepts</div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
