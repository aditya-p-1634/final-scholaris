import { createFileRoute } from "@tanstack/react-router";
import { Clock, Calendar, CheckCircle2, PlayCircle } from "lucide-react";
import { PageHeader, Panel, StatCard, MetricBar } from "@/components/widgets";
import { useIntelligence, computeSubjectReadiness, useIntelligenceStore } from "@/lib/intelligence";

export const Route = createFileRoute("/sessions")({
  head: () => ({ meta: [{ title: "Sessions & Assessments — Scholaris" }] }),
  component: SessionsHub,
});

function SessionsHub() {
  const { sessions, subjects, focusToday } = useIntelligence();
  const state = useIntelligenceStore.getState();
  const upcoming = subjects
    .filter((s) => s.daysToAssessment !== undefined)
    .sort((a, b) => (a.daysToAssessment! - b.daysToAssessment!))
    .map((s) => ({
      id: `as-${s.id}`,
      subjectId: s.id,
      subject: s.name,
      title: `${s.code} assessment`,
      date: s.nextAssessment ?? "—",
      days: s.daysToAssessment!,
      readiness: computeSubjectReadiness(state, s.id),
      importance: s.risk > 65 ? "Critical" : s.risk > 45 ? "High" : "Medium",
    }));

  const totalGain = sessions.reduce((a, s) => a + s.gain, 0);

  return (
    <div>
      <PageHeader eyebrow="Workspace" title="Sessions & Assessments" description="Every focused session and every upcoming assessment in one place." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Sessions today" value={focusToday.sessionsCompleted} icon={PlayCircle} />
        <StatCard label="Minutes today" value={focusToday.completedMinutes} icon={Clock} />
        <StatCard label="Mastery gained" value={`+${totalGain}`} suffix="pts" tone="success" />
        <StatCard label="Upcoming exams" value={upcoming.length} icon={Calendar} tone="warning" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Recent sessions" description="Most recent first">
          {sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No sessions logged yet. Run a mission to begin.</div>
          ) : (
            <div className="space-y-2.5">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card/50">
                  <div className="h-9 w-9 rounded-md bg-primary/15 text-primary grid place-items-center shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{s.type}</span>
                      <span className="text-xs text-muted-foreground">· {s.subjectName}</span>
                    </div>
                    <div className="text-sm font-medium truncate">{s.conceptName}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{s.dateLabel} · {s.duration}m · <span className="text-success">+{s.gain} mastery</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Upcoming assessments" description="Readiness scored by the intelligence engine">
          {upcoming.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">No upcoming assessments scheduled.</div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((a) => (
                <div key={a.id} className="p-3 rounded-lg border border-border/60 bg-card/50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                          a.importance === "Critical" ? "text-destructive" : a.importance === "High" ? "text-warning" : "text-muted-foreground"
                        }`}>{a.importance}</span>
                        <span className="text-[10px] text-muted-foreground">· {a.subject}</span>
                      </div>
                      <div className="text-sm font-medium truncate">{a.title}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono">{a.date}</div>
                      <div className="text-[10px] text-muted-foreground">in {a.days}d</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1"><MetricBar value={a.readiness} tone={a.readiness < 40 ? "danger" : a.readiness < 65 ? "warning" : "success"} /></div>
                    <span className="text-xs font-mono w-12 text-right">{a.readiness}%</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">Projected readiness</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
