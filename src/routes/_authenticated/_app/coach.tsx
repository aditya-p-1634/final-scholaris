import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Send, Brain, Target, TrendingUp, ShieldAlert } from "lucide-react";
import { PageHeader, Panel } from "@/components/widgets";
import { useIntelligence, useIntelligenceStore, generateCoachReply } from "@/lib/intelligence";

export const Route = createFileRoute("/_authenticated/_app/coach")({
  head: () => ({ meta: [{ title: "AI Coach — Scholaris" }] }),
  component: CoachDashboard,
});

interface Message { role: "coach" | "user"; text: string }

function CoachDashboard() {
  const derived = useIntelligence();
  const { coachContext: ctx, missions, incidents, recommendations } = derived;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => {
    const opening = ctx.topMission
      ? `Your dominant priority right now is "${ctx.topMission.title}" — ${ctx.topMission.reason}. I've placed it at the top of your mission queue.`
      : `All subjects are stable. Use the time to expand from mastered nodes.`;
    return [{ role: "coach", text: opening }];
  });

  const ask = (q: string) => {
    if (!q.trim()) return;
    const reply = generateCoachReply(q, ctx, useIntelligenceStore.getState() && derived);
    setMessages((m) => [...m, { role: "user", text: q }, { role: "coach", text: reply }]);
    setInput("");
  };

  const suggestions = [
    { icon: Brain, text: `Why is memory dropping in ${derived.subjects.find((s) => s.status === "at-risk" || s.status === "critical")?.name ?? "my weakest subject"}?` },
    { icon: Target, text: "What's the highest-impact mission right now?" },
    { icon: TrendingUp, text: "Where is my ROI highest this week?" },
    { icon: ShieldAlert, text: "What's my biggest exam risk?" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Intelligence"
        title="AI Coach"
        description="An academic strategist with full context of your concept graph, memory state and goals."
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel className="lg:col-span-2 flex flex-col min-h-[560px]">
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[460px] pr-1">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
              >
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
              </motion.div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-border/60">
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => ask(s.text)}
                  className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full bg-muted/50 border border-border/60 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <s.icon className="h-3 w-3" />{s.text}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); ask(input); }}
              className="flex items-center gap-2 p-2 rounded-xl border border-border bg-background"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm px-2"
                placeholder="Ask your coach anything…"
              />
              <button type="submit" className="h-8 w-8 grid place-items-center rounded-md bg-primary text-primary-foreground cursor-pointer">
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Coach context" description="What the coach sees right now">
            <div className="space-y-3 text-sm">
              <Item label="Active subjects" value={String(ctx.activeSubjects)} />
              <Item label="Critical concepts" value={String(ctx.criticalConcepts)} />
              <Item label="Upcoming exams (7d)" value={String(ctx.upcomingExams7d)} />
              <Item label="Mission queue" value={String(ctx.missionQueue)} />
              <Item label="Composite risk" value={`${ctx.compositeRisk}/100`} />
              <Item label="Open incidents" value={String(incidents.length)} />
              <Item label="Live recommendations" value={String(recommendations.length)} />
            </div>
            <div className="mt-5 p-4 rounded-lg bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-primary mb-1">Strategic outlook</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{ctx.strategicOutlook}</p>
            </div>
          </Panel>

          {ctx.topMission && (
            <Panel title="Top mission in queue">
              <div className="text-sm font-medium">{ctx.topMission.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{ctx.topMission.reason}</div>
              <Link to="/missions" className="mt-3 inline-flex text-xs text-primary hover:underline">Open missions →</Link>
            </Panel>
          )}
        </div>
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
