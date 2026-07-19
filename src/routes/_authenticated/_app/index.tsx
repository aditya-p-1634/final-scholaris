import { createFileRoute, Link } from "@tanstack/react-router";
import { UploadCloud, Sparkles, ArrowRight, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/widgets";
import { CommanderMode } from "@/components/commander-mode";
import { useIntelligence } from "@/lib/intelligence";
import { useDailyOS } from "@/lib/daily-os";

export const Route = createFileRoute("/_authenticated/_app/")({
  head: () => ({
    meta: [
      { title: "Commander Mode — Scholaris" },
      { name: "description", content: "Your unified Academic System Interface — main quest, discipline, momentum, recovery and strategic alerts in one place." },
    ],
  }),
  component: CommanderHome,
});

function CommanderHome() {
  const { subjects } = useIntelligence();
  const bundle = useDailyOS();

  if (subjects.length === 0) {
    return <FirstRunWelcome />;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Commander Mode"
        title={bundle.briefing.greeting}
        description="Your Academic System Interface — direction, execution and accountability in one surface."
      />
      <CommanderMode />
    </div>
  );
}

function FirstRunWelcome() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col items-center text-center pt-6 pb-10">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-chart-4 grid place-items-center mb-5 shadow-lg shadow-primary/20">
          <GraduationCap className="h-7 w-7 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
          Welcome to Scholaris
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight max-w-2xl">
          Your Academic Operating System is ready.
        </h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-lg">
          Let's build your academic workspace. Pick how you'd like to start — either option activates Commander Mode, the Daily OS, the Academic Map and the intelligence engines.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/import"
          className="group relative rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card/40 to-card/40 p-6 text-left transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10"
        >
          <div className="absolute top-4 right-4 text-[10px] uppercase tracking-[0.14em] font-semibold text-primary bg-primary/15 border border-primary/30 rounded-full px-2 py-0.5">
            Recommended
          </div>
          <div className="h-11 w-11 rounded-xl bg-primary/15 border border-primary/30 grid place-items-center mb-4">
            <UploadCloud className="h-5 w-5 text-primary" />
          </div>
          <div className="text-base font-semibold tracking-tight">Import your syllabus</div>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Upload a PDF, photo or scan of your syllabus or course handbook. Scholaris reads it and builds your subjects, topics, concepts and knowledge graph automatically.
          </p>
          <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            Start import <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        <Link
          to="/onboarding"
          className="group rounded-2xl border border-border bg-card/40 p-6 text-left transition-all hover:border-border/80 hover:bg-card/60"
        >
          <div className="h-11 w-11 rounded-xl bg-accent border border-border grid place-items-center mb-4">
            <Sparkles className="h-5 w-5 text-foreground" />
          </div>
          <div className="text-base font-semibold tracking-tight">Create workspace manually</div>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            Walk through a guided setup to pick your board, program and term, then choose subjects from a curated catalogue seeded with starter concepts.
          </p>
          <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            Set up manually <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      </div>

      <div className="text-center text-xs text-muted-foreground mt-8">
        Both paths take under a minute. You can refine subjects, topics and concepts anytime afterwards.
      </div>
    </div>
  );
}
