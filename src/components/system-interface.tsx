// Scholaris System Interface.
// ====================================================
// The behavioral command surface. It converts the intelligence layer into
// daily action by prioritizing, in order:
//
//   Main Quest · Discipline · Momentum · Recovery · Identity Growth · Alerts
//
// Pure presentation over the derived Academic System Layer
// (src/lib/academic-system.ts). No new intelligence — only execution.

import { Link, useNavigate } from "@tanstack/react-router";
import {
  Crown, Flame, Gauge, LifeBuoy, Fingerprint, AlertTriangle,
  Zap, ArrowRight, Clock, ShieldAlert, GitBranch, Sparkles,
  TrendingUp, TrendingDown, Activity, ChevronRight, Hand,
} from "lucide-react";
import { Panel, MetricBar, StatusDot } from "@/components/widgets";
import { useAcademicSystem } from "@/lib/academic-system";
import { useIntelligenceActions } from "@/lib/intelligence";
import type {
  DisciplineReport, RecoveryReport, ProcrastinationReport,
  AccountabilityReport, IdentityReport, MomentumV2Report, MainQuestReport,
} from "@/lib/academic-system";

export function SystemInterface() {
  const system = useAcademicSystem();
  const { runMission, runSession } = useIntelligenceActions();
  const navigate = useNavigate();

  const doMission = (id: string) => {
    runMission(id);
    navigate({ to: "/missions" });
  };
  const doRecovery = (conceptId: string) => {
    runSession({ conceptId, type: "Recovery", minutes: 30 });
  };

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-1">
        <Gauge className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">System Interface</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Your execution layer — what to do next, and whether you're following through.
      </p>

      {/* Tier 1 — Main Quest (the single most important next action) */}
      <MainQuestCard quest={system.mainQuest} runMission={doMission} />

      {/* Tier 2 — Discipline · Momentum · Identity */}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <DisciplineCard discipline={system.discipline} />
        <MomentumCard momentum={system.momentum} />
        <IdentityCard identity={system.identity} />
      </div>

      {/* Tier 3 — Recovery · Anti-procrastination + accountability */}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <RecoveryCard recovery={system.recovery} runRecovery={doRecovery} className="lg:col-span-2" />
        <div className="space-y-4">
          <AccountabilityCard accountability={system.accountability} />
          <AntiProcrastinationCard
            procrastination={system.procrastination}
            runMission={doMission}
            runRecovery={doRecovery}
          />
        </div>
      </div>
    </section>
  );
}

// ---------------- Main Quest ----------------

function MainQuestCard({ quest, runMission }: { quest: MainQuestReport; runMission: (id: string) => void }) {
  const v = quest.victory;
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/12 via-card to-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-9 w-9 rounded-lg bg-primary/20 text-primary grid place-items-center">
          <Crown className="h-4.5 w-4.5" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-primary">Main Quest</div>
          <div className="text-xs text-muted-foreground">The single most important thing to do next</div>
        </div>
      </div>

      {v ? (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${
                v.priority === "critical" ? "bg-destructive/15 text-destructive" :
                v.priority === "high" ? "bg-warning/15 text-warning" : "bg-primary/15 text-primary"
              }`}>{v.priority}</span>
              <span className="text-xs text-muted-foreground">{v.subjectName}</span>
              <span className="text-xs text-success font-mono">ROI {v.roiScore}</span>
            </div>
            <h3 className="text-xl font-semibold tracking-tight">{v.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{v.whyItMatters}</p>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" />{v.estimatedMinutes}m</span>
              <span className="flex items-center gap-1 text-success"><ShieldAlert className="h-3 w-3" />-{v.riskReduction} risk</span>
              <span className="flex items-center gap-1 text-muted-foreground"><GitBranch className="h-3 w-3" />{v.expectedBenefit}</span>
            </div>

            <div className="mt-3 rounded-md bg-destructive/5 border border-destructive/15 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">At stake: </span>{quest.stakes}
            </div>

            <button
              onClick={() => runMission(v.missionId)}
              className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5" /> Begin Main Quest
            </button>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Side quests</div>
            <div className="space-y-2">
              {quest.sideQuests.map((sq) => (
                <button
                  key={sq.missionId}
                  onClick={() => runMission(sq.missionId)}
                  className="group w-full text-left flex items-center gap-2 p-2.5 rounded-lg border border-border/60 bg-card/60 hover:border-border hover:bg-accent/30 transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{sq.title}</div>
                    <div className="text-[11px] text-muted-foreground">{sq.subjectName} · {sq.minutes}m</div>
                  </div>
                  <span className="text-[11px] font-mono text-success shrink-0">{sq.roi}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                </button>
              ))}
              {quest.sideQuests.length === 0 && (
                <div className="text-xs text-muted-foreground py-4 text-center">No side quests queued.</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground py-8 text-center">
          Your queue is clear. Log a session to keep momentum alive — the engine will surface your next quest.
        </div>
      )}
    </div>
  );
}

// ---------------- Discipline ----------------

function DisciplineCard({ discipline: d }: { discipline: DisciplineReport }) {
  const tone = d.score >= 68 ? "text-success" : d.score >= 50 ? "text-info" : d.score >= 30 ? "text-warning" : "text-destructive";
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className={`h-4 w-4 ${tone}`} />
          <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Discipline</span>
        </div>
        <span className={`text-[11px] font-semibold ${tone}`}>{d.tier}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-4xl font-semibold tabular-nums ${tone}`}>{d.score}</span>
        <span className="text-sm text-muted-foreground">/100</span>
        {d.streak > 0 && (
          <span className="ml-auto text-xs text-warning font-medium flex items-center gap-1">
            <Flame className="h-3 w-3" />{d.streak}d streak
          </span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {d.components.map((c) => (
          <div key={c.label}>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-muted-foreground">{c.label}</span>
              <span className="font-mono">{c.value}</span>
            </div>
            <MetricBar value={c.value} tone={c.value >= 60 ? "success" : c.value >= 35 ? "default" : "warning"} />
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-3 leading-snug">{d.headline}</p>
    </div>
  );
}

// ---------------- Momentum V2 ----------------

const momentumState: Record<MomentumV2Report["state"], { tone: string; icon: typeof TrendingUp; label: string }> = {
  accelerating: { tone: "text-success", icon: TrendingUp, label: "Accelerating" },
  steady: { tone: "text-info", icon: Activity, label: "Steady" },
  stalling: { tone: "text-warning", icon: TrendingDown, label: "Stalling" },
  reversing: { tone: "text-destructive", icon: TrendingDown, label: "Reversing" },
};

function MomentumCard({ momentum: m }: { momentum: MomentumV2Report }) {
  const st = momentumState[m.state];
  const Icon = st.icon;
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${st.tone}`} />
          <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Momentum</span>
        </div>
        <span className={`text-[11px] font-semibold ${st.tone}`}>{st.label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-4xl font-semibold tabular-nums ${st.tone}`}>{m.unifiedScore}</span>
        <span className="text-sm text-muted-foreground">/100 unified</span>
      </div>
      <div className="mt-3 space-y-2">
        {m.dimensions.map((dim) => (
          <div key={dim.label}>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-muted-foreground">{dim.label}</span>
              <span className="font-mono">{dim.value}</span>
            </div>
            <MetricBar value={dim.value} tone={dim.value >= 60 ? "success" : dim.value >= 35 ? "default" : "warning"} />
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-3 leading-snug">{m.headline}</p>
    </div>
  );
}

// ---------------- Identity ----------------

function IdentityCard({ identity: id }: { identity: IdentityReport }) {
  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-info/8 via-card to-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-info" />
          <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Identity</span>
        </div>
        <span className="text-[11px] font-semibold text-info">Lv {id.level} · {id.title}</span>
      </div>
      <div className="text-2xl font-semibold tracking-tight">{id.archetype}</div>
      <div className="mt-3">
        <div className="flex justify-between text-[11px] mb-1">
          <span className="text-muted-foreground">Evolution to Level {id.level + 1}</span>
          <span className="font-mono">{id.levelProgress}%</span>
        </div>
        <MetricBar value={id.levelProgress} tone="info" />
        <div className="text-[10px] text-muted-foreground mt-1">{id.pointsToNext} pts to next level</div>
      </div>
      {id.weeklyGrowth.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {id.weeklyGrowth.map((g) => (
            <span key={g.trait} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              g.delta > 0 ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
            }`}>
              {g.trait} {g.delta > 0 ? "+" : ""}{g.delta}
            </span>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-3 leading-snug">{id.headline}</p>
    </div>
  );
}

// ---------------- Recovery Quests ----------------

function RecoveryCard({ recovery, runRecovery, className }: { recovery: RecoveryReport; runRecovery: (conceptId: string) => void; className?: string }) {
  return (
    <Panel
      title="Recovery Quests"
      description={recovery.headline}
      className={className}
      action={<Link to="/missions" className="text-xs text-primary hover:underline">All</Link>}
    >
      {recovery.quests.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center flex flex-col items-center gap-2">
          <LifeBuoy className="h-5 w-5 text-success/60" />
          No recovery debt — nothing has been missed.
        </div>
      ) : (
        <div className="space-y-2">
          {recovery.quests.slice(0, 5).map((q) => (
            <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card/60">
              <div className={`h-8 w-8 shrink-0 rounded-md grid place-items-center ${
                q.severity === "critical" ? "bg-destructive/15 text-destructive" :
                q.severity === "high" ? "bg-warning/15 text-warning" : "bg-primary/15 text-primary"
              }`}>
                <LifeBuoy className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{q.severity}</span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground truncate">{q.subjectName}</span>
                </div>
                <div className="text-sm font-medium mt-0.5 truncate">{q.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{q.reason}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-[11px] font-mono text-success">-{q.riskReduction}</span>
                <button
                  onClick={() => runRecovery(q.conceptId)}
                  className="text-[11px] inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-primary/15 text-primary font-medium hover:bg-primary/25 transition-colors cursor-pointer"
                >
                  Recover <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ---------------- Accountability ----------------

function AccountabilityCard({ accountability: a }: { accountability: AccountabilityReport }) {
  return (
    <Panel title="Accountability" description={`${a.rating} · ${a.reliabilityScore}/100 reliability`}>
      <div className="flex items-center justify-between gap-1.5 mb-3">
        {a.weeklyContract.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div className={`h-9 w-full rounded-md grid place-items-center text-[10px] font-semibold ${
              d.met ? "bg-success/20 text-success" :
              d.today ? "bg-primary/15 text-primary border border-dashed border-primary/40" :
              "bg-muted/40 text-muted-foreground/50"
            }`}>
              {d.met ? "✓" : d.today ? "•" : "—"}
            </div>
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">{a.headline}</p>
    </Panel>
  );
}

// ---------------- Anti-Procrastination ----------------

const avoidanceTone: Record<ProcrastinationReport["level"], { tone: string; label: string }> = {
  clear: { tone: "text-success", label: "Clear" },
  watch: { tone: "text-info", label: "Watch" },
  elevated: { tone: "text-warning", label: "Elevated" },
  high: { tone: "text-destructive", label: "High" },
};

function AntiProcrastinationCard({
  procrastination: p, runMission, runRecovery,
}: {
  procrastination: ProcrastinationReport;
  runMission: (id: string) => void;
  runRecovery: (conceptId: string) => void;
}) {
  const t = avoidanceTone[p.level];
  const start = () => {
    if (!p.firstStep) return;
    if (p.firstStep.missionId) runMission(p.firstStep.missionId);
    else if (p.firstStep.conceptId) runRecovery(p.firstStep.conceptId);
  };
  return (
    <Panel title="Anti-Procrastination" description={`Avoidance risk ${p.avoidanceRisk}/100`}>
      <div className="flex items-center gap-2 mb-2">
        <Hand className={`h-4 w-4 ${t.tone}`} />
        <span className={`text-sm font-semibold ${t.tone}`}>{t.label}</span>
        <StatusDot tone={p.level === "clear" ? "success" : p.level === "watch" ? "info" : p.level === "elevated" ? "warning" : "danger"} />
      </div>
      {p.signals.length > 0 && (
        <ul className="space-y-1 mb-3">
          {p.signals.map((sig, i) => (
            <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
              <AlertTriangle className="h-3 w-3 text-warning shrink-0 mt-px" />{sig}
            </li>
          ))}
        </ul>
      )}
      {p.firstStep ? (
        <div className="rounded-md bg-primary/5 border border-primary/15 p-2.5">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-primary mb-1">
            <Sparkles className="h-3 w-3" /> Smallest first step
          </div>
          <div className="text-xs font-medium truncate">{p.firstStep.title}</div>
          <button
            onClick={start}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Zap className="h-3 w-3" /> Start ({p.firstStep.minutes}m)
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">{p.headline}</p>
      )}
    </Panel>
  );
}
