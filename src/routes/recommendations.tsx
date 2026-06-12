import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, ArrowUpRight, Clock, Target, ShieldAlert, TrendingUp,
  Layers, Compass, Filter, Zap,
} from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/widgets";
import { cn } from "@/lib/utils";
import { subjects, concepts, missions } from "@/lib/mock-data";

export const Route = createFileRoute("/recommendations")({
  head: () => ({
    meta: [
      { title: "Recommendation Engine — Scholaris" },
      { name: "description", content: "Convert academic intelligence into prioritized actions." },
    ],
  }),
  component: RecommendationsPage,
});

type Category = "recovery" | "reinforcement" | "expansion" | "assessment" | "strategic";

interface Recommendation {
  id: string;
  title: string;
  category: Category;
  reason: string;
  expectedBenefit: string;
  confidence: number;
  impact: number;
  urgency: "critical" | "high" | "medium" | "low";
  minutes: number;
  subjectId?: string;
  conceptId?: string;
}

const categoryMeta: Record<Category, { label: string; tone: string; icon: typeof Sparkles; description: string }> = {
  recovery:      { label: "Recovery",      tone: "danger",  icon: ShieldAlert,  description: "Restore forgotten or critically decayed concepts" },
  reinforcement: { label: "Reinforcement", tone: "warning", icon: Zap,          description: "Consolidate developing concepts before decay" },
  expansion:     { label: "Expansion",     tone: "success", icon: TrendingUp,   description: "Build outward from mastered nodes" },
  assessment:    { label: "Assessment",    tone: "info",    description: "Calibrate intelligence with diagnostics", icon: Target },
  strategic:     { label: "Strategic",     tone: "default", icon: Compass,      description: "Long-horizon allocation and trajectory shifts" },
};

const recommendations: Recommendation[] = [
  {
    id: "r-1",
    title: "Recover Schrödinger Equation now",
    category: "recovery",
    reason: "Exam in 3 days · concept decayed past forgetting threshold · gates 6 downstream concepts in Quantum Mechanics.",
    expectedBenefit: "+8 exam readiness · +4.2% subject mastery",
    confidence: 94,
    impact: 92,
    urgency: "critical",
    minutes: 25,
    subjectId: "sub-5",
    conceptId: "c-8",
  },
  {
    id: "r-2",
    title: "Run Macroeconomics diagnostic",
    category: "assessment",
    reason: "12 stale concepts · model uncertainty rising · last calibration 14 days ago.",
    expectedBenefit: "Recalibrate 12 concept signals · sharpen ROI ranking",
    confidence: 88,
    impact: 71,
    urgency: "high",
    minutes: 18,
    subjectId: "sub-4",
  },
  {
    id: "r-3",
    title: "Reinforce Stereochemistry cluster",
    category: "reinforcement",
    reason: "Three connected concepts approaching memory decay threshold · high topic ROI.",
    expectedBenefit: "+11% cluster memory · prevent 3 recoveries next week",
    confidence: 91,
    impact: 78,
    urgency: "high",
    minutes: 35,
    subjectId: "sub-1",
    conceptId: "c-2",
  },
  {
    id: "r-4",
    title: "Shift 2 hours from Philosophy → Quantum Mechanics",
    category: "strategic",
    reason: "Philosophy is in dominant zone with low decay (81 mastery). Quantum is critical with exam in 3 days.",
    expectedBenefit: "-14 risk on Quantum · negligible Philosophy decay",
    confidence: 86,
    impact: 84,
    urgency: "high",
    minutes: 120,
    subjectId: "sub-5",
  },
  {
    id: "r-5",
    title: "Expand SN2 → SN1 comparative mechanism",
    category: "expansion",
    reason: "SN2 is mastered (82). Adjacent concept SN1 unlocks 4 high-yield exam patterns.",
    expectedBenefit: "+1 mastered node · +5 expected exam coverage",
    confidence: 79,
    impact: 62,
    urgency: "medium",
    minutes: 40,
    subjectId: "sub-1",
    conceptId: "c-1",
  },
  {
    id: "r-6",
    title: "Restore Sodium-Potassium Pump",
    category: "recovery",
    reason: "Forgotten 28 days · BIO 240 quiz tomorrow · importance 8/10.",
    expectedBenefit: "+6 quiz readiness · unblock 2 dependents",
    confidence: 90,
    impact: 74,
    urgency: "critical",
    minutes: 22,
    subjectId: "sub-3",
    conceptId: "c-6",
  },
  {
    id: "r-7",
    title: "Maintain Eigenvalue mastery streak",
    category: "reinforcement",
    reason: "Spaced-repetition window opens in 18 hours. Skipping it raises decay rate by 38%.",
    expectedBenefit: "Preserve 94 mastery · save 25m future recovery",
    confidence: 82,
    impact: 41,
    urgency: "medium",
    minutes: 12,
    subjectId: "sub-2",
    conceptId: "c-3",
  },
  {
    id: "r-8",
    title: "Rebalance weekly mission mix",
    category: "strategic",
    reason: "73% of last week was recovery work. Mix should shift toward reinforcement to break the firefighting cycle.",
    expectedBenefit: "Lower 30-day risk projection by ~9 points",
    confidence: 74,
    impact: 68,
    urgency: "medium",
    minutes: 8,
  },
];

const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };

function RecommendationsPage() {
  const [filter, setFilter] = useState<Category | "all">("all");

  const filtered = recommendations
    .filter((r) => filter === "all" || r.category === filter)
    .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || b.impact - a.impact);

  const byCategory = (cat: Category) => recommendations.filter((r) => r.category === cat).length;

  const criticalCount = recommendations.filter((r) => r.urgency === "critical").length;
  const avgConfidence = Math.round(recommendations.reduce((a, b) => a + b.confidence, 0) / recommendations.length);
  const totalMinutes = recommendations.reduce((a, b) => a + b.minutes, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Recommendation Engine"
        title="Intelligence → Action"
        description="The engine converts every signal in your academic model into prioritized, justified actions."
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
        <StatCard label="Total time on table" value={`${Math.round(totalMinutes / 60)}h ${totalMinutes % 60}m`} icon={Clock} tone="success" />
      </div>

      <Panel title="Filter by category" description="Each category corresponds to a distinct intelligence pathway" className="mb-6">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={recommendations.length} icon={Filter} />
          {(Object.keys(categoryMeta) as Category[]).map((cat) => {
            const m = categoryMeta[cat];
            return (
              <FilterChip key={cat} active={filter === cat} onClick={() => setFilter(cat)} label={m.label} count={byCategory(cat)} icon={m.icon} />
            );
          })}
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        {filtered.map((r, i) => (
          <RecommendationCard key={r.id} rec={r} index={i} />
        ))}
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
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border"
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
      <span className={cn("rounded px-1.5 text-[10px] tabular-nums", active ? "bg-primary-foreground/15" : "bg-muted")}>{count}</span>
    </button>
  );
}

function RecommendationCard({ rec, index }: { rec: Recommendation; index: number }) {
  const meta = categoryMeta[rec.category];
  const Icon = meta.icon;
  const subject = rec.subjectId ? subjects.find((s) => s.id === rec.subjectId) : undefined;
  const concept = rec.conceptId ? concepts.find((c) => c.id === rec.conceptId) : undefined;
  const linkedMission = missions.find((m) => m.subjectId === rec.subjectId);

  const urgencyCls = {
    critical: "text-destructive bg-destructive/10 border-destructive/30",
    high: "text-warning bg-warning/10 border-warning/30",
    medium: "text-info bg-info/10 border-info/30",
    low: "text-muted-foreground bg-muted border-border",
  }[rec.urgency];

  const toneRing = {
    danger: "from-destructive/15",
    warning: "from-warning/15",
    success: "from-success/15",
    info: "from-info/15",
    default: "from-primary/10",
  }[meta.tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
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
            {rec.urgency}
          </span>
        </div>

        <h3 className="text-base font-semibold tracking-tight mb-2">{rec.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{rec.reason}</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <Metric label="Expected benefit" value={rec.expectedBenefit} valueClass="text-success" small />
          <Metric label="Estimated time" value={`${rec.minutes}m`} small />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <ScoreBar label="Confidence" value={rec.confidence} tone="info" />
          <ScoreBar label="Impact" value={rec.impact} tone="success" />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
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
          <Link
            to={linkedMission ? "/missions" : "/coach"}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Act on this <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function Metric({ label, value, valueClass, small }: { label: string; value: string; valueClass?: string; small?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
      <div className={cn(small ? "text-sm" : "text-base", "font-medium mt-0.5 leading-tight", valueClass)}>{value}</div>
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
