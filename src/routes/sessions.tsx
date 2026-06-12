import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck, Clock, Calendar, CheckCircle2, PlayCircle } from "lucide-react";
import { PageHeader, Panel, StatCard, MetricBar } from "@/components/widgets";

export const Route = createFileRoute("/sessions")({
  head: () => ({ meta: [{ title: "Sessions & Assessments — Scholaris" }] }),
  component: SessionsHub,
});

const sessions = [
  { id: "s1", type: "Recovery", subject: "Quantum Mechanics", concept: "Schrödinger Equation", duration: 22, gain: 14, date: "Today, 09:14" },
  { id: "s2", type: "Review", subject: "Organic Chemistry", concept: "SN2 Mechanism", duration: 16, gain: 4, date: "Today, 08:30" },
  { id: "s3", type: "Diagnostic", subject: "Cellular Biology", concept: "Membrane Transport", duration: 18, gain: 8, date: "Yesterday, 21:02" },
  { id: "s4", type: "Reinforcement", subject: "Linear Algebra", concept: "Eigenvalues", duration: 28, gain: 6, date: "Yesterday, 16:40" },
];

const assessments = [
  { id: "a1", subject: "Quantum Mechanics", title: "Midterm 2", date: "Jun 15", days: 3, readiness: 38, importance: "Critical" },
  { id: "a2", subject: "Macroeconomics", title: "Quiz 4", date: "Jun 16", days: 4, readiness: 54, importance: "High" },
  { id: "a3", subject: "Organic Chemistry", title: "Practical lab review", date: "Jun 18", days: 6, readiness: 78, importance: "Medium" },
  { id: "a4", subject: "Cellular Biology", title: "Concept quiz", date: "Jun 19", days: 7, readiness: 64, importance: "Medium" },
];

function SessionsHub() {
  return (
    <div>
      <PageHeader eyebrow="Workspace" title="Sessions & Assessments" description="Every focused session and every upcoming assessment in one place." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Sessions today" value="2" icon={PlayCircle} />
        <StatCard label="Minutes today" value="38" icon={Clock} />
        <StatCard label="Mastery gained" value="+18" suffix="pts" trend={4.2} tone="success" />
        <StatCard label="Upcoming exams" value={assessments.length} icon={Calendar} tone="warning" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Recent sessions" description="Last 48 hours">
          <div className="space-y-2.5">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card/50">
                <div className="h-9 w-9 rounded-md bg-primary/15 text-primary grid place-items-center shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{s.type}</span>
                    <span className="text-xs text-muted-foreground">· {s.subject}</span>
                  </div>
                  <div className="text-sm font-medium truncate">{s.concept}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{s.date} · {s.duration}m · <span className="text-success">+{s.gain} mastery</span></div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Upcoming assessments" description="Readiness scored by the intelligence engine">
          <div className="space-y-3">
            {assessments.map((a) => (
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
        </Panel>
      </div>
    </div>
  );
}
