import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, ArrowUpRight, Clock, Target, ShieldAlert, TrendingUp,
  Layers, Compass, Filter, Zap, FileText,
} from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/widgets";
import { cn } from "@/lib/utils";
import { useIntelligence, useIntelligenceActions, type RecommendationCategory } from "@/lib/intelligence";

export const Route = createFileRoute("/recommendations")({
  head: () => ({
    meta: [
      { title: "Recommendation Engine — Scholaris" },
      { name: "description", content: "Every recommendation is derived live from your concept-level intelligence." },
    ],
  }),
  component: RecommendationsPage,
});

const categoryMeta: Record<RecommendationCategory, { label: string; tone: string; icon: typeof Sparkles }> = {
  recovery:      { label: "Recovery",      tone: "danger",  icon: ShieldAlert },
  reinforcement: { label: "Reinforcement", tone: "warning", icon: Zap },
  expansion:     { label: "Expansion",     tone: "success", icon: TrendingUp },
  assessment:    { label: "Assessment",    tone: "info",    icon: Target },
  strategic:     { label: "Strategic",     tone: "default", icon: Compass },
};

const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 } as const;

function RecommendationsPage() {
  const { recommendations, subjects, concepts, missions } = useIntelligence();
  const { runMission } = useIntelligenceActions();
  const [filter, setFilter] = useState<RecommendationCategory | "all">("all");

  const filtered = recommendations
    .filter((r) => filter === "all" || r.category === filter)
    .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || b.impact - a.impact);

  const byCategory = (cat: RecommendationCategory) => recommendations.filter((r) => r.category === cat).length;
  const criticalCount = recommendations.filter((r) => r.urgency === "critical").length;
  const avgConfidence = recommendations.length
    ? Math.round(recommendations.reduce((a, b) => a + b.confidence, 0) / recommendations.length)
    : 0;
  const totalMinutes = recommendations.reduce((a, b) => a + b.minutes, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Recommendation Engine"
        title="Intelligence → Action"
        description="Every recommendation is generated live from concept state, memory decay, and the assessment calendar."
        actions={
          <div className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-border bg-card text-xs">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">{recommendations.length} recommendations live</span>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total recommendations" value={recommendations.length} icon={Sparkles} />
        <StatCard label="Critical urgency" value={criticalCount} icon={ShieldAlert} tone="danger" />
        <StatCard label="Avg confidence" value={avgConfidence} suffix="%" icon={Target} tone="info" />
        <StatCard label="Time on table" value={`${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`} icon={Clock} tone="success" />
      </div>

      <Panel title="Filter by category" description="Each category corresponds to a distinct intelligence pathway" className="mb-6">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={recommendations.length} icon={Filter} />
          {(Object.keys(categoryMeta) as RecommendationCategory[]).map((cat) => {
            const m = categoryMeta[cat];
            return (
              <FilterChip key={cat} active={filter === cat} onClick={() => setFilter(cat)} label={m.label} count={byCategory(cat)} icon={m.icon} />
            );
          })}
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        {filtered.map((r, i) => {
          const subject = r.subjectId ? subjects.find((s) => s.id === r.subjectId) : undefined;
          const concept = r.conceptId ? concepts.find((c) => c.id === r.conceptId) : undefined;
          const linkedMission = missions.find((m) => m.subjectId === r.subjectId && (r.conceptId ? m.conceptIds.includes(r.conceptId) : true));
          const meta = categoryMeta[r.category];
          const Icon = meta.icon;

          const urgencyCls = {
            critical: "text-destructive bg-destructive/10 border-destructive/30",
            high: "text-warning bg-warning/10 border-warning/30",
            medium: "text-info bg-info/10 border-info/30",
            low: "text-muted-foreground bg-muted border-border",
          }[r.urgency];
          const toneRing = {
            danger: "from-destructive/15", warning: "from-warning/15", success: "from-success/15", info: "from-info/15", default: "from-primary/10",
          }[meta.tone];

          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.02 }}
              className="relative overflow-hidden rounded-xl border border-border bg-card p-5"
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent opacity-60 pointer-events-none", toneRing)} />
              <div className="relative">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-card border border-border grid place-items-center">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{meta.label}</div>
                  </div>
                  <span className={cn("text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border", urgencyCls)}>
                    {r.urgency}
                  </span>
                </div>

                <h3 className="text-base font-semibold tracking-tight mb-2">{r.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{r.reason}</p>

                {r.evidence.length > 0 && (
                  <div className="mb-3 p-2.5 rounded-md bg-muted/30 border border-border/40">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                      <FileText className="h-3 w-3" /> Evidence
                    </div>
                    <ul className="space-y-1">
                      {r.evidence.slice(0, 3).map((e, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-muted-foreground/60 mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/60 shrink-0" />
                          <span>{e}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Metric label="Expected benefit" value={r.expectedBenefit} valueClass="text-success" />
                  <Metric label="Estimated time" value={`${r.minutes}m`} />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <ScoreBar label="Confidence" value={r.confidence} tone="info" />
                  <ScoreBar label="Impact" value={r.impact} tone="success" />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                    {subject && (
                      <Link to="/subjects/$id" params={{ id: subject.id }} className="inline-flex items-center gap-1 hover:text-foreground">
                        <Layers className="h-3 w-3" /> {subject.code}
                      </Link>
                    )}
                    {concept && (
                      <Link to="/concepts/$id" params={{ id: concept.id }} className="inline-flex items-center gap-1 hover:text-foreground">
                        · {concept.name}
                      </Link>
                    )}
                  </div>
                  {linkedMission ? (
                    <button
                      onClick={() => runMission(linkedMission.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
                    >
                      Act on this <ArrowUpRight className="h-3 w-3" />
                    </button>
                  ) : (
                    <Link to="/coach" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      Discuss with coach <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-sm text-muted-foreground">No recommendations in this category right now.</div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, count, icon: Icon }: {
  active: boolean; onClick: () => void; label: string; count: number; icon: typeof Sparkles;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 h-8 rounded-md border text-xs font-medium transition-colors cursor-pointer",
        active ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border"
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
      <span className={cn("rounded px-1.5 text-[10px] tabular-nums", active ? "bg-primary-foreground/15" : "bg-muted")}>{count}</span>
    </button>
  );
}

function Metric({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-medium mt-0.5 leading-tight", valueClass)}>{value}</div>
    </div>
  );
}

function ScoreBar({ label, value, tone }: { label: string; value: number; tone: "info" | "success" }) {
  const fill = tone === "info" ? "bg-info" : "bg-success";
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="font-mono">{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("h-full rounded-full", fill)}
        />
      </div>
    </div>
  );
}
