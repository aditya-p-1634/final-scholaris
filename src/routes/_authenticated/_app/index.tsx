import { createFileRoute } from "@tanstack/react-router";
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
    return <FirstRunPlaceholder />;
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

function FirstRunPlaceholder() {
  return (
    <div>
      <PageHeader
        eyebrow="Commander Mode"
        title="Welcome to Scholaris."
        description="Your Academic System Interface is empty. Import a syllabus or capture an activity to seed the system."
      />
      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Once you've logged your first session or imported a syllabus, Commander Mode will surface your main quest, recovery debt, discipline, momentum and strategic alerts.
        </p>
      </div>
    </div>
  );
}
