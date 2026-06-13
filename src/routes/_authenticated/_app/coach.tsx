import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Send, Brain, Hourglass, TrendingUp, Compass, GitBranch } from "lucide-react";
import { PageHeader, Panel, Explain } from "@/components/widgets";
import { useIntelligence } from "@/lib/intelligence";
import { usePredictive, generateStrategistReply, getCoreState } from "@/lib/predictive";

export const Route = createFileRoute("/_authenticated/_app/coach")({
  head: () => ({ meta: [{ title: "Academic Strategist — Scholaris" }] }),
  component: CoachDashboard,
});

interface Message { role: "coach" | "user"; text: string }

function CoachDashboard() {
  const derived = useIntelligence();
  const { coachContext: ctx, incidents, recommendations } = derived;
  const predictive = usePredictive();
  const { studentModel, digitalTwin, strategicInsights, missionForecasts } = predictive;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => {
    const lead = strategicInsightsOpening(strategicInsights, missionForecasts);
    return [{ role: "coach", text: lead }];
  });

  const ask = (q: string) => {
    if (!q.trim()) return;
    const reply = generateStrategistReply(q, getCoreState(), studentModel);
    setMessages((m) => [...m, { role: "user", text: q }, { role: "coach", text: reply }]);
    setInput("");
  };

  const suggestions = [
    { icon: Compass, text: "What's my future trajectory?" },
    { icon: Hourglass, text: "What am I about to forget?" },
    { icon: TrendingUp, text: "What's my risk forecast?" },
    { icon: GitBranch, text: "What's my biggest bottleneck?" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Intelligence"
        title="Academic Strategist"
        description="A future-aware strategist that reasons over your concept graph, personalised memory model and predicted trajectories."
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
          <Panel title="Strategist context" description="What the strategist reasons over">
            <div className="space-y-3 text-sm">
              <Item label="Learner archetype" value={studentModel.archetype} />
              <Item label="Profile confidence" value={`${studentModel.profileConfidence}%`} />
              <Item label="Learning velocity" value={`${studentModel.learningVelocity}/hr`} />
              <Item label="Recall accuracy" value={`${studentModel.recallAccuracy}%`} />
              <Item label="Composite risk" value={`${ctx.compositeRisk}/100`} />
              <Item label="Open incidents" value={String(incidents.length)} />
              <Item label="Live recommendations" value={String(recommendations.length)} />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[digitalTwin.currentSelf, digitalTwin.projectedSelf, digitalTwin.futureSelf].map((t, i) => (
                <div key={t.label} className="rounded-md bg-muted/40 py-2">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{i === 0 ? "Now" : i === 1 ? "14d" : "30d"}</div>
                  <div className="text-base font-semibold tabular-nums">{t.mastery}</div>
                  <div className="text-[9px] text-muted-foreground">mastery</div>
                </div>
              ))}
            </div>
          </Panel>

          {strategicInsights[0] && (
            <Panel title="Top strategic signal">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium leading-snug">{strategicInsights[0].title}</span>
              </div>
              <Explain data={strategicInsights[0].explanation} defaultOpen />
              <Link to="/missions" className="mt-3 inline-flex text-xs text-primary hover:underline">Open missions →</Link>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function strategicInsightsOpening(
  insights: ReturnType<typeof usePredictive>["strategicInsights"],
  missionForecasts: ReturnType<typeof usePredictive>["missionForecasts"],
): string {
  if (insights[0]) {
    return `Strategic read: ${insights[0].title}. ${insights[0].explanation.reason} ${insights[0].explanation.projectedImpact}`;
  }
  if (missionForecasts[0]) {
    return `Your highest future-value action is "${missionForecasts[0].title}" (${missionForecasts[0].futureValue}/100). Ask me about your trajectory, forgetting forecast or exam outlook.`;
  }
  return `I'm calibrating from your behaviour. Run a few missions and I'll forecast your trajectory, risk and forgetting curve.`;
}


function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
