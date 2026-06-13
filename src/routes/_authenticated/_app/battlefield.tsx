import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Swords, TrendingUp, TrendingDown } from "lucide-react";
import { PageHeader, Panel, StatusDot, MetricBar } from "@/components/widgets";
import { useIntelligence } from "@/lib/intelligence";

export const Route = createFileRoute("/_authenticated/_app/battlefield")({
  head: () => ({
    meta: [
      { title: "Subject Battlefield — Scholaris" },
      { name: "description", content: "Live rankings of every subject by mastery, memory, ROI and risk." },
    ],
  }),
  component: Battlefield,
});

const statusTone: Record<string, "success" | "info" | "warning" | "danger"> = {
  dominant: "success", stable: "info", "at-risk": "warning", critical: "danger",
};

function Battlefield() {
  const { subjects } = useIntelligence();
  const ranked = [...subjects].sort((a, b) => a.rank - b.rank);

  return (
    <div>
      <PageHeader
        eyebrow="Battlefield"
        title="Subject Battlefield"
        description="Every subject is ranked across mastery, memory, ROI and risk. Strike where it matters."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ranked.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link to="/subjects/$id" params={{ id: s.id }} className="block group relative overflow-hidden rounded-xl border border-border bg-card p-5 hover:border-border/100 transition-all hover:-translate-y-0.5">
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-30 blur-2xl pointer-events-none" style={{ background: s.color }} />

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">#{s.rank}</span>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{s.code}</span>
                      <StatusDot tone={statusTone[s.status]} />
                    </div>
                    <h3 className="text-base font-semibold tracking-tight truncate">{s.name}</h3>
                  </div>
                  <Swords className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                </div>

                <div className="space-y-2.5 mb-4">
                  <Row label="Mastery" value={s.mastery} tone="default" />
                  <Row label="Memory" value={s.memory} tone="default" />
                  <Row label="ROI" value={s.roi} tone="success" />
                  <Row label="Risk" value={s.risk} tone={s.risk > 60 ? "danger" : s.risk > 40 ? "warning" : "default"} />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-mono">{s.weakConcepts}</span> weak of {s.concepts}
                  </div>
                  <div className={`text-xs font-medium flex items-center gap-1 ${s.trend >= 0 ? "text-success" : "text-destructive"}`}>
                    {s.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(s.trend).toFixed(1)}%
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <Panel title="Battlefield summary" description="Rankings ordered by composite intelligence score" className="mt-8">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left font-medium px-5 py-2">Rank</th>
                <th className="text-left font-medium py-2">Subject</th>
                <th className="text-right font-medium py-2">Mastery</th>
                <th className="text-right font-medium py-2">Memory</th>
                <th className="text-right font-medium py-2">ROI</th>
                <th className="text-right font-medium py-2">Risk</th>
                <th className="text-right font-medium px-5 py-2">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {ranked.map((s) => (
                <tr key={s.id} className="hover:bg-accent/20">
                  <td className="px-5 py-3 font-mono text-muted-foreground">{s.rank}</td>
                  <td className="py-3">
                    <Link to="/subjects/$id" params={{ id: s.id }} className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.code}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 text-right tabular-nums">{s.mastery}</td>
                  <td className="py-3 text-right tabular-nums">{s.memory}</td>
                  <td className="py-3 text-right tabular-nums text-success">{s.roi}</td>
                  <td className={`py-3 text-right tabular-nums ${s.risk > 60 ? "text-destructive" : s.risk > 40 ? "text-warning" : ""}`}>{s.risk}</td>
                  <td className={`px-5 py-3 text-right tabular-nums ${s.trend >= 0 ? "text-success" : "text-destructive"}`}>
                    {s.trend >= 0 ? "+" : ""}{s.trend.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: number; tone: "default" | "success" | "warning" | "danger" }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
      <MetricBar value={value} tone={tone} />
    </div>
  );
}
