import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/widgets";
import { DailyOSPage } from "@/components/daily-os";
import { useDailyOS } from "@/lib/daily-os";

export const Route = createFileRoute("/_authenticated/_app/today")({
  head: () => ({
    meta: [
      { title: "Today — Daily Operating System · Scholaris" },
      { name: "description", content: "Your academic command ritual: morning briefing, evening debrief, tomorrow preview and weekly review." },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const bundle = useDailyOS();
  const phaseLabel =
    bundle.phase === "morning" ? "Morning Briefing" :
    bundle.phase === "midday" ? "Midday Check-In" :
    bundle.phase === "evening" ? "Evening Debrief" : "Late Night";
  const dateStr = bundle.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div>
      <PageHeader
        eyebrow={phaseLabel}
        title={bundle.briefing.greeting}
        description={`${dateStr} · Scholaris is your academic operating system — direction, execution, accountability, growth.`}
      />
      <DailyOSPage bundle={bundle} />
    </div>
  );
}
