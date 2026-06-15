import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, UploadCloud, FileText, Image as ImageIcon, X, Loader2,
  ArrowLeft, ArrowRight, Sparkles, Plus, Trash2, ChevronDown, ChevronRight,
  CheckCircle2, GitBranch, Brain, BookOpen, AlertTriangle, ScanText,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractCurriculum } from "@/lib/curriculum.functions";
import {
  normalizeExtraction, countDraft, subjectsMissingCredits, weightsSum,
  emptySubject, emptyUnit, emptyTopic, emptyConcept,
  type CurriculumDraft, type ImportSubject, type ImportUnit, type SubjectProgress, type UnitCoverage,
} from "@/lib/curriculum";
import { importCurriculum, type ImportSummary } from "@/lib/curriculum-import";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({
    meta: [
      { title: "Curriculum Import — Scholaris" },
      { name: "description", content: "Upload your syllabus and Scholaris builds your academic workspace, knowledge graph and intelligence engine in minutes." },
    ],
  }),
  component: ImportCenter,
});

type Phase = "upload" | "extracting" | "review" | "summary" | "importing" | "done";

const MAX_BYTES = 12 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function ImportCenter() {
  const navigate = useNavigate();
  const extract = useServerFn(extractCurriculum);

  const [phase, setPhase] = useState<Phase>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [draft, setDraft] = useState<CurriculumDraft | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) navigate({ to: "/auth", replace: true });
    })();
  }, [navigate]);

  const addFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => {
      const ok = f.type === "application/pdf" || f.type.startsWith("image/");
      if (!ok) toast.error(`${f.name}: unsupported type`);
      else if (f.size > MAX_BYTES) {
        toast.error(`${f.name}: too large (max 12MB)`);
        return false;
      }
      return ok;
    });
    setFiles((prev) => [...prev, ...incoming].slice(0, 8));
  }, []);

  const runExtraction = async () => {
    if (files.length === 0) return;
    setPhase("extracting");
    try {
      const payload = await Promise.all(
        files.map(async (f) => ({ name: f.name, mime: f.type, data: await fileToBase64(f) })),
      );
      const raw = await extract({ data: { files: payload } });
      const normalized = normalizeExtraction(raw);
      if (normalized.subjects.length === 0) throw new Error("No subjects detected.");
      setDraft(normalized);
      setPhase("review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Extraction failed");
      setPhase("upload");
    }
  };

  const runImport = async () => {
    if (!draft) return;
    setPhase("importing");
    try {
      const result = await importCurriculum(draft);
      setSummary(result);
      setPhase("done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
      setPhase("summary");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <Header />
        <AnimatePresence mode="wait">
          {phase === "upload" && (
            <Stage key="upload">
              <UploadStage
                files={files}
                inputRef={inputRef}
                onPick={() => inputRef.current?.click()}
                onFiles={addFiles}
                onRemove={(i) => setFiles((p) => p.filter((_, idx) => idx !== i))}
                onContinue={runExtraction}
              />
            </Stage>
          )}
          {phase === "extracting" && (
            <Stage key="extracting">
              <BusyStage
                icon={ScanText}
                title="Reading your syllabus"
                lines={["Running OCR & text extraction", "Detecting subjects, units & concepts", "Inferring prerequisite knowledge graph"]}
              />
            </Stage>
          )}
          {phase === "review" && draft && (
            <Stage key="review">
              <ReviewStage
                draft={draft}
                setDraft={setDraft}
                onBack={() => setPhase("upload")}
                onContinue={() => setPhase("summary")}
              />
            </Stage>
          )}
          {phase === "summary" && draft && (
            <Stage key="summary">
              <SummaryStage draft={draft} onBack={() => setPhase("review")} onImport={runImport} />
            </Stage>
          )}
          {phase === "importing" && (
            <Stage key="importing">
              <BusyStage
                icon={Sparkles}
                title="Generating your workspace"
                lines={["Creating subjects, topics & concepts", "Wiring the knowledge graph", "Initializing mastery, memory & risk", "Activating the intelligence engine"]}
              />
            </Stage>
          )}
          {phase === "done" && summary && (
            <Stage key="done">
              <DoneStage summary={summary} onEnter={() => navigate({ to: "/", replace: true })} />
            </Stage>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2.5 mb-8">
      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center">
        <GraduationCap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight">Scholaris</div>
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
          Curriculum import
        </div>
      </div>
    </div>
  );
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}

// ---------------- Upload ----------------

function UploadStage({
  files, inputRef, onPick, onFiles, onRemove, onContinue,
}: {
  files: File[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: () => void;
  onFiles: (l: FileList | null) => void;
  onRemove: (i: number) => void;
  onContinue: () => void;
}) {
  const [drag, setDrag] = useState(false);
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Upload your syllabus</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        PDFs, photos or scans of syllabus sheets, course handbooks or curriculum documents. Scholaris reads them and builds your workspace.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
        onClick={onPick}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          drag ? "border-primary bg-primary/10" : "border-border bg-card/40 hover:border-primary/50"
        }`}
      >
        <div className="h-12 w-12 mx-auto rounded-xl bg-primary/10 border border-primary/20 grid place-items-center mb-3">
          <UploadCloud className="h-6 w-6 text-primary" />
        </div>
        <div className="text-sm font-medium">Drop files here or click to browse</div>
        <div className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG · up to 8 files · max 12MB each</div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-md border border-border bg-card/40 px-3 py-2.5">
              {f.type === "application/pdf"
                ? <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{f.name}</div>
                <div className="text-[11px] text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onRemove(i); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <Link to="/onboarding" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Set up manually instead
        </Link>
        <button
          onClick={onContinue}
          disabled={files.length === 0}
          className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          Extract structure <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------- Busy ----------------

function BusyStage({ icon: Icon, title, lines }: { icon: typeof ScanText; title: string; lines: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-10 text-center min-h-[340px] grid place-items-center">
      <div>
        <div className="relative h-14 w-14 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <div className="absolute inset-0 grid place-items-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
          {lines.map((l, i) => (
            <motion.div
              key={l}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4 }}
            >
              {l}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Review ----------------

const PROGRESS_OPTS: { value: SubjectProgress; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];
const COVERAGE_OPTS: { value: UnitCoverage; label: string }[] = [
  { value: "not_covered", label: "Not covered" },
  { value: "partial", label: "Partial" },
  { value: "covered", label: "Covered" },
];

function ReviewStage({
  draft, setDraft, onBack, onContinue,
}: {
  draft: CurriculumDraft;
  setDraft: React.Dispatch<React.SetStateAction<CurriculumDraft | null>>;
  onBack: () => void;
  onContinue: () => void;
}) {
  const missing = useMemo(() => subjectsMissingCredits(draft), [draft]);
  const counts = useMemo(() => countDraft(draft), [draft]);

  const update = (fn: (d: CurriculumDraft) => CurriculumDraft) =>
    setDraft((prev) => (prev ? fn(prev) : prev));

  const patchSubject = (id: string, patch: Partial<ImportSubject>) =>
    update((d) => ({ ...d, subjects: d.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const removeSubject = (id: string) =>
    update((d) => ({ ...d, subjects: d.subjects.filter((s) => s.id !== id) }));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Review structure</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-2">
        Nothing is imported yet. Edit subjects, units, topics and concepts. Assign credits and assessment weights, and declare what you've already covered.
      </p>
      <div className="text-xs text-muted-foreground mb-5">
        {counts.subjects} subjects · {counts.units} units · {counts.topics} topics · {counts.concepts} concepts
      </div>

      {missing.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 mb-4 text-xs text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Credits are required for: {missing.map((s) => s.name).join(", ")}.</span>
        </div>
      )}

      <div className="space-y-3">
        {draft.subjects.map((s) => (
          <SubjectCard
            key={s.id}
            subject={s}
            onPatch={(patch) => patchSubject(s.id, patch)}
            onRemove={() => removeSubject(s.id)}
            onPatchTree={update}
          />
        ))}
      </div>

      <button
        onClick={() => update((d) => ({ ...d, subjects: [...d.subjects, emptySubject()] }))}
        className="mt-3 w-full h-10 rounded-md border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" /> Add subject
      </button>

      <div className="flex items-center justify-between mt-6">
        <button onClick={onBack} className="h-10 px-4 rounded-md border border-border bg-background/40 text-sm font-medium flex items-center gap-2 hover:bg-accent transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <button
          onClick={onContinue}
          disabled={missing.length > 0 || draft.subjects.length === 0}
          className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          Review summary <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function SubjectCard({
  subject, onPatch, onRemove, onPatchTree,
}: {
  subject: ImportSubject;
  onPatch: (patch: Partial<ImportSubject>) => void;
  onRemove: () => void;
  onPatchTree: (fn: (d: CurriculumDraft) => CurriculumDraft) => void;
}) {
  const [open, setOpen] = useState(false);
  const w = subject.assessmentWeights;
  const sumPct = Math.round(weightsSum(w) * 100);
  const conceptCount = subject.units.reduce(
    (n, u) => n + u.topics.reduce((m, t) => m + Math.max(1, t.concepts.length), u.topics.length === 0 ? 1 : 0),
    0,
  );

  const mutateSubject = (fn: (s: ImportSubject) => ImportSubject) =>
    onPatchTree((d) => ({ ...d, subjects: d.subjects.map((x) => (x.id === subject.id ? fn(x) : x)) }));

  const setWeight = (key: keyof typeof w, pct: number) =>
    onPatch({ assessmentWeights: { ...w, [key]: Math.max(0, Math.min(100, pct)) / 100 } });

  return (
    <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-2">
          <input
            value={subject.name}
            onChange={(e) => onPatch({ name: e.target.value })}
            className="flex-1 bg-transparent text-sm font-semibold focus:outline-none border-b border-transparent focus:border-primary/40 pb-0.5"
          />
          <input
            value={subject.code}
            onChange={(e) => onPatch({ code: e.target.value })}
            placeholder="Code"
            className="w-24 bg-transparent text-xs text-muted-foreground text-right focus:outline-none focus:text-foreground"
          />
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Credits *</span>
            <input
              type="number"
              min={0}
              value={subject.credits || ""}
              onChange={(e) => onPatch({ credits: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
              className={`mt-1 w-full h-9 rounded-md border bg-background/50 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                subject.credits > 0 ? "border-border" : "border-warning/60"
              }`}
            />
          </label>
          <div className="block">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Progress</span>
            <div className="mt-1 flex gap-1">
              {PROGRESS_OPTS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => onPatch({ progress: o.value })}
                  className={`flex-1 h-9 rounded-md border text-[11px] font-medium transition-colors ${
                    subject.progress === o.value
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Assessment weights</span>
            <span className={`text-[11px] font-mono ${sumPct === 100 ? "text-success" : "text-warning"}`}>{sumPct}%</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {(["midterm", "final", "assignment", "lab", "project"] as const).map((k) => (
              <label key={k} className="block">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round(w[k] * 100)}
                  onChange={(e) => setWeight(k, Number(e.target.value))}
                  className="w-full h-9 rounded-md border border-border bg-background/50 px-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="block text-[9px] uppercase tracking-wide text-muted-foreground text-center mt-1">{k.slice(0, 4)}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {subject.units.length} units · {conceptCount} concepts
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background/30 p-4 space-y-3">
          {subject.units.map((u) => (
            <UnitBlock key={u.id} subject={subject} unitId={u.id} mutateSubject={mutateSubject} />
          ))}
          <button
            onClick={() => mutateSubject((s) => ({ ...s, units: [...s.units, emptyUnit()] }))}
            className="w-full h-8 rounded-md border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add unit
          </button>
        </div>
      )}
    </div>
  );
}

function UnitBlock({
  subject, unitId, mutateSubject,
}: {
  subject: ImportSubject;
  unitId: string;
  mutateSubject: (fn: (s: ImportSubject) => ImportSubject) => void;
}) {
  const unit = subject.units.find((u) => u.id === unitId);
  if (!unit) return null;

  const mutateUnit = (fn: (u: typeof unit) => typeof unit) =>
    mutateSubject((s) => ({ ...s, units: s.units.map((x) => (x.id === unitId ? fn(x) : x)) }));

  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <div className="flex items-center gap-2">
        <input
          value={unit.name}
          onChange={(e) => mutateUnit((u) => ({ ...u, name: e.target.value }))}
          className="flex-1 bg-transparent text-sm font-medium focus:outline-none border-b border-transparent focus:border-primary/40 pb-0.5"
        />
        <div className="flex gap-1">
          {COVERAGE_OPTS.map((o) => (
            <button
              key={o.value}
              onClick={() => mutateUnit((u) => ({ ...u, coverage: o.value }))}
              className={`h-7 px-2 rounded text-[10px] font-medium transition-colors ${
                unit.coverage === o.value
                  ? "bg-primary/15 text-foreground border border-primary"
                  : "bg-background/40 text-muted-foreground border border-border hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => mutateSubject((s) => ({ ...s, units: s.units.filter((x) => x.id !== unitId) }))}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 space-y-2 pl-2 border-l border-border">
        {unit.topics.map((t) => (
          <div key={t.id} className="rounded-md bg-background/40 p-2.5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                value={t.name}
                onChange={(e) => mutateUnit((u) => ({ ...u, topics: u.topics.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)) }))}
                className="flex-1 bg-transparent text-xs font-medium focus:outline-none"
              />
              <button
                onClick={() => mutateUnit((u) => ({ ...u, topics: u.topics.filter((x) => x.id !== t.id) }))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 pl-5">
              {t.concepts.map((c) => (
                <span key={c.id} className="group inline-flex items-center gap-1 rounded-full border border-border bg-card/60 pl-2 pr-1 py-0.5">
                  <input
                    value={c.name}
                    onChange={(e) => mutateUnit((u) => ({
                      ...u,
                      topics: u.topics.map((x) => (x.id === t.id ? { ...x, concepts: x.concepts.map((y) => (y.id === c.id ? { ...y, name: e.target.value } : y)) } : x)),
                    }))}
                    className="bg-transparent text-[11px] focus:outline-none"
                    style={{ width: `${Math.max(4, c.name.length)}ch` }}
                  />
                  <button
                    onClick={() => mutateUnit((u) => ({ ...u, topics: u.topics.map((x) => (x.id === t.id ? { ...x, concepts: x.concepts.filter((y) => y.id !== c.id) } : x)) }))}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={() => mutateUnit((u) => ({ ...u, topics: u.topics.map((x) => (x.id === t.id ? { ...x, concepts: [...x.concepts, emptyConcept()] } : x)) }))}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3 w-3" /> concept
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => mutateUnit((u) => ({ ...u, topics: [...u.topics, emptyTopic()] }))}
          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Add topic
        </button>
      </div>
    </div>
  );
}

// ---------------- Summary ----------------

function SummaryStage({ draft, onBack, onImport }: { draft: CurriculumDraft; onBack: () => void; onImport: () => void }) {
  const c = countDraft(draft);
  const weightsConfigured = draft.subjects.filter((s) => Math.abs(weightsSum(s.assessmentWeights) - 1) < 0.001).length;
  const progressDeclared = draft.subjects.filter((s) => s.progress !== "not_started" || s.units.some((u) => u.coverage !== "not_covered")).length;

  const rows = [
    { icon: BookOpen, label: "Subjects", value: c.subjects },
    { icon: GitBranch, label: "Units", value: c.units },
    { icon: FileText, label: "Topics", value: c.topics },
    { icon: Brain, label: "Concepts", value: c.concepts },
    { icon: Sparkles, label: "Credits assigned", value: c.creditsTotal },
    { icon: CheckCircle2, label: "Assessment weights set", value: `${weightsConfigured}/${c.subjects}` },
    { icon: GitBranch, label: "Knowledge graph links", value: c.prerequisites },
    { icon: Brain, label: "Subjects with progress declared", value: progressDeclared },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Import summary</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Confirm what Scholaris will generate. This activates the full intelligence engine immediately.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl border border-border bg-card/40 p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center shrink-0">
              <r.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-semibold tabular-nums">{r.value}</div>
              <div className="text-[11px] text-muted-foreground">{r.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-6">
        <button onClick={onBack} className="h-10 px-4 rounded-md border border-border bg-background/40 text-sm font-medium flex items-center gap-2 hover:bg-accent transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to review
        </button>
        <button onClick={onImport} className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Sparkles className="h-4 w-4" /> Import & activate
        </button>
      </div>
    </div>
  );
}

// ---------------- Done ----------------

function DoneStage({ summary, onEnter }: { summary: ImportSummary; onEnter: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-10 text-center">
      <div className="h-14 w-14 mx-auto rounded-full bg-success/15 border border-success/30 grid place-items-center mb-5">
        <CheckCircle2 className="h-7 w-7 text-success" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">Scholaris is ready</h2>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
        Generated {summary.subjects} subjects, {summary.concepts} concepts and {summary.prerequisites} knowledge-graph links.
        Mastery, memory, risk and missions are initialized from your declared progress.
      </p>
      <button onClick={onEnter} className="mt-6 h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
        Enter command center <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
