import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Send, Brain, Target, TrendingUp } from "lucide-react";
import { PageHeader, Panel } from "@/components/widgets";

export const Route = createFileRoute("/coach")({
  head: () => ({ meta: [{ title: "AI Coach — Scholaris" }] }),
  component: CoachDashboard,
});

const conversation = [
  { role: "coach", text: "Your Quantum Mechanics module is destabilizing — Schrödinger Equation crossed the critical decay threshold today. I've queued a 20-minute recovery sprint." },
  { role: "user", text: "What should I prioritize before Friday's exam?" },
  { role: "coach", text: "Three concepts carry 68% of the exam's projected weight: Schrödinger Equation, Hilbert Spaces, and Wave-Particle Duality. Recovering Schrödinger first unlocks 6 downstream nodes." },
];

const suggestions = [
  { icon: Brain, text: "Why is my memory dropping in Cellular Biology?" },
  { icon: Target, text: "What's the highest-impact mission right now?" },
  { icon: TrendingUp, text: "Show me where my ROI is highest this week." },
];

function CoachDashboard() {
  return (
    <div>
      <PageHeader eyebrow="Intelligence" title="AI Coach" description="An academic strategist with full context of your concept graph, memory state and goals." />

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel className="lg:col-span-2 flex flex-col min-h-[520px]">
          <div className="flex-1 space-y-4">
            {conversation.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "coach" && (
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-chart-4 grid place-items-center shrink-0">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/60"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border/60">
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestions.map((s, i) => (
                <button key={i} className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-muted/50 border border-border/60 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <s.icon className="h-3 w-3" />{s.text}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl border border-border bg-background">
              <input className="flex-1 bg-transparent outline-none text-sm px-2" placeholder="Ask your coach anything…" />
              <button className="h-8 w-8 grid place-items-center rounded-md bg-primary text-primary-foreground">
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="Coach context" description="What the coach sees right now">
          <div className="space-y-3 text-sm">
            <Item label="Active subjects" value="6" />
            <Item label="Critical concepts" value="4" />
            <Item label="Upcoming exams (7d)" value="3" />
            <Item label="Mission queue" value="7" />
            <Item label="Composite risk" value="45/100" />
          </div>
          <div className="mt-5 p-4 rounded-lg bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-primary mb-1">Strategic outlook</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your dominant strategy this week: defend Quantum Mechanics, maintain Organic Chemistry, allow Philosophy to coast.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
