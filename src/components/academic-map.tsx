import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, ShieldAlert, TrendingUp, Crown, AlarmClock, Sparkles, ClipboardCheck,
  Network, X, Zap, Target, ChevronRight, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAcademicMap, findUpstreamChain, findDownstreamChain, type MapMode, type MapNode,
} from "@/lib/academic-map";
import { useIntelligence, type DerivedConcept } from "@/lib/intelligence";
import { useSessionStore, blueprintFromConcept, blueprintFromSubject } from "@/lib/session-mode";

const MODES: { id: MapMode; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { id: "knowledge",  label: "Knowledge",  icon: Network,        desc: "Mastery & coverage" },
  { id: "memory",     label: "Memory",     icon: Brain,          desc: "Recall strength" },
  { id: "risk",       label: "Risk",       icon: ShieldAlert,    desc: "Failure exposure" },
  { id: "roi",        label: "ROI",        icon: TrendingUp,     desc: "Strategic value" },
  { id: "quest",      label: "Quests",     icon: Crown,          desc: "Active missions & critical path" },
  { id: "discipline", label: "Discipline", icon: AlarmClock,     desc: "Neglected & avoided" },
  { id: "assessment", label: "Assessment", icon: ClipboardCheck, desc: "Exam readiness" },
  { id: "forecast",   label: "Forecast",   icon: Sparkles,       desc: "Predicted forgetting" },
];

interface LegendItem { color: string; label: string }
const LEGEND: Record<MapMode, LegendItem[]> = {
  knowledge: [
    { color: "hsl(152 68% 50%)", label: "Strong ≥ 80" },
    { color: "hsl(43 96% 56%)",  label: "Solid 60–80" },
    { color: "hsl(28 92% 56%)",  label: "Weak 40–60" },
    { color: "hsl(0 80% 60%)",   label: "Critical < 40" },
    { color: "hsl(220 9% 46%)",  label: "Not started" },
  ],
  memory: [
    { color: "hsl(152 68% 50%)", label: "Reliable" },
    { color: "hsl(43 96% 56%)",  label: "Holding" },
    { color: "hsl(28 92% 56%)",  label: "Fading" },
    { color: "hsl(0 80% 60%)",   label: "Forgotten" },
  ],
  risk: [
    { color: "hsl(152 68% 50%)", label: "Low" },
    { color: "hsl(43 96% 56%)",  label: "Medium" },
    { color: "hsl(28 92% 56%)",  label: "High" },
    { color: "hsl(0 80% 60%)",   label: "Critical" },
  ],
  roi: [
    { color: "hsl(265 85% 65%)", label: "Highest ROI" },
    { color: "hsl(217 91% 60%)", label: "High ROI" },
    { color: "hsl(189 94% 55%)", label: "Moderate" },
    { color: "hsl(220 9% 46%)",  label: "Low" },
  ],
  quest: [
    { color: "hsl(265 85% 65%)", label: "Active mission" },
    { color: "hsl(217 91% 60%)", label: "Critical path" },
    { color: "hsl(220 9% 46%)",  label: "Background" },
  ],
  discipline: [
    { color: "hsl(152 68% 50%)", label: "Reviewed ≤ 2d" },
    { color: "hsl(43 96% 56%)",  label: "3–6d" },
    { color: "hsl(28 92% 56%)",  label: "7–13d" },
    { color: "hsl(0 80% 60%)",   label: "Avoided ≥ 14d" },
  ],
  assessment: [
    { color: "hsl(152 68% 50%)", label: "Exam-ready" },
    { color: "hsl(43 96% 56%)",  label: "Close" },
    { color: "hsl(28 92% 56%)",  label: "Gaps" },
    { color: "hsl(0 80% 60%)",   label: "Not ready" },
  ],
  forecast: [
    { color: "hsl(0 80% 60%)",   label: "Forgets ≤ 2d" },
    { color: "hsl(28 92% 56%)",  label: "≤ 5d" },
    { color: "hsl(43 96% 56%)",  label: "≤ 10d" },
    { color: "hsl(152 68% 50%)", label: "Stable" },
  ],
};

export function AcademicMap({ initialConceptId, initialMode }: { initialConceptId?: string; initialMode?: MapMode }) {
  const [mode, setMode] = useState<MapMode>(initialMode ?? "knowledge");
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const { nodes, edges, width, height, byId } = useAcademicMap(mode);
  const { concepts } = useIntelligence();

  // SVG pan/zoom state
  const [zoom, setZoom] = useState(0.7);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    if (initialConceptId) {
      const nid = `con:${initialConceptId}`;
      if (byId[nid]) {
        setSelected(nid);
        const n = byId[nid];
        // Centre the node
        setPan({ x: width / 2 - n.x * zoom, y: height / 2 - n.y * zoom });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConceptId, byId]);

  const selectedNode = selected ? byId[selected] : null;
  const selectedConcept = selectedNode?.concept ?? null;

  // Compute highlighted chains based on selection
  const { upstream, downstream } = useMemo(() => {
    if (!selectedConcept) return { upstream: new Set<string>(), downstream: new Set<string>() };
    return {
      upstream: findUpstreamChain(selectedConcept, concepts),
      downstream: findDownstreamChain(selectedConcept, concepts),
    };
  }, [selectedConcept, concepts]);

  const isDimmed = (n: MapNode) => {
    if (!selectedConcept) return false;
    if (n.kind === "subject") return false;
    if (!n.concept) return true;
    return n.concept.id !== selectedConcept.id && !upstream.has(n.concept.id) && !downstream.has(n.concept.id);
  };

  const onWheel: React.WheelEventHandler<SVGSVGElement> = (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setZoom((z) => Math.min(2.5, Math.max(0.25, z + delta)));
  };
  const onMouseDown: React.MouseEventHandler<SVGSVGElement> = (e) => {
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const onMouseMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
    if (!dragRef.current) return;
    setPan({ x: dragRef.current.px + (e.clientX - dragRef.current.x), y: dragRef.current.py + (e.clientY - dragRef.current.y) });
  };
  const onMouseUp = () => { dragRef.current = null; };

  return (
    <div className="relative">
      <ModeBar mode={mode} setMode={setMode} />

      <div className="relative mt-4 rounded-2xl border border-border bg-card/40 overflow-hidden" style={{ height: "calc(100vh - 240px)", minHeight: 560 }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          className="select-none cursor-grab active:cursor-grabbing"
        >
          <defs>
            <radialGradient id="bg-glow" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="hsl(220 30% 14%)" />
              <stop offset="100%" stopColor="hsl(220 30% 6%)" />
            </radialGradient>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="hsl(220 9% 60% / 0.6)" />
            </marker>
            <marker id="arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="hsl(0 80% 65%)" />
            </marker>
          </defs>
          <rect width={width} height={height} fill="url(#bg-glow)" />

          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            <g stroke="hsl(220 9% 60% / 0.18)" strokeWidth={1.4} fill="none">
              {edges.map((e) => {
                const from = byId[e.from];
                const to = byId[e.to];
                if (!from || !to) return null;
                const highlight = e.highlight ||
                  (selectedConcept && (
                    from.concept?.id === selectedConcept.id || to.concept?.id === selectedConcept.id ||
                    (upstream.has(from.concept?.id ?? "") && upstream.has(to.concept?.id ?? "")) ||
                    (downstream.has(from.concept?.id ?? "") && downstream.has(to.concept?.id ?? ""))
                  ));
                const dim = selectedConcept && !highlight;
                const mx = (from.x + to.x) / 2;
                const my = (from.y + to.y) / 2 - 30;
                return (
                  <path
                    key={e.id}
                    d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
                    stroke={highlight ? "hsl(0 80% 65% / 0.75)" : "hsl(220 9% 60% / 0.18)"}
                    strokeWidth={highlight ? 2 : 1.2}
                    opacity={dim ? 0.05 : 1}
                    markerEnd={highlight ? "url(#arrow-hot)" : "url(#arrow)"}
                  />
                );
              })}
            </g>

            {/* Nodes */}
            {nodes.map((n) => {
              const dim = isDimmed(n);
              const isSel = selected === n.id;
              const isHov = hovered === n.id;
              if (n.kind === "subject") {
                return (
                  <g key={n.id} opacity={dim ? 0.25 : 1} style={{ cursor: "pointer" }}
                     onClick={(e) => { e.stopPropagation(); setSelected(n.id === selected ? null : n.id); }}>
                    <circle cx={n.x} cy={n.y} r={n.r + 14} fill={n.color} opacity={0.08} />
                    <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} opacity={0.92}
                            stroke={isSel ? "hsl(0 0% 100%)" : "hsl(0 0% 100% / 0.25)"} strokeWidth={isSel ? 3 : 1.5} />
                    <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill="white" pointerEvents="none">
                      {n.label.length > 18 ? n.label.slice(0, 17) + "…" : n.label}
                    </text>
                  </g>
                );
              }
              return (
                <g key={n.id} opacity={dim ? 0.18 : 1} style={{ cursor: "pointer" }}
                   onClick={(e) => { e.stopPropagation(); setSelected(n.id === selected ? null : n.id); }}
                   onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered((h) => h === n.id ? null : h)}>
                  {n.ring && <circle cx={n.x} cy={n.y} r={n.r + 5} fill="none" stroke={n.ring} strokeWidth={2} opacity={0.7} />}
                  <circle cx={n.x} cy={n.y} r={n.r} fill={n.color}
                          stroke={isSel ? "hsl(0 0% 100%)" : isHov ? "hsl(0 0% 100% / 0.6)" : "hsl(0 0% 0% / 0.4)"}
                          strokeWidth={isSel ? 3 : 1.2} />
                  {(isHov || isSel) && (
                    <text x={n.x} y={n.y - n.r - 6} textAnchor="middle" fontSize={11} fontWeight={600}
                          fill="white" stroke="hsl(220 30% 6%)" strokeWidth={3} paintOrder="stroke" pointerEvents="none">
                      {n.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 rounded-lg bg-background/80 backdrop-blur border border-border px-3 py-2 text-xs">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Layers className="h-3 w-3" /> {MODES.find((m) => m.id === mode)!.label}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {LEGEND[mode].map((it) => (
              <div key={it.label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
                <span>{it.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Zoom hint */}
        <div className="absolute top-3 right-3 text-[10px] uppercase tracking-wider text-muted-foreground bg-background/70 backdrop-blur rounded px-2 py-1 border border-border">
          Scroll to zoom · drag to pan
        </div>
      </div>

      <AnimatePresence>
        {selectedNode && (
          <NodePanel
            key={selectedNode.id}
            node={selectedNode}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ModeBar({ mode, setMode }: { mode: MapMode; setMode: (m: MapMode) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border bg-card/40 text-muted-foreground hover:text-foreground hover:border-border/100",
            )}
            title={m.desc}
          >
            <Icon className="h-3.5 w-3.5" />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

function NodePanel({ node, onClose }: { node: MapNode; onClose: () => void }) {
  const navigate = useNavigate();
  const launch = useSessionStore((s) => s.launch);
  if (node.kind === "subject" && node.subject) {
    const s = node.subject;
    return (
      <motion.aside
        initial={{ x: 360, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 360, opacity: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
        className="fixed right-4 top-24 bottom-4 w-[360px] z-30 rounded-2xl border border-border bg-card shadow-2xl flex flex-col"
      >
        <header className="p-4 border-b border-border flex items-start gap-3">
          <span className="h-3 w-3 rounded-full mt-1.5" style={{ background: s.color }} />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Subject</div>
            <div className="font-semibold text-base leading-tight">{s.name}</div>
            <div className="text-xs text-muted-foreground">{s.code} · {s.concepts} concepts</div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
        </header>
        <div className="p-4 space-y-3 overflow-y-auto flex-1 text-sm">
          <Stat label="Mastery" value={`${s.mastery}/100`} />
          <Stat label="Memory" value={`${s.memory}/100`} />
          <Stat label="Risk" value={`${s.risk}/100`} />
          <Stat label="ROI" value={`${s.roi}/100`} />
          <Stat label="Readiness" value={`${s.readiness}/100`} />
          {s.daysToAssessment !== undefined && <Stat label="Next assessment" value={`${s.daysToAssessment}d`} />}
          <Stat label="Weak concepts" value={`${s.weakConcepts}`} />
        </div>
        <footer className="p-3 border-t border-border flex gap-2">
          <button
            onClick={() => { const bp = blueprintFromSubject(s.id); if (bp) { launch(bp); navigate({ to: "/session" }); } }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold py-2 hover:bg-primary/90"
          >
            <Zap className="h-3.5 w-3.5" /> Run subject session
          </button>
          <button
            onClick={() => navigate({ to: "/subjects/$id", params: { id: s.id } })}
            className="rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            Open <ChevronRight className="inline h-3 w-3" />
          </button>
        </footer>
      </motion.aside>
    );
  }
  const c = node.concept!;
  return (
    <motion.aside
      initial={{ x: 360, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 360, opacity: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      className="fixed right-4 top-24 bottom-4 w-[380px] z-30 rounded-2xl border border-border bg-card shadow-2xl flex flex-col"
    >
      <header className="p-4 border-b border-border flex items-start gap-3">
        <span className="h-3 w-3 rounded-full mt-1.5" style={{ background: node.subjectColor }} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.subjectName} · {c.topic}</div>
          <div className="font-semibold text-base leading-tight">{c.name}</div>
          <div className="text-xs text-muted-foreground capitalize">Status: {c.status}</div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
      </header>
      <div className="p-4 space-y-2 overflow-y-auto flex-1 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Mastery" value={c.mastery} tone={c.mastery >= 70 ? "good" : c.mastery >= 45 ? "warn" : "bad"} />
          <Metric label="Memory" value={c.memoryStrength} tone={c.memoryStrength >= 70 ? "good" : c.memoryStrength >= 45 ? "warn" : "bad"} />
          <Metric label="Risk" value={c.risk} tone={c.risk >= 65 ? "bad" : c.risk >= 40 ? "warn" : "good"} />
          <Metric label="ROI" value={c.roi} tone={c.roi >= 65 ? "good" : c.roi >= 40 ? "warn" : "bad"} />
        </div>
        <Section title="Knowledge Graph">
          <Row label="Prerequisites" value={`${c.prerequisiteIds.length} direct · ${c.dependencyCount} upstream`} />
          <Row label="Dependents" value={`${c.dependentIds.length} direct · ${c.downstreamCount} downstream`} />
          <Row label="Structural" value={`${c.structuralImportance}/100`} />
          <Row label="Critical path" value={c.isCriticalPath ? "Yes" : "No"} />
          <Row label="Bottleneck" value={c.isBottleneck ? "Yes" : "No"} />
        </Section>
        <Section title="Memory Forecast">
          <Row label="Predicted forgetting" value={`${c.memory.predictedForgettingDays}d (${c.memory.predictedForgettingDate})`} />
          <Row label="Stability" value={`${c.memory.stability}/100`} />
          <Row label="Recall confidence" value={`${c.memory.recallConfidence}/100`} />
          <Row label="Days since review" value={`${c.daysSinceReview}d`} />
        </Section>
        <Section title="Why this ROI">
          {(c.roiContributors.length ? c.roiContributors : ["No notable ROI drivers."]).slice(0, 4).map((r, i) => (
            <div key={i} className="text-xs text-muted-foreground">• {r}</div>
          ))}
        </Section>
        <Section title="Why this risk">
          <div className="text-xs text-muted-foreground">{c.explain.risk.reason}</div>
        </Section>
      </div>
      <footer className="p-3 border-t border-border flex gap-2">
        <button
          onClick={() => { const bp = blueprintFromConcept(c.id); if (bp) { launch(bp); navigate({ to: "/session" }); } }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold py-2 hover:bg-primary/90"
        >
          <Target className="h-3.5 w-3.5" /> Start session
        </button>
        <button
          onClick={() => navigate({ to: "/concepts/$id", params: { id: c.id } })}
          className="rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
        >
          Details <ChevronRight className="inline h-3 w-3" />
        </button>
      </footer>
    </motion.aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}
function Metric({ label, value, tone }: { label: string; value: number; tone: "good" | "warn" | "bad" }) {
  const c = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-amber-400" : "text-rose-400";
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-lg font-bold tabular-nums", c)}>{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pt-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default AcademicMap;
