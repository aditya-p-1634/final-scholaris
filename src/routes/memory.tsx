import { createFileRoute } from "@tanstack/react-router";
import { Brain, AlertTriangle } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { PageHeader, Panel, StatCard, MetricBar } from "@/components/widgets";
import { concepts, subjects } from "@/lib/mock-data";

export const Route = createFileRoute("/memory")({
  head: () => ({ meta: [{ title: "Memory Dashboard — Scholaris" }] }),
  component: MemoryDashboard,
});

const memoryOverTime = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`, memory: 55 + Math.round(Math.sin(i / 2) * 6 + i * 0.8),
}));

function MemoryDashboard() {
  const decaying = concepts.filter((c) => c.memoryStrength < 50).sort((a, b) => a.memoryStrength - b.memoryStrength);
  const subjectMemory = subjects.map((s) => ({ name: s.code, memory: s.memory }));

  return (
    <div>
      <PageHeader eyebrow="Intelligence" title="Memory Dashboard" description="Track knowledge retention and forgetting curves across every concept." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Avg memory" value={61} suffix="/100" trend={1.8} icon={Brain} tone="info" />
        <StatCard label="Decay alerts" value={decaying.length} icon={AlertTriangle} tone="warning" />
        <StatCard label="Forgotten concepts" value={concepts.filter((c) => c.status === "forgotten").length} tone="danger" />
        <StatCard label="Recovery rate" value="84" suffix="%" trend={3.4} tone="success" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Panel title="Aggregate memory trend" className="lg:col-span-2">
          <div className="h-64 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={memoryOverTime} margin={{ top: 10, right: 8, left: -16 }}>
                <defs>
                  <linearGradient id="gmem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.14 230)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="oklch(0.72 0.14 230)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
                <XAxis dataKey="day" stroke="oklch(0.68 0.02 250)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.02 250)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.013 250)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="memory" stroke="oklch(0.72 0.14 230)" strokeWidth={2} fill="url(#gmem)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Memory by subject">
          <div className="h-64 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectMemory} margin={{ top: 10, right: 8, left: -16 }}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
                <XAxis dataKey="name" stroke="oklch(0.68 0.02 250)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.02 250)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.013 250)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="memory" fill="oklch(0.72 0.14 230)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Concepts crossing decay threshold" description="Schedule recovery before memory loss compounds">
        <div className="space-y-3">
          {decaying.map((c) => (
            <div key={c.id} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm font-medium truncate">{c.name}</span>
                  <span className="text-xs font-mono text-muted-foreground">{c.memoryStrength}/100</span>
                </div>
                <MetricBar value={c.memoryStrength} tone={c.memoryStrength < 25 ? "danger" : "warning"} />
                <div className="text-[11px] text-muted-foreground mt-1">{c.subjectName} · last reviewed {c.lastReviewed}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
