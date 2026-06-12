import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, AlertTriangle, Brain, ShieldAlert, ClipboardCheck,
  GitCommit, History, TrendingDown, ChevronDown, ChevronUp,
  CircleAlert, CheckCircle2, Layers,
} from "lucide-react";
import { PageHeader, Panel, StatCard, StatusDot } from "@/components/widgets";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/diagnostics")({
  head: () => ({
    meta: [
      { title: "Diagnostics Center — Scholaris" },
      { name: "description", content: "Academic black box recorder. Why did it happen, and what should happen next?" },
    ],
  }),
  component: DiagnosticsPage,
});

type Category =
  | "memory-gap"
  | "concept-gap"
  | "practice-gap"
  | "assessment-gap"
  | "revision-gap"
  | "consistency-gap";

type Severity = "critical" | "high" | "medium";

interface Incident {
  id: string;
  problem: string;
  type: "mastery-drop" | "memory-collapse" | "assessment-failure" | "risk-increase";
  category: Category;
  subject: string;
  subjectId?: string;
  occurredAt: string;
  severity: Severity;
  confidence: number;
  evidence: string[];
  rootCause: string;
  recovery: { title: string; minutes: number; impact: string }[];
}

const categoryMeta: Record<Category, { label: string; description: string; icon: typeof Brain }> = {
  "memory-gap":      { label: "Memory Gap",      description: "Retention collapsed faster than the model predicted.",       icon: Brain },
  "concept-gap":     { label: "Concept Gap",     description: "A foundational concept was never solidly encoded.",          icon: Layers },
  "practice-gap":    { label: "Practice Gap",    description: "Insufficient active recall or applied problem-solving.",     icon: Activity },
  "assessment-gap":  { label: "Assessment Gap",  description: "Model uncertainty grew without recent calibration.",         icon: ClipboardCheck },
  "revision-gap":    { label: "Revision Gap",    description: "Spaced-repetition windows were missed.",                     icon: History },
  "consistency-gap": { label: "Consistency Gap", description: "Irregular cadence broke retention compounding.",             icon: GitCommit },
};

const incidents: Incident[] = [
  {
    id: "inc-1",
    problem: "Quantum Mechanics mastery dropped 6.1% in 7 days",
    type: "mastery-drop",
    category: "revision-gap",
    subject: "Quantum Mechanics",
    subjectId: "sub-5",
    occurredAt: "Today · 02:14",
    severity: "critical",
    confidence: 93,
    evidence: [
      "Schrödinger Equation last reviewed 11 days ago (expected: every 4 days)",
      "Hilbert Spaces decayed past forgetting threshold 6 days ago",
      "Only 1.2 hours allocated this week vs. 5.5h baseline",
      "3 scheduled review windows skipped",
    ],
    rootCause:
      "Reviews stopped firing after the Macroeconomics exam absorbed 70% of study time. Spaced-repetition windows lapsed for 4 high-importance concepts in parallel, producing compounding decay.",
    recovery: [
      { title: "Recover Schrödinger Equation", minutes: 25, impact: "+8 readiness" },
      { title: "Restore Hilbert Spaces foundation", minutes: 45, impact: "unblocks 6 dependents" },
      { title: "Schedule 3x weekly Quantum slots", minutes: 5, impact: "prevents recurrence" },
    ],
  },
  {
    id: "inc-2",
    problem: "Cellular Biology memory collapsed across 7 concepts",
    type: "memory-collapse",
    category: "memory-gap",
    subject: "Cellular Biology",
    subjectId: "sub-3",
    occurredAt: "Yesterday · 18:40",
    severity: "high",
    confidence: 88,
    evidence: [
      "7 concepts crossed the forgetting threshold in 5 days",
      "Average decay rate 0.24 — 2x baseline for the subject",
      "Last full review session 9 days ago",
      "Sodium-Potassium Pump unreviewed for 28 days",
    ],
    rootCause:
      "Memory model predicted decay 4 days earlier than observed — review cadence was set on the assumption of stronger initial encoding. The encoding signal was inflated by a single high-performance session that was not representative.",
    recovery: [
      { title: "Run BIO 240 diagnostic", minutes: 18, impact: "recalibrate 12 signals" },
      { title: "Targeted recovery on top 4 decayed concepts", minutes: 60, impact: "+14% subject memory" },
    ],
  },
  {
    id: "inc-3",
    problem: "Macroeconomics practice quiz: 52% (predicted 71%)",
    type: "assessment-failure",
    category: "practice-gap",
    subject: "Macroeconomics",
    subjectId: "sub-4",
    occurredAt: "2 days ago · 09:15",
    severity: "high",
    confidence: 84,
    evidence: [
      "Phillips Curve attempted 4 times, mastery 41 — model expected 65",
      "Zero applied problems solved in the last 14 days",
      "All recent study was passive reading, no active recall",
      "12 concepts marked 'studied' but never tested",
    ],
    rootCause:
      "Mastery signal was inflated by passive review without active retrieval. The model could not distinguish recognition from recall because no problem-solving evidence was present in the session log.",
    recovery: [
      { title: "Macroeconomics diagnostic", minutes: 18, impact: "recalibrate weak signals" },
      { title: "10 applied Phillips Curve problems", minutes: 30, impact: "+12 concept mastery" },
    ],
  },
  {
    id: "inc-4",
    problem: "Linear Algebra risk index increased from 22 → 34",
    type: "risk-increase",
    category: "consistency-gap",
    subject: "Linear Algebra",
    subjectId: "sub-2",
    occurredAt: "4 days ago · 11:02",
    severity: "medium",
    confidence: 79,
    evidence: [
      "Study cadence dropped from 4 sessions/week to 1",
      "Gram-Schmidt mastery fell from 52 → 34",
      "No active mission targeting weak topics",
      "Upcoming midterm in 10 days",
    ],
    rootCause:
      "Cadence broke after a 3-day gap. The compounding effect of consistent practice was lost, and weak concepts were not surfaced into missions because no diagnostic was run during the gap.",
    recovery: [
      { title: "Restore weekly cadence", minutes: 5, impact: "rebuild compounding" },
      { title: "Gram-Schmidt recovery sprint", minutes: 22, impact: "+18 concept mastery" },
    ],
  },
  {
    id: "inc-5",
    problem: "Stereochemistry cluster signals diverging from observed",
    type: "mastery-drop",
    category: "assessment-gap",
    subject: "Organic Chemistry",
    subjectId: "sub-1",
    occurredAt: "5 days ago · 16:30",
    severity: "medium",
    confidence: 76,
    evidence: [
      "Last diagnostic 21 days ago",
      "Model uncertainty band widened from ±4 to ±11",
      "3 concepts marked strong have not been tested",
    ],
    rootCause:
      "No assessment evidence for 21 days. Model is extrapolating from stale signals and confidence is degrading. A short diagnostic would re-anchor the cluster.",
    recovery: [
      { title: "Stereochemistry cluster diagnostic", minutes: 15, impact: "restore signal confidence" },
    ],
  },
];

const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2 };

function DiagnosticsPage() {
  const [openId, setOpenId] = useState<string | null>(incidents[0].id);
  const [filter, setFilter] = useState<Category | "all">("all");

  const filtered = incidents
    .filter((i) => filter === "all" || i.category === filter)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const criticalCount = incidents.filter((i) => i.severity === "critical").length;
  const avgConfidence = Math.round(incidents.reduce((a, b) => a + b.confidence, 0) / incidents.length);

  return (
    <div>
      <PageHeader
        eyebrow="Diagnostics Center"
        title="Academic Black Box Recorder"
        description="Every regression is recorded with evidence, root cause, and a recovery plan. What happened, why, and what should happen next."
        actions={
          <div className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md border border-border bg-card text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            <span className="font-medium">{incidents.length} incidents on record</span>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Open incidents" value={incidents.length} icon={CircleAlert} />
        <StatCard label="Critical severity" value={criticalCount} icon={ShieldAlert} tone="danger" />
        <StatCard label="Root cause confidence" value={avgConfidence} suffix="%" icon={Brain} tone="info" />
        <StatCard label="Recovery plans ready" value={incidents.reduce((a, b) => a + b.recovery.length, 0)} icon={CheckCircle2} tone="success" />
      </div>

      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-4 mb-6">
        <Panel title="Diagnostic categories" description="Filter by failure mode">
          <div className="space-y-1">
            <CategoryButton active={filter === "all"} onClick={() => setFilter("all")} label="All incidents" count={incidents.length} />
            {(Object.keys(categoryMeta) as Category[]).map((cat) => {
              const m = categoryMeta[cat];
              const count = incidents.filter((i) => i.category === cat).length;
              return (
                <CategoryButton key={cat} active={filter === cat} onClick={() => setFilter(cat)} label={m.label} count={count} icon={m.icon} />
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-border/60 text-[11px] text-muted-foreground leading-relaxed">
            {filter === "all" ? "Showing every recorded incident." : categoryMeta[filter].description}
          </div>
        </Panel>

        <Panel title="Incident timeline" description="Most recent first">
          <div className="relative pl-4">
            <div className="absolute left-1.5 top-1 bottom-1 w-px bg-border" />
            <div className="space-y-3">
              {filtered.map((i) => (
                <div key={i.id} className="relative">
                  <div className={cn(
                    "absolute -left-3.5 top-1.5 h-2 w-2 rounded-full ring-4 ring-card",
                    i.severity === "critical" ? "bg-destructive" : i.severity === "high" ? "bg-warning" : "bg-info"
                  )} />
                  <button
                    onClick={() => setOpenId(openId === i.id ? null : i.id)}
                    className="text-left w-full hover:bg-card/50 rounded-md px-2 py-1 -mx-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{i.occurredAt}</span>
                      <span>·</span>
                      <span className="uppercase tracking-wider">{i.subject}</span>
                    </div>
                    <div className="text-sm font-medium mt-0.5">{i.problem}</div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="space-y-3">
        {filtered.map((i, idx) => (
          <IncidentCard
            key={i.id}
            incident={i}
            open={openId === i.id}
            onToggle={() => setOpenId(openId === i.id ? null : i.id)}
            index={idx}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-sm text-muted-foreground">No incidents in this category. The system is stable.</div>
      )}
    </div>
  );
}

function CategoryButton({ active, onClick, label, count, icon: Icon }: {
  active: boolean; onClick: () => void; label: string; count: number; icon?: typeof Brain;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-sm transition-colors cursor-pointer",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-card/60"
      )}
    >
      <span className="inline-flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span className="text-[10px] tabular-nums px-1.5 rounded bg-muted">{count}</span>
    </button>
  );
}

function IncidentCard({ incident: i, open, onToggle, index }: { incident: Incident; open: boolean; onToggle: () => void; index: number }) {
  const meta = categoryMeta[i.category];
  const Icon = meta.icon;
  const typeIcon = {
    "mastery-drop": TrendingDown,
    "memory-collapse": Brain,
    "assessment-failure": ClipboardCheck,
    "risk-increase": ShieldAlert,
  }[i.type];
  const TypeIcon = typeIcon;
  const sevTone = i.severity === "critical" ? "danger" : i.severity === "high" ? "warning" : "info";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.02 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <button onClick={onToggle} className="w-full text-left p-5 cursor-pointer hover:bg-card/60 transition-colors">
        <div className="flex items-start gap-4">
          <div className={cn("h-9 w-9 rounded-lg grid place-items-center shrink-0 border",
            i.severity === "critical" ? "bg-destructive/10 border-destructive/30 text-destructive" :
            i.severity === "high" ? "bg-warning/10 border-warning/30 text-warning" :
            "bg-info/10 border-info/30 text-info"
          )}>
            <TypeIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 text-[10px] uppercase tracking-wider font-semibold mb-1">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Icon className="h-3 w-3" /> {meta.label}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{i.subject}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{i.occurredAt}</span>
            </div>
            <h3 className="text-base font-semibold tracking-tight">{i.problem}</h3>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <StatusDot tone={sevTone} />
                <span className="capitalize">{i.severity} severity</span>
              </span>
              <span>Root cause confidence <span className="font-mono text-foreground">{i.confidence}%</span></span>
              <span>{i.recovery.length} recovery step{i.recovery.length === 1 ? "" : "s"}</span>
            </div>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25 }}
          className="border-t border-border/60"
        >
          <div className="grid lg:grid-cols-3 gap-4 p-5">
            <Section title="Root cause analysis">
              <p className="text-sm leading-relaxed">{i.rootCause}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                <Brain className="h-3 w-3" /> Confidence {i.confidence}%
              </div>
            </Section>

            <Section title="Evidence">
              <ul className="space-y-2">
                {i.evidence.map((e, idx) => (
                  <li key={idx} className="flex gap-2 text-sm">
                    <span className="text-muted-foreground mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                    <span className="leading-relaxed">{e}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Recommended recovery plan">
              <div className="space-y-2">
                {i.recovery.map((r, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-border/60 bg-card/40">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-sm font-medium">{r.title}</span>
                      <span className="text-[11px] text-muted-foreground font-mono shrink-0">{r.minutes}m</span>
                    </div>
                    <div className="text-[11px] text-success">{r.impact}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                {i.subjectId && (
                  <Link to="/subjects/$id" params={{ id: i.subjectId }} className="text-xs text-primary hover:underline">
                    Open subject →
                  </Link>
                )}
                <Link to="/recommendations" className="text-xs text-primary hover:underline ml-auto">
                  See recommendations →
                </Link>
              </div>
            </Section>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2.5">{title}</div>
      {children}
    </div>
  );
}
