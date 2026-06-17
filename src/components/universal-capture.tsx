// Universal Academic Capture Layer — the primary way to interact with
// Scholaris. A globally available quick-capture surface: the student types (or
// dictates) what they just did in plain language, the Academic Activity Parser
// structures it, a confirmation shows the detected entities + which
// intelligence systems will update, and on confirm every existing engine
// updates automatically.
//
// Available everywhere via a floating action button and the ⌘/Ctrl+J shortcut.

import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  ArrowRight,
  Check,
  AlertTriangle,
  BookOpen,
  Target,
  Trophy,
  CircleSlash,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { parseAcademicActivity } from "@/lib/capture.functions";
import {
  buildCaptureContext,
  planCapture,
  applyCapture,
  type CapturePlanItem,
  type CaptureType,
} from "@/lib/capture";

const EXAMPLES = [
  "I studied Linear Algebra for 45 minutes",
  "I scored 18/20 in Quiz 2",
  "I solved 15 Eigenvector problems",
  "I completed today's quest",
  "I forgot Bayes Theorem",
  "I finished Unit 3",
];

const TYPE_META: Record<CaptureType, { label: string; icon: typeof BookOpen }> = {
  study_session: { label: "Study Session", icon: BookOpen },
  review: { label: "Review", icon: BookOpen },
  problem_solving: { label: "Problem Solving", icon: Target },
  assessment: { label: "Assessment", icon: Trophy },
  quest_complete: { label: "Quest Completed", icon: Trophy },
  unit_complete: { label: "Unit Completed", icon: Check },
  failure: { label: "Setback", icon: CircleSlash },
};

type Phase = "input" | "parsing" | "confirm";

export function UniversalCapture() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState("");
  const [plan, setPlan] = useState<CapturePlanItem[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const parse = useServerFn(parseAcademicActivity);

  // Global shortcut: ⌘/Ctrl + J.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const reset = () => {
    setPhase("input");
    setText("");
    setPlan([]);
  };

  const close = () => {
    setOpen(false);
    // Defer reset so the dialog close animation isn't janky.
    setTimeout(reset, 200);
  };

  const runParse = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPhase("parsing");
    try {
      const context = buildCaptureContext();
      const result = await parse({ data: { text: trimmed, context } });
      const planned = planCapture(result);
      if (!planned.length) {
        toast.error("No academic activity detected. Try rephrasing.");
        setPhase("input");
        return;
      }
      setPlan(planned);
      setPhase("confirm");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't read that activity.");
      setPhase("input");
    }
  };

  const confirm = () => {
    const applied = applyCapture(plan);
    if (applied.length) {
      toast.success("Workspace updated", {
        description: applied.join(" "),
      });
    } else {
      toast.message("Nothing to update from that.");
    }
    close();
  };

  return (
    <>
      {/* Floating action button — always available. */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Quick capture"
        className="fixed bottom-20 right-5 lg:bottom-6 lg:right-6 z-40 h-14 w-14 grid place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-transform"
      >
        <Zap className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Capture activity
            </DialogTitle>
            <DialogDescription>
              Just say what you did — Scholaris figures out what changes.
            </DialogDescription>
          </DialogHeader>

          {phase !== "confirm" ? (
            <div className="space-y-3">
              <Textarea
                ref={inputRef}
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") runParse();
                }}
                placeholder="e.g. I studied Probability for 30 minutes and scored 18/20 in Quiz 2"
                rows={3}
                disabled={phase === "parsing"}
                className="resize-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setText(ex)}
                    disabled={phase === "parsing"}
                    className="text-[11px] px-2 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
              <Button onClick={runParse} disabled={!text.trim() || phase === "parsing"} className="w-full">
                {phase === "parsing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Understanding…
                  </>
                ) : (
                  <>
                    Interpret <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                <kbd className="font-mono">⌘/Ctrl</kbd> + <kbd className="font-mono">Enter</kbd> to interpret
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {plan.map((item, i) => (
                  <CaptureCard key={i} item={item} />
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => setPhase("input")} className="flex-1">
                  Edit
                </Button>
                <Button onClick={confirm} className="flex-1">
                  <Check className="h-4 w-4" /> Confirm
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CaptureCard({ item }: { item: CapturePlanItem }) {
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium">{meta.label}</span>
        <Badge variant="outline" className="ml-auto text-[10px]">
          {item.confidence}% sure
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">{item.summary}</p>

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {item.subject && (
          <span className="px-2 py-0.5 rounded-md bg-accent text-accent-foreground">
            {item.subject.name}
          </span>
        )}
        {item.concepts.map((c) => (
          <span key={c.id} className="px-2 py-0.5 rounded-md bg-accent text-accent-foreground">
            {c.name}
          </span>
        ))}
        {item.durationMinutes != null && (
          <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
            {item.durationMinutes} min
          </span>
        )}
        {item.problemCount != null && (
          <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
            {item.problemCount} problems
          </span>
        )}
        {item.assessment && (
          <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
            {item.assessment.percent}%
          </span>
        )}
        {item.questKind && (
          <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground capitalize">
            {item.questKind} quest
          </span>
        )}
      </div>

      {item.warning ? (
        <div className="flex items-start gap-1.5 text-[11px] text-amber-500">
          <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
          <span>{item.warning}</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">
            Updates
          </span>
          {item.updates.map((u) => (
            <Badge key={u} variant="secondary" className="text-[10px] font-normal">
              {u}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
