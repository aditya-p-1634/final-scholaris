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
import { useIntelligence, useIntelligenceActions, type IncidentCategory } from "@/lib/intelligence";

export const Route = createFileRoute("/diagnostics")({
  head: () => ({
    meta: [
      { title: "Diagnostics Center — Scholaris" },
      { name: "description", content: "Academic black box recorder. Root causes are derived live from concept and session data." },
    ],
  }),
  component: DiagnosticsPage,
});

const categoryMeta: Record<IncidentCategory, { label: string; description: string; icon: typeof Brain }> = {
  "memory-gap":      { label: "Memory Gap",      description: "Retention collapsed faster than the model predicted.",       icon: Brain },
  "concept-gap":     { label: "Concept Gap",     description: "A foundational concept was never solidly encoded.",          icon: Layers },
  "practice-gap":    { label: "Practice Gap",    description: "Insufficient active recall or applied problem-solving.",     icon: Activity },
  "assessment-gap":  { label: "Assessment Gap",  description: "Model uncertainty grew without recent calibration.",         icon: ClipboardCheck },
  "revision-gap":    { label: "Revision Gap",    description: "Spaced-repetition windows were missed.",                     icon: History },
  "consistency-gap": { label: "Consistency Gap", description: "Irregular cadence broke retention compounding.",             icon: GitCommit },
};

const severityOrder = { critical: 0, high: 1, medium: 2 } as const;

function DiagnosticsPage() {
  const { incidents } = useIntelligence();
  const { runSession } = useIntelligenceActions();
  const [filter, setFilter] = useState<IncidentCategory | "all">("all");
  const sorted = [...incidents].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const filtered = filter === "all" ? sorted : sorted.filter((i) => i.category === filter);
  const [openId, setOpenId] = useState<string | null>(sorted[0]?.id ?? null);

  const criticalCount = incidents.filter((i) => i.severity === "critical").length;
  const avgConfidence = incidents.length
    ? Math.round(incidents.reduce((a, b) => a + b.confidence, 0) / incidents.length)
    : 0;
  const totalRecoverySteps = incidents.reduce((a, b) => a + b.recovery.length, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Diagnostics Center"
        title="Academic Black Box Recorder"
        description="Every regression is recorded with evidence, root cause, and a recovery plan — derived live from concept and session intelligence."
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
        <StatCard label="Recovery steps ready" value={totalRecoverySteps} icon={CheckCircle2} tone="success" />
      </div>

      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-4 mb-6">
        <Panel title="Diagnostic categories" description="Filter by failure mode">
          <div className="space-y-1">
            <CategoryButton active={filter === "all"} onClick={() => setFilter("all")} label="All incidents" count={incidents.length} />
            {(Object.keys(categoryMeta) as IncidentCategory[]).map((cat) => {
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

        <Panel title="Incident timeline" description="Most severe first">
          {sorted.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No incidents — the system is stable.</div>
          ) : (
            <div className="relative pl-4">
              <div className="absolute left-1.5 top-1 bottom-1 w-px bg-border" />
              <div className="space-y-3">
                {sorted.map((i) => (
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
          )}
        </Panel>
      </div>

      <div className="space-y-3">
        {filtered.map((i, idx) => {
          const meta = categoryMeta[i.category];
          const Icon = meta.icon;
          const TypeIcon = ({
            "mastery-drop": TrendingDown,
            "memory-collapse": Brain,
            "assessment-failure": ClipboardCheck,
            "risk-increase": ShieldAlert,
          } as const)[i.type];
          const sevTone = i.severity === "critical" ? "danger" : i.severity === "high" ? "warning" : "info";
          const open = openId === i.id;

          return (
            <motion.div
              key={i.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.02 }}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <button onClick={() => setOpenId(open ? null : i.id)} className="w-full text-left p-5 cursor-pointer hover:bg-card/60 transition-colors">
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
                      <span className="text-muted-foreground">· {i.subject}</span>
                      <span className="text-muted-foreground">· {i.occurredAt}</span>
                    </div>
                    <h3 className="text-base font-semibold tracking-tight">{i.problem}</h3>
                    <div className="flex items-center flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <StatusDot tone={sevTone} />
                        <span className="capitalize">{i.severity} severity</span>
                      </span>
                      <span>Confidence <span className="font-mono text-foreground">{i.confidence}%</span></span>
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
                        {i.evidence.map((e, idx2) => (
                          <li key={idx2} className="flex gap-2 text-sm">
                            <span className="text-muted-foreground mt-1.5 h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                            <span className="leading-relaxed">{e}</span>
                          </li>
                        ))}
                      </ul>
                    </Section>

                    <Section title="Recommended recovery plan">
                      <div className="space-y-2">
                        {i.recovery.map((r, idx2) => (
                          <div key={idx2} className="p-2.5 rounded-lg border border-border/60 bg-card/40">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="text-sm font-medium">{r.title}</span>
                              <span className="text-[11px] text-muted-foreground font-mono shrink-0">{r.minutes}m</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-[11px] text-success">{r.impact}</div>
                              {r.conceptId && (
                                <button
                                  onClick={() => runSession({ conceptId: r.conceptId!, type: "Recovery", minutes: r.minutes })}
                                  className="text-[11px] text-primary hover:underline cursor-pointer"
                                >
                                  Execute
                                </button>
                              )}
                            </div>
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
        })}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2.5">{title}</div>
      {children}
    </div>
  );
}
