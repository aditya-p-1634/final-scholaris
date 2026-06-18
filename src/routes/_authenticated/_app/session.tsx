import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Crown, LifeBuoy, Brain, Atom, Timer, Coffee,
  Play, Pause, CheckCircle2, Flag, X, ArrowRight, Clock, Target,
  ShieldAlert, TrendingUp, Flame, Fingerprint, AlertTriangle, HelpCircle,
  Hourglass, ChevronRight, RotateCcw, Trophy, GitBranch, Plus, Minus,
} from "lucide-react";
import { useIntelligence } from "@/lib/intelligence";
import { useAcademicSystem } from "@/lib/academic-system";
import {
  useSessionStore,
  blueprintFromMainQuest,
  blueprintFromMission,
  blueprintFromRecovery,
  blueprintFocus,
  abandonRecovery,
  type SessionBlueprint,
  type ReflectionRating,
} from "@/lib/session-mode";

export const Route = createFileRoute("/_authenticated/_app/session")({
  head: () => ({
    meta: [
      { title: "Session Mode — Scholaris" },
      { name: "description", content: "Enter focused execution mode and complete academic work that updates every intelligence system." },
    ],
  }),
  component: SessionMode,
});

const accentClasses: Record<SessionBlueprint["accent"], { text: string; bg: string; border: string; from: string }> = {
  primary: { text: "text-primary", bg: "bg-primary/15", border: "border-primary/30", from: "from-primary/12" },
  destructive: { text: "text-destructive", bg: "bg-destructive/15", border: "border-destructive/30", from: "from-destructive/12" },
  warning: { text: "text-warning", bg: "bg-warning/15", border: "border-warning/30", from: "from-warning/12" },
  info: { text: "text-info", bg: "bg-info/15", border: "border-info/30", from: "from-info/12" },
  success: { text: "text-success", bg: "bg-success/15", border: "border-success/30", from: "from-success/12" },
};

function SessionMode() {
  const phase = useSessionStore((s) => s.phase);

  if (phase === "init") return <InitScreen />;
  if (phase === "active" || phase === "paused") return <FocusEnvironment />;
  if (phase === "complete") return <CompleteScreen />;
  if (phase === "abandoned") return <AbandonedScreen />;
  return <Launcher />;
}

// ====================================================================
// LAUNCHER — entry points into Session Mode.
// ====================================================================

function Launcher() {
  const navigate = useNavigate();
  const launch = useSessionStore((s) => s.launch);
  const system = useAcademicSystem();
  const { concepts } = useIntelligence();

  const start = (bp: SessionBlueprint | null) => {
    if (!bp) return;
    launch(bp);
  };

  const hasWorkspace = concepts.length > 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] uppercase tracking-[0.18em] font-semibold mb-4">
          <Timer className="h-3.5 w-3.5" /> Session Mode
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Enter execution.</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
          Planning is not progress. This is where academic growth actually happens — focus, execute, complete, reflect. Every finished session updates your entire intelligence system.
        </p>
      </div>

      {!hasWorkspace ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Atom className="h-6 w-6 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Your workspace is empty. Import a syllabus or add subjects first, then launch a session.
          </p>
        </div>
      ) : (
        <>
          {/* Quests */}
          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <EntryCard
              icon={Crown}
              accent="primary"
              kicker="Main Quest"
              title={system.mainQuest.victory?.title ?? "No active quest"}
              subtitle={system.mainQuest.victory ? system.mainQuest.directive : "Log a session to surface your next quest."}
              cta="Start Main Quest"
              disabled={!system.mainQuest.victory}
              onStart={() => start(blueprintFromMainQuest())}
            />
            <EntryCard
              icon={LifeBuoy}
              accent={system.recovery.criticalCount > 0 ? "destructive" : "warning"}
              kicker="Recovery Quest"
              title={system.recovery.quests[0]?.title ?? "No recovery debt"}
              subtitle={system.recovery.headline}
              cta="Start Recovery Quest"
              disabled={system.recovery.quests.length === 0}
              onStart={() => start(blueprintFromRecovery(system.recovery.quests[0].conceptId))}
            />
          </div>

          {/* Side quests */}
          {system.mainQuest.sideQuests.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 mb-4">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Side quests</div>
              <div className="grid sm:grid-cols-3 gap-2">
                {system.mainQuest.sideQuests.map((sq) => (
                  <button
                    key={sq.missionId}
                    onClick={() => start(blueprintFromMission(sq.missionId, "Side Quest"))}
                    className="group text-left p-3 rounded-lg border border-border/60 bg-card/60 hover:border-border hover:bg-accent/30 transition-colors cursor-pointer"
                  >
                    <div className="text-sm font-medium truncate">{sq.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{sq.subjectName} · {sq.minutes}m · ROI {sq.roi}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Focus presets */}
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-3 mt-8">Focus sessions</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <PresetCard icon={Target} title="Focus Session" minutes={30} desc="Your priority concepts" onStart={() => start(blueprintFocus({ mode: "focus" }))} />
            <PresetCard icon={Timer} title="Pomodoro" minutes={25} desc="One sharp push" onStart={() => start(blueprintFocus({ mode: "pomodoro" }))} />
            <PresetCard icon={Brain} title="Deep Work" minutes={90} desc="Sustained deep focus" onStart={() => start(blueprintFocus({ mode: "deep" }))} />
            <CustomPreset onStart={(min) => start(blueprintFocus({ mode: "custom", minutes: min }))} />
          </div>
        </>
      )}
    </div>
  );
}

function EntryCard({
  icon: Icon, accent, kicker, title, subtitle, cta, disabled, onStart,
}: {
  icon: typeof Crown; accent: SessionBlueprint["accent"]; kicker: string;
  title: string; subtitle: string; cta: string; disabled?: boolean; onStart: () => void;
}) {
  const a = accentClasses[accent];
  return (
    <div className={`relative overflow-hidden rounded-xl border ${a.border} bg-gradient-to-br ${a.from} via-card to-card p-5 flex flex-col`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-9 w-9 rounded-lg ${a.bg} ${a.text} grid place-items-center`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className={`text-[11px] uppercase tracking-[0.18em] font-semibold ${a.text}`}>{kicker}</div>
      </div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 leading-relaxed flex-1">{subtitle}</p>
      <button
        onClick={onStart}
        disabled={disabled}
        className={`mt-4 inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-sm font-medium transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          accent === "destructive" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
        } hover:opacity-90`}
      >
        <Play className="h-3.5 w-3.5" /> {cta}
      </button>
    </div>
  );
}

function PresetCard({ icon: Icon, title, minutes, desc, onStart }: {
  icon: typeof Target; title: string; minutes: number; desc: string; onStart: () => void;
}) {
  return (
    <button
      onClick={onStart}
      className="group text-left rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/20 transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-[11px] font-mono text-muted-foreground">{minutes}m</span>
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
    </button>
  );
}

function CustomPreset({ onStart }: { onStart: (minutes: number) => void }) {
  const [min, setMin] = useState(45);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <Coffee className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Custom</span>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setMin((m) => Math.max(5, m - 5))} className="h-6 w-6 rounded-md bg-muted grid place-items-center cursor-pointer hover:bg-accent"><Minus className="h-3 w-3" /></button>
        <span className="text-sm font-mono flex-1 text-center">{min}m</span>
        <button onClick={() => setMin((m) => Math.min(180, m + 5))} className="h-6 w-6 rounded-md bg-muted grid place-items-center cursor-pointer hover:bg-accent"><Plus className="h-3 w-3" /></button>
      </div>
      <button onClick={() => onStart(min)} className="w-full inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 cursor-pointer">
        <Play className="h-3 w-3" /> Start
      </button>
    </div>
  );
}

// ====================================================================
// INITIALIZATION SCREEN — review before starting.
// ====================================================================

function InitScreen() {
  const bp = useSessionStore((s) => s.blueprint)!;
  const start = useSessionStore((s) => s.start);
  const cancel = useSessionStore((s) => s.cancel);
  const a = accentClasses[bp.accent];

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={cancel} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-5 cursor-pointer">
        <X className="h-3.5 w-3.5" /> Cancel
      </button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl border ${a.border} bg-gradient-to-br ${a.from} via-card to-card p-7`}
      >
        <div className="flex items-center gap-2 mb-5">
          <div className={`h-8 w-8 rounded-lg ${a.bg} ${a.text} grid place-items-center`}>
            <Crown className="h-4 w-4" />
          </div>
          <div className={`text-[11px] uppercase tracking-[0.2em] font-semibold ${a.text}`}>{bp.kind}</div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">{bp.title}</h1>
        {(bp.subjectName || bp.topic) && (
          <p className="text-sm text-muted-foreground mt-1">
            {[bp.subjectName, bp.topic].filter(Boolean).join(" · ")}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
          <InfoTile icon={Clock} label="Estimated time" value={`${bp.estimatedMinutes} min`} />
          <InfoTile icon={Atom} label="Concepts" value={`${bp.concepts.length}`} />
          <InfoTile icon={Target} label="Outcome" value={bp.expectedOutcome} small />
        </div>

        {bp.concepts.length > 0 && (
          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Concepts in this session</div>
            <div className="flex flex-wrap gap-1.5">
              {bp.concepts.map((c) => (
                <span key={c.id} className="text-xs px-2 py-1 rounded-md bg-muted/60 text-foreground/80">
                  {c.name} <span className="font-mono text-muted-foreground">· {c.mastery}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 rounded-lg bg-card/60 border border-border/60 p-4">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Why this matters</div>
          <p className="text-sm text-foreground/85 leading-relaxed">{bp.whyItMatters}</p>
          {bp.reasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {bp.reasons.map((r, i) => (
                <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full ${a.bg} ${a.text} font-medium`}>{r}</span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={start}
          className={`mt-6 w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg text-sm font-semibold transition-opacity cursor-pointer ${
            bp.accent === "destructive" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
          } hover:opacity-90`}
        >
          <Play className="h-4 w-4" /> Begin Session
        </button>
      </motion.div>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value, small }: { icon: typeof Clock; label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-lg bg-card/60 border border-border/60 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className={small ? "text-xs leading-snug" : "text-base font-semibold"}>{value}</div>
    </div>
  );
}

// ====================================================================
// FOCUS ENVIRONMENT — the immersive execution screen.
// ====================================================================

function useTick(active: boolean) {
  const [, setN] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (active) {
      ref.current = setInterval(() => setN((n) => n + 1), 1000);
      return () => { if (ref.current) clearInterval(ref.current); };
    }
  }, [active]);
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function FocusEnvironment() {
  const store = useSessionStore();
  const bp = store.blueprint!;
  const running = store.phase === "active";
  useTick(running);

  const elapsed = store.elapsedMs();
  const totalMs = bp.estimatedMinutes * 60000;
  const remaining = totalMs - elapsed;
  const overtime = remaining < 0;
  const progress = Math.min(100, (elapsed / totalMs) * 100);
  const a = accentClasses[bp.accent];

  const completed = store.completedConceptIds;
  const struggled = store.struggledConceptIds;
  const conceptProgress = bp.concepts.length
    ? Math.round((completed.length / bp.concepts.length) * 100)
    : progress;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header: quest + status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-md ${a.bg} ${a.text} grid place-items-center`}>
            <Crown className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className={`text-[10px] uppercase tracking-[0.18em] font-semibold ${a.text}`}>{bp.kind}</div>
            <div className="text-sm font-medium leading-tight">{bp.title}</div>
          </div>
        </div>
        <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${running ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
          {running ? "Executing" : "Paused"}
        </span>
      </div>

      {/* Timer */}
      <div className="rounded-2xl border border-border bg-card p-7 text-center mb-4">
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground mb-2">
          {overtime ? "Overtime" : "Remaining"}
        </div>
        <div className={`text-6xl font-semibold tabular-nums tracking-tight ${overtime ? "text-warning" : ""}`}>
          {overtime ? `+${fmt(-remaining)}` : fmt(remaining)}
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-5">
          <div className={`h-full rounded-full ${overtime ? "bg-warning" : "bg-primary"}`} style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-center gap-3 mt-5">
          {running ? (
            <button onClick={store.pause} className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-accent cursor-pointer">
              <Pause className="h-4 w-4" /> Pause
            </button>
          ) : (
            <button onClick={store.resume} className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 cursor-pointer">
              <Play className="h-4 w-4" /> Resume
            </button>
          )}
          <button onClick={() => store.complete()} className="inline-flex items-center gap-1.5 h-10 px-5 rounded-lg bg-success text-success-foreground text-sm font-medium hover:opacity-90 cursor-pointer">
            <CheckCircle2 className="h-4 w-4" /> Complete
          </button>
        </div>
      </div>

      {/* Objective + progress */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
            <Flag className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-wider font-semibold">Objective</span>
          </div>
          <p className="text-sm text-foreground/85 leading-snug">{bp.objective}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">Progress</span>
            </div>
            <span className="text-xs font-mono">{completed.length}/{bp.concepts.length || 1}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-success" style={{ width: `${conceptProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Concept checklist */}
      {bp.concepts.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 mb-4">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Current targets</div>
          <div className="space-y-2">
            {bp.concepts.map((c) => {
              const done = completed.includes(c.id);
              const strug = struggled.includes(c.id);
              return (
                <div key={c.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  done ? "border-success/40 bg-success/5" : strug ? "border-warning/40 bg-warning/5" : "border-border/60 bg-card/60"
                }`}>
                  <button onClick={() => store.toggleConcept(c.id)} className="shrink-0 cursor-pointer">
                    <CheckCircle2 className={`h-5 w-5 ${done ? "text-success" : "text-muted-foreground/40"}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">{c.subjectName} · mastery {c.mastery}</div>
                  </div>
                  <button
                    onClick={() => store.markStruggle(c.id)}
                    className={`text-[11px] px-2 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                      strug ? "bg-warning/20 text-warning" : "bg-muted/60 text-muted-foreground hover:text-warning"
                    }`}
                  >
                    Struggled
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Smart events */}
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Report what happened</div>
        <div className="flex flex-wrap gap-2">
          <EventChip icon={CheckCircle2} label="Finished topic" onClick={() => store.addEvent("topic_complete", "Finished a topic")} />
          <EventChip icon={AlertTriangle} label="Got distracted" onClick={() => store.addEvent("distracted", "Got distracted")} />
          <EventChip icon={HelpCircle} label="Need help" onClick={() => store.addEvent("need_help", "Flagged a blocker")} />
        </div>
        {store.events.length > 0 && (
          <div className="mt-3 space-y-1">
            {store.events.slice(0, 4).map((e) => (
              <div key={e.id} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3" /> {e.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Optional notes</div>
        <textarea
          value={store.notes}
          onChange={(e) => store.setNotes(e.target.value)}
          placeholder="Reviewed Bayes Theorem · Solved 12 problems · Completed Unit 3…"
          className="w-full min-h-[72px] resize-y rounded-lg bg-background border border-border px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="text-center">
        <button onClick={store.abandon} className="text-xs text-muted-foreground hover:text-destructive cursor-pointer inline-flex items-center gap-1">
          <X className="h-3 w-3" /> End session early
        </button>
      </div>
    </div>
  );
}

function EventChip({ icon: Icon, label, onClick }: { icon: typeof CheckCircle2; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/60 bg-card/60 text-xs font-medium hover:border-border hover:bg-accent/30 transition-colors cursor-pointer">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}
    </button>
  );
}

// ====================================================================
// COMPLETION SCREEN — quest complete + intelligence summary + reflection.
// ====================================================================

const reflections: { label: ReflectionRating; tone: string }[] = [
  { label: "Excellent", tone: "bg-success/15 text-success border-success/30" },
  { label: "Good", tone: "bg-info/15 text-info border-info/30" },
  { label: "Average", tone: "bg-muted text-foreground border-border" },
  { label: "Difficult", tone: "bg-warning/15 text-warning border-warning/30" },
  { label: "Very Difficult", tone: "bg-destructive/15 text-destructive border-destructive/30" },
];

function CompleteScreen() {
  const summary = useSessionStore((s) => s.summary)!;
  const bp = useSessionStore((s) => s.blueprint)!;
  const reset = useSessionStore((s) => s.reset);
  const navigate = useNavigate();
  const [rating, setRating] = useState<ReflectionRating | null>(summary.reflection ?? null);

  const finish = (to: "/" | "/session") => {
    reset();
    if (to === "/") navigate({ to: "/" });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center mb-6">
        <div className="inline-flex h-14 w-14 rounded-2xl bg-success/15 text-success items-center justify-center mb-4">
          <Trophy className="h-7 w-7" />
        </div>
        <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-success">Quest Complete</div>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">{bp.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {summary.minutes} minutes · {summary.conceptsImproved} concept{summary.conceptsImproved === 1 ? "" : "s"} improved
        </p>
      </motion.div>

      {/* Intelligence deltas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <DeltaTile icon={TrendingUp} label="Mastery" value={summary.masteryChange} suffix=" pts" />
        <DeltaTile icon={ShieldAlert} label="Risk reduced" value={summary.riskReduction} suffix=" pts" goodWhenPositive />
        <DeltaTile icon={Flame} label="Momentum" value={summary.momentumIncrease} />
        <DeltaTile icon={Target} label="Discipline" value={summary.disciplineImpact} />
        <DeltaTile icon={Fingerprint} label="Identity" value={summary.identityProgress} suffix=" pts" />
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <GitBranch className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-wider font-semibold">Identity level</span>
          </div>
          <div className="text-base font-semibold">
            Lv {summary.newLevel}{summary.leveledUp && <span className="ml-1 text-[10px] text-success">· Leveled up!</span>}
          </div>
        </div>
      </div>

      {/* Change log */}
      {summary.applied.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 mb-4">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Session summary</div>
          <ul className="space-y-1.5">
            {summary.applied.map((line, i) => (
              <li key={i} className="text-sm text-foreground/85 flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> {line}
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap gap-1.5">
            {summary.systemsUpdated.map((s) => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Reflection */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="text-sm font-medium mb-1">How did the session go?</div>
        <p className="text-[11px] text-muted-foreground mb-3">Your reflection is stored as intelligence for future sessions.</p>
        <div className="flex flex-wrap gap-2">
          {reflections.map((r) => (
            <button
              key={r.label}
              onClick={() => setRating(r.label)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium cursor-pointer transition-all ${
                rating === r.label ? r.tone : "bg-card/60 text-muted-foreground border-border/60 hover:border-border"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => finish("/")} className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 cursor-pointer">
          Return to Command Center <ArrowRight className="h-4 w-4" />
        </button>
        <button onClick={reset} className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-accent cursor-pointer">
          <RotateCcw className="h-4 w-4" /> New session
        </button>
      </div>
    </div>
  );
}

function DeltaTile({ icon: Icon, label, value, suffix = "", goodWhenPositive = true }: {
  icon: typeof TrendingUp; label: string; value: number; suffix?: string; goodWhenPositive?: boolean;
}) {
  const good = goodWhenPositive ? value >= 0 : value <= 0;
  const tone = value === 0 ? "text-muted-foreground" : good ? "text-success" : "text-destructive";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className={`text-lg font-semibold tabular-nums ${tone}`}>
        {value > 0 ? "+" : ""}{value}{suffix}
      </div>
    </div>
  );
}

// ====================================================================
// ABANDONED SCREEN — anti-procrastination recovery.
// ====================================================================

function AbandonedScreen() {
  const bp = useSessionStore((s) => s.blueprint);
  const reset = useSessionStore((s) => s.reset);
  const launch = useSessionStore((s) => s.launch);
  const navigate = useNavigate();
  const suggestion = useMemo(() => abandonRecovery(bp), [bp]);

  const startMicro = () => {
    if (suggestion.conceptId) {
      const micro = blueprintFromConceptMicro(suggestion.conceptId, suggestion.minutes);
      if (micro) {
        launch(micro);
        return;
      }
    }
    reset();
  };

  return (
    <div className="max-w-xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-warning/30 bg-gradient-to-br from-warning/10 via-card to-card p-7 text-center">
        <div className="inline-flex h-12 w-12 rounded-xl bg-warning/15 text-warning items-center justify-center mb-4">
          <Hourglass className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Session ended early</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
          That's okay — don't let it become a total miss. The smallest action keeps your momentum and discipline intact.
        </p>

        <div className="mt-6 rounded-xl border border-border bg-card p-4 text-left">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Suggested recovery</div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{suggestion.title}</div>
              <div className="text-[11px] text-muted-foreground">{suggestion.reason}</div>
            </div>
            <span className="text-xs font-mono text-muted-foreground shrink-0">{suggestion.minutes}m</span>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={startMicro} className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 cursor-pointer">
            <Play className="h-4 w-4" /> Do the smallest step
          </button>
          <button onClick={() => { reset(); navigate({ to: "/" }); }} className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-accent cursor-pointer">
            Later
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// A tiny recovery blueprint for the "smallest step" after abandonment.
function blueprintFromConceptMicro(conceptId: string, minutes: number): SessionBlueprint | null {
  const bp = blueprintFromRecovery(conceptId);
  if (!bp) return null;
  return { ...bp, kind: "Recovery Session", estimatedMinutes: Math.max(3, minutes), title: bp.title };
}
