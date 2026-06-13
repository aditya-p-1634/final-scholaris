import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, GraduationCap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { seedWorkspace, loadProfile } from "@/lib/persistence";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const BOARDS = ["CBSE", "ICSE", "IB", "A-Levels", "University", "Other"];

// Curated starter catalogue. Each subject seeds a handful of representative
// concepts so the intelligence engine has signal from day one.
const SUBJECT_CATALOGUE: Record<string, { name: string; code: string; concepts: string[] }[]> = {
  University: [
    { name: "Linear Algebra", code: "MATH 220", concepts: ["Vector Spaces", "Eigenvalues & Eigenvectors", "Gram-Schmidt Process", "Singular Value Decomposition"] },
    { name: "Organic Chemistry", code: "CHEM 301", concepts: ["SN2 Reaction Mechanism", "Stereochemistry", "Diels-Alder Reaction", "Aromatic Substitution"] },
    { name: "Cellular Biology", code: "BIO 240", concepts: ["Krebs Cycle", "Sodium-Potassium Pump", "Cell Signaling", "Mitochondrial DNA"] },
    { name: "Macroeconomics", code: "ECON 102", concepts: ["Phillips Curve", "Aggregate Demand", "Fiscal Policy", "IS-LM Model"] },
    { name: "Quantum Mechanics", code: "PHYS 410", concepts: ["Schrödinger Equation", "Hilbert Spaces", "Spin Operators", "Perturbation Theory"] },
    { name: "Modern Philosophy", code: "PHIL 215", concepts: ["Kantian Categorical Imperative", "Cartesian Doubt", "Utilitarianism", "Existentialism"] },
    { name: "Data Structures", code: "CS 201", concepts: ["Hash Tables", "Red-Black Trees", "Dynamic Programming", "Graph Traversal"] },
    { name: "Statistics", code: "STAT 301", concepts: ["Central Limit Theorem", "Bayesian Inference", "Hypothesis Testing", "Regression"] },
  ],
  CBSE: [
    { name: "Physics", code: "XII", concepts: ["Electrostatics", "Magnetism", "Optics", "Modern Physics"] },
    { name: "Chemistry", code: "XII", concepts: ["Solid State", "Electrochemistry", "Coordination Compounds", "Biomolecules"] },
    { name: "Mathematics", code: "XII", concepts: ["Calculus", "Vectors & 3D", "Probability", "Linear Programming"] },
    { name: "Biology", code: "XII", concepts: ["Genetics", "Evolution", "Ecology", "Biotechnology"] },
    { name: "English", code: "XII", concepts: ["Flamingo Prose", "Poetry Analysis", "Writing Skills", "Vistas Supplementary"] },
  ],
  ICSE: [
    { name: "Physics", code: "X", concepts: ["Force", "Sound", "Electricity", "Heat"] },
    { name: "Chemistry", code: "X", concepts: ["Periodic Table", "Mole Concept", "Acids & Bases", "Organic Chemistry"] },
    { name: "Mathematics", code: "X", concepts: ["GST", "Quadratic Equations", "Coordinate Geometry", "Trigonometry"] },
    { name: "Biology", code: "X", concepts: ["Photosynthesis", "Human Anatomy", "Reproduction", "Pollution"] },
  ],
  IB: [
    { name: "Mathematics AA HL", code: "IB", concepts: ["Complex Numbers", "Vectors", "Calculus Options", "Statistics"] },
    { name: "Physics HL", code: "IB", concepts: ["Mechanics", "Waves", "Fields", "Quantum Physics"] },
    { name: "Chemistry HL", code: "IB", concepts: ["Stoichiometry", "Atomic Structure", "Equilibrium", "Organic Chemistry"] },
    { name: "Biology HL", code: "IB", concepts: ["Cell Biology", "Genetics", "Ecology", "Human Physiology"] },
    { name: "Economics HL", code: "IB", concepts: ["Microeconomics", "Macroeconomics", "International Trade", "Development"] },
  ],
  "A-Levels": [
    { name: "Mathematics", code: "A2", concepts: ["Pure Mathematics", "Mechanics", "Statistics", "Further Pure"] },
    { name: "Physics", code: "A2", concepts: ["Mechanics", "Electricity", "Fields", "Nuclear Physics"] },
    { name: "Chemistry", code: "A2", concepts: ["Physical Chemistry", "Inorganic", "Organic", "Analysis"] },
    { name: "Biology", code: "A2", concepts: ["Biological Molecules", "Cells", "Genetics", "Ecosystems"] },
  ],
  Other: [
    { name: "Subject 1", code: "", concepts: ["Topic A", "Topic B", "Topic C"] },
    { name: "Subject 2", code: "", concepts: ["Topic A", "Topic B", "Topic C"] },
  ],
};

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [board, setBoard] = useState("");
  const [program, setProgram] = useState("");
  const [semester, setSemester] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const profile = await loadProfile(data.user.id);
      if (profile?.onboarded_at) navigate({ to: "/", replace: true });
    })();
  }, [navigate]);

  const catalogue = SUBJECT_CATALOGUE[board] ?? SUBJECT_CATALOGUE.University;

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const canAdvance =
    step === 0 ? !!board :
    step === 1 ? program.trim().length > 0 :
    step === 2 ? semester.trim().length > 0 :
    selectedSubjects.size > 0;

  const finish = async () => {
    setSubmitting(true);
    try {
      const subjects = catalogue
        .filter((s) => selectedSubjects.has(s.name))
        .map((s) => ({ name: s.name, code: s.code, concepts: s.concepts }));
      await seedWorkspace({ board, program, semester, subjects });
      toast.success("Workspace ready");
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed workspace");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5 mb-10">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">Scholaris</div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
              Workspace setup
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl border border-border bg-card/40 p-6 min-h-[340px]"
          >
            {step === 0 && (
              <Step title="Pick your board" subtitle="We use this to seed a starter catalogue of subjects.">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-5">
                  {BOARDS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBoard(b)}
                      className={`h-12 rounded-md border text-sm font-medium transition-colors ${
                        board === b
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </Step>
            )}

            {step === 1 && (
              <Step title="What program are you in?" subtitle="E.g. B.Tech Computer Science, MBBS Year 2, Grade 12 Science.">
                <input
                  autoFocus
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  placeholder="Program name"
                  className="mt-5 w-full h-11 rounded-md border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </Step>
            )}

            {step === 2 && (
              <Step title="Current term" subtitle="Helps Scholaris size your assessment horizon.">
                <input
                  autoFocus
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="e.g. Semester 4 · Fall 2026"
                  className="mt-5 w-full h-11 rounded-md border border-border bg-background/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </Step>
            )}

            {step === 3 && (
              <Step title="Pick your subjects" subtitle="We'll seed each one with starter concepts so the intelligence engine has signal immediately.">
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
                  {catalogue.map((s) => {
                    const active = selectedSubjects.has(s.name);
                    return (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => {
                          const next = new Set(selectedSubjects);
                          if (active) next.delete(s.name);
                          else next.add(s.name);
                          setSelectedSubjects(next);
                        }}
                        className={`text-left p-3 rounded-md border transition-colors ${
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background/40 hover:border-border/80"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{s.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {s.code || `${s.concepts.length} concepts`}
                            </div>
                          </div>
                          {active && (
                            <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground grid place-items-center shrink-0">
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Step>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || submitting}
            className="h-10 px-4 rounded-md border border-border bg-background/40 text-sm font-medium flex items-center gap-2 hover:bg-accent transition-colors disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              disabled={!canAdvance}
              className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={!canAdvance || submitting}
              className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Launch Scholaris
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      {children}
    </div>
  );
}
