// Academic Map — Tactical Knowledge Command Center.
// A dense, hierarchical, multi-region command surface that visualises
// academic intelligence as strategic territory rather than a generic graph.
//
// Layout:
//   [ Sector list ] [ Tactical canvas (subject regions) ] [ Intelligence panel ]
//
// Each subject = a "sector" with a layered dependency tree (columns by
// prerequisite depth). Concepts = importance-sized tiles colour-coded by
// the active intelligence mode. Critical-path concepts pulse; bottlenecks
// wear a crown; quest targets carry a violet halo. Arrows connect prereqs.

import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, ShieldAlert, TrendingUp, Crown, AlarmClock, Sparkles, ClipboardCheck,
  Network, X, Zap, Target, ChevronRight, Layers, Maximize2, Minimize2,
  Activity, GitBranch, AlertTriangle, Flame, Compass, Radar, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapMode } from "@/lib/academic-map";
import {
  useIntelligence, type DerivedConcept, type DerivedSubject,
} from "@/lib/intelligence";
import { useSessionStore, blueprintFromConcept, blueprintFromSubject } from "@/lib/session-mode";

// ---------------- Modes ----------------

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
    { color: "hsl(152 68% 50%)", label: "≥80 Strong" },
    { color: "hsl(43 96% 56%)",  label: "60-80 Solid" },
    { color: "hsl(28 92% 56%)",  label: "40-60 Weak" },
    { color: "hsl(0 80% 60%)",   label: "<40 Critical" },
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
    { color: "hsl(152 68% 50%)", label: "≤2d" },
    { color: "hsl(43 96% 56%)",  label: "3-6d" },
    { color: "hsl(28 92% 56%)",  label: "7-13d" },
    { color: "hsl(0 80% 60%)",   label: "Avoided ≥14d" },
  ],
  assessment: [
    { color: "hsl(152 68% 50%)", label: "Exam-ready" },
    { color: "hsl(43 96% 56%)",  label: "Close" },
    { color: "hsl(28 92% 56%)",  label: "Gaps" },
    { color: "hsl(0 80% 60%)",   label: "Not ready" },
  ],
  forecast: [
    { color: "hsl(0 80% 60%)",   label: "Forgets ≤2d" },
    { color: "hsl(28 92% 56%)",  label: "≤5d" },
    { color: "hsl(43 96% 56%)",  label: "≤10d" },
    { color: "hsl(152 68% 50%)", label: "Stable" },
  ],
};

const TONE = {
  emerald: "hsl(152 68% 50%)",
  amber: "hsl(43 96% 56%)",
  orange: "hsl(28 92% 56%)",
  red: "hsl(0 80% 60%)",
  gray: "hsl(220 9% 46%)",
  blue: "hsl(217 91% 60%)",
  violet: "hsl(265 85% 65%)",
  cyan: "hsl(189 94% 55%)",
};

function colorForConcept(c: DerivedConcept, mode: MapMode, inQuest: boolean): string {
  const started = c.reviewCount > 0 || c.mastery > 0;
  if (!started && mode !== "quest" && mode !== "roi") return TONE.gray;
  switch (mode) {
    case "knowledge": return c.mastery >= 80 ? TONE.emerald : c.mastery >= 60 ? TONE.amber : c.mastery >= 40 ? TONE.orange : TONE.red;
    case "memory":    return c.memoryStrength >= 80 ? TONE.emerald : c.memoryStrength >= 60 ? TONE.amber : c.memoryStrength >= 40 ? TONE.orange : TONE.red;
    case "risk":      return c.risk >= 75 ? TONE.red : c.risk >= 55 ? TONE.orange : c.risk >= 35 ? TONE.amber : TONE.emerald;
    case "roi":       return c.roi >= 75 ? TONE.violet : c.roi >= 55 ? TONE.blue : c.roi >= 35 ? TONE.cyan : TONE.gray;
    case "quest":     return inQuest ? TONE.violet : c.isCriticalPath ? TONE.blue : TONE.gray;
    case "discipline":return c.daysSinceReview >= 14 ? TONE.red : c.daysSinceReview >= 7 ? TONE.orange : c.daysSinceReview >= 3 ? TONE.amber : TONE.emerald;
    case "assessment":{
      const r = c.mastery * 0.6 + c.memoryStrength * 0.4;
      return r >= 80 ? TONE.emerald : r >= 60 ? TONE.amber : r >= 40 ? TONE.orange : TONE.red;
    }
    case "forecast":  {
      const d = c.memory.predictedForgettingDays;
      return d <= 2 ? TONE.red : d <= 5 ? TONE.orange : d <= 10 ? TONE.amber : TONE.emerald;
    }
  }
}

// ---------------- Layered DAG layout per subject ----------------

interface LayoutTile {
  c: DerivedConcept;
  col: number;     // 0..maxCol
  row: number;     // 0..rowsInCol-1
  rowsInCol: number;
  size: number;    // 1..3 — 1=small,2=med,3=large (importance-driven)
  inQuest: boolean;
}
interface SubjectLayout {
  tiles: LayoutTile[];
  byId: Record<string, LayoutTile>;
  cols: number;
}

function buildSubjectLayout(
  concepts: DerivedConcept[],
  questIds: Set<string>,
): SubjectLayout {
  if (concepts.length === 0) return { tiles: [], byId: {}, cols: 1 };
  const map = new Map(concepts.map((c) => [c.id, c]));
  // Depth = longest prereq chain within same subject.
  const depth = new Map<string, number>();
  const computeDepth = (id: string, stack: Set<string>): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (stack.has(id)) return 0;
    stack.add(id);
    const c = map.get(id);
    if (!c) return 0;
    let d = 0;
    for (const pid of c.prerequisiteIds) {
      if (map.has(pid)) d = Math.max(d, 1 + computeDepth(pid, stack));
    }
    stack.delete(id);
    depth.set(id, d);
    return d;
  };
  for (const c of concepts) computeDepth(c.id, new Set());
  const maxDepth = Math.max(0, ...Array.from(depth.values()));
  const cols = Math.min(6, maxDepth + 1);
  // Group by column, sort within by importance desc.
  const colGroups: DerivedConcept[][] = Array.from({ length: cols }, () => []);
  for (const c of concepts) {
    const d = Math.min(cols - 1, depth.get(c.id) ?? 0);
    colGroups[d].push(c);
  }
  for (const g of colGroups) g.sort((a, b) => (b.importance * 10 + b.risk) - (a.importance * 10 + a.risk));

  const tiles: LayoutTile[] = [];
  const byId: Record<string, LayoutTile> = {};
  colGroups.forEach((g, col) => {
    g.forEach((c, row) => {
      const sz = c.importance >= 8 || c.isCriticalPath || c.isBottleneck ? 3 : c.importance >= 5 ? 2 : 1;
      const t: LayoutTile = { c, col, row, rowsInCol: g.length, size: sz, inQuest: questIds.has(c.id) };
      tiles.push(t);
      byId[c.id] = t;
    });
  });
  return { tiles, byId, cols };
}

// ---------------- Component ----------------

type FilterKey = "all" | "critical" | "bottleneck" | "quest" | "risk" | "forgetting";

const FILTERS: { id: FilterKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "all",         label: "All",          icon: Compass },
  { id: "critical",    label: "Critical Path",icon: Flame },
  { id: "bottleneck",  label: "Bottlenecks",  icon: AlertTriangle },
  { id: "quest",       label: "In Quests",    icon: Crown },
  { id: "risk",        label: "At Risk",      icon: ShieldAlert },
  { id: "forgetting",  label: "Forgetting",   icon: AlarmClock },
];

export function AcademicMap({ initialConceptId, initialMode }: { initialConceptId?: string; initialMode?: MapMode }) {
  const { concepts, subjects, missions, bottlenecks, criticalPath } = useIntelligence();
  const [mode, setMode] = useState<MapMode>(initialMode ?? "knowledge");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [focusedSubject, setFocusedSubject] = useState<string | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(initialConceptId ?? null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const questIds = useMemo(() => {
    const s = new Set<string>();
    for (const m of missions) if (!m.completed) m.conceptIds.forEach((id) => s.add(id));
    return s;
  }, [missions]);

  const conceptsBySubject = useMemo(() => {
    const map: Record<string, DerivedConcept[]> = {};
    for (const c of concepts) (map[c.subjectId] ??= []).push(c);
    return map;
  }, [concepts]);

  const subjectLayouts = useMemo(() => {
    const out: Record<string, SubjectLayout> = {};
    for (const s of subjects) out[s.id] = buildSubjectLayout(conceptsBySubject[s.id] ?? [], questIds);
    return out;
  }, [subjects, conceptsBySubject, questIds]);

  const matchesFilter = (c: DerivedConcept): boolean => {
    switch (filter) {
      case "critical":   return c.isCriticalPath;
      case "bottleneck": return c.isBottleneck;
      case "quest":      return questIds.has(c.id);
      case "risk":       return c.risk >= 55;
      case "forgetting": return c.memory.predictedForgettingDays <= 5;
      default: return true;
    }
  };
  const queryLC = query.trim().toLowerCase();
  const matchesQuery = (c: DerivedConcept) => !queryLC || c.name.toLowerCase().includes(queryLC) || c.topic.toLowerCase().includes(queryLC);

  const selectedConcept = selectedConceptId ? concepts.find((c) => c.id === selectedConceptId) ?? null : null;
  const selectedSubject = selectedSubjectId ? subjects.find((s) => s.id === selectedSubjectId) ?? null : null;

  // Ranked sector list
  const rankedSubjects = useMemo(
    () => [...subjects].sort((a, b) => (b.academicWeight ?? 0) - (a.academicWeight ?? 0)),
    [subjects],
  );

  const focusedList = focusedSubject ? rankedSubjects.filter((s) => s.id === focusedSubject) : rankedSubjects;

  // Global ops stats
  const ops = useMemo(() => ({
    totalConcepts: concepts.length,
    bottlenecks: bottlenecks.length,
    critical: criticalPath.length,
    quests: questIds.size,
    forgetting: concepts.filter((c) => c.memory.predictedForgettingDays <= 5).length,
    highRisk: concepts.filter((c) => c.risk >= 65).length,
  }), [concepts, bottlenecks, criticalPath, questIds]);

  const onSelectConcept = (id: string) => {
    setSelectedConceptId(id);
    setSelectedSubjectId(null);
  };
  const onSelectSubject = (id: string) => {
    setSelectedSubjectId(id);
    setSelectedConceptId(null);
  };

  return (
    <div className="mt-4">
      {/* Command bar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <ModeBar mode={mode} setMode={setMode} />
        <div className="flex-1" />
        <FilterBar filter={filter} setFilter={setFilter} />
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search concepts…"
            className="h-8 pl-7 pr-2 text-xs rounded-md border border-border bg-card/60 w-44 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "260px minmax(0,1fr) 360px", height: "calc(100vh - 220px)", minHeight: 620 }}
      >
        {/* LEFT — Sectors */}
        <SectorList
          subjects={rankedSubjects}
          conceptsBySubject={conceptsBySubject}
          focusedSubject={focusedSubject}
          setFocusedSubject={setFocusedSubject}
          onSelectSubject={onSelectSubject}
          selectedSubjectId={selectedSubjectId}
          mode={mode}
        />

        {/* CENTER — Tactical canvas */}
        <div className="relative rounded-2xl border border-border bg-[radial-gradient(ellipse_at_top,hsl(220_30%_14%),hsl(220_30%_7%))] overflow-hidden flex flex-col">
          {/* Ops ticker */}
          <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-background/30 text-[10px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Radar className="h-3 w-3" /> Theater</span>
            <Pill icon={Network} label={`${ops.totalConcepts} nodes`} />
            <Pill icon={Flame} label={`${ops.critical} critical`} tone="violet" />
            <Pill icon={AlertTriangle} label={`${ops.bottlenecks} bottlenecks`} tone="orange" />
            <Pill icon={Crown} label={`${ops.quests} in quests`} tone="blue" />
            <Pill icon={AlarmClock} label={`${ops.forgetting} forgetting`} tone="red" />
            <Pill icon={ShieldAlert} label={`${ops.highRisk} high risk`} tone="red" />
            <div className="ml-auto flex items-center gap-1.5 text-muted-foreground">
              <Activity className="h-3 w-3" /> Mode: <span className="text-foreground font-semibold">{MODES.find(m => m.id === mode)!.label}</span>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-auto p-3">
            <div className={cn(
              focusedSubject ? "grid grid-cols-1" : "grid gap-3",
              !focusedSubject && "grid-cols-1 xl:grid-cols-2",
            )}>
              {focusedList.map((s) => (
                <SectorCard
                  key={s.id}
                  subject={s}
                  layout={subjectLayouts[s.id]}
                  mode={mode}
                  matchesFilter={matchesFilter}
                  matchesQuery={matchesQuery}
                  selectedConceptId={selectedConceptId}
                  onSelectConcept={onSelectConcept}
                  onSelectSubject={onSelectSubject}
                  focused={!!focusedSubject}
                  onToggleFocus={() => setFocusedSubject(focusedSubject === s.id ? null : s.id)}
                />
              ))}
              {focusedList.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-20">No sectors to display.</div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="border-t border-border bg-background/40 px-3 py-2 flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 uppercase tracking-wider text-muted-foreground"><Layers className="h-3 w-3" />Legend</span>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {LEGEND[mode].map((it) => (
                <span key={it.label} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ background: it.color }} />
                  {it.label}
                </span>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Crown className="h-3 w-3" /> bottleneck</span>
              <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" /> critical path</span>
              <span className="inline-flex items-center gap-1"><GitBranch className="h-3 w-3" /> prerequisite</span>
            </div>
          </div>
        </div>

        {/* RIGHT — Intelligence panel */}
        <IntelPanel
          mode={mode}
          ops={ops}
          subjects={rankedSubjects}
          concepts={concepts}
          bottlenecks={bottlenecks}
          criticalPath={criticalPath}
          selectedConcept={selectedConcept}
          selectedSubject={selectedSubject}
          onClose={() => { setSelectedConceptId(null); setSelectedSubjectId(null); }}
          onSelectConcept={onSelectConcept}
        />
      </div>
    </div>
  );
}

// ---------------- Mode + filter bars ----------------

function ModeBar({ mode, setMode }: { mode: MapMode; setMode: (m: MapMode) => void }) {
  return (
    <div className="inline-flex rounded-md border border-border bg-card/40 p-0.5">
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = mode === m.id;
        return (
          <button
            key={m.id} onClick={() => setMode(m.id)} title={m.desc}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors",
              active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function FilterBar({ filter, setFilter }: { filter: FilterKey; setFilter: (f: FilterKey) => void }) {
  return (
    <div className="inline-flex rounded-md border border-border bg-card/40 p-0.5">
      {FILTERS.map((f) => {
        const Icon = f.icon;
        const active = filter === f.id;
        return (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium",
              active ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground",
            )}>
            <Icon className="h-3 w-3" />
            <span>{f.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Pill({ icon: Icon, label, tone = "default" }: { icon: React.ComponentType<{ className?: string }>; label: string; tone?: "default" | "violet" | "blue" | "orange" | "red" }) {
  const c =
    tone === "violet" ? "text-violet-300 border-violet-500/30 bg-violet-500/10" :
    tone === "blue"   ? "text-sky-300 border-sky-500/30 bg-sky-500/10" :
    tone === "orange" ? "text-orange-300 border-orange-500/30 bg-orange-500/10" :
    tone === "red"    ? "text-rose-300 border-rose-500/30 bg-rose-500/10" :
                        "text-muted-foreground border-border bg-card/40";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px]", c)}>
      <Icon className="h-3 w-3" />{label}
    </span>
  );
}

// ---------------- Sector list (left rail) ----------------

function SectorList({
  subjects, conceptsBySubject, focusedSubject, setFocusedSubject, onSelectSubject, selectedSubjectId, mode,
}: {
  subjects: DerivedSubject[];
  conceptsBySubject: Record<string, DerivedConcept[]>;
  focusedSubject: string | null;
  setFocusedSubject: (id: string | null) => void;
  onSelectSubject: (id: string) => void;
  selectedSubjectId: string | null;
  mode: MapMode;
}) {
  return (
    <aside className="rounded-2xl border border-border bg-card/40 flex flex-col overflow-hidden">
      <header className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Compass className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Sectors</span>
        <span className="ml-auto text-[10px] text-muted-foreground">{subjects.length}</span>
      </header>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {subjects.map((s) => {
          const list = conceptsBySubject[s.id] ?? [];
          const weak = list.filter((c) => c.mastery < 60).length;
          const risky = list.filter((c) => c.risk >= 55).length;
          const focused = focusedSubject === s.id;
          const selected = selectedSubjectId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => { onSelectSubject(s.id); if (focusedSubject && !focused) setFocusedSubject(s.id); }}
              onDoubleClick={() => setFocusedSubject(focused ? null : s.id)}
              className={cn(
                "w-full text-left rounded-lg border p-2 transition-colors",
                selected ? "border-primary/60 bg-primary/10" : "border-border/60 bg-background/30 hover:border-border",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                <span className="text-xs font-semibold truncate flex-1">{s.name}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setFocusedSubject(focused ? null : s.id); }}
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                  title={focused ? "Exit focus" : "Focus sector"}
                >
                  {focused ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-4 gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                <Vital label="Mast" value={s.mastery} tone={s.mastery >= 70 ? "g" : s.mastery >= 45 ? "w" : "b"} />
                <Vital label="Risk" value={s.risk} tone={s.risk >= 65 ? "b" : s.risk >= 40 ? "w" : "g"} />
                <Vital label="ROI"  value={s.roi}  tone={s.roi >= 65 ? "g" : s.roi >= 40 ? "w" : "b"} />
                <Vital label="Rdy"  value={s.readiness} tone={s.readiness >= 70 ? "g" : s.readiness >= 45 ? "w" : "b"} />
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>{list.length} nodes</span>
                {weak > 0 && <span className="text-amber-400">{weak} weak</span>}
                {risky > 0 && <span className="text-rose-400">{risky} risky</span>}
                {s.daysToAssessment !== undefined && s.daysToAssessment <= 14 && (
                  <span className="ml-auto inline-flex items-center gap-1 text-rose-300">
                    <ClipboardCheck className="h-3 w-3" /> {s.daysToAssessment}d
                  </span>
                )}
              </div>
              {/* Strength bar in current mode */}
              <div className="mt-1.5 h-1 rounded-full bg-background overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${mode === "risk" ? s.risk : mode === "roi" ? s.roi : mode === "memory" ? s.memory : mode === "assessment" ? s.readiness : s.mastery}%`,
                    background: s.color,
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>
      <footer className="px-3 py-2 border-t border-border text-[10px] text-muted-foreground">
        Double-click to focus a sector.
      </footer>
    </aside>
  );
}

function Vital({ label, value, tone }: { label: string; value: number; tone: "g" | "w" | "b" }) {
  const c = tone === "g" ? "text-emerald-400" : tone === "w" ? "text-amber-400" : "text-rose-400";
  return (
    <div className="rounded bg-background/40 border border-border/40 px-1 py-0.5">
      <div className="text-[8px]">{label}</div>
      <div className={cn("text-[11px] font-bold tabular-nums", c)}>{value}</div>
    </div>
  );
}

// ---------------- Sector card (a subject region with layered DAG) ----------------

function SectorCard({
  subject, layout, mode, matchesFilter, matchesQuery, selectedConceptId, onSelectConcept, onSelectSubject, focused, onToggleFocus,
}: {
  subject: DerivedSubject;
  layout: SubjectLayout | undefined;
  mode: MapMode;
  matchesFilter: (c: DerivedConcept) => boolean;
  matchesQuery: (c: DerivedConcept) => boolean;
  selectedConceptId: string | null;
  onSelectConcept: (id: string) => void;
  onSelectSubject: (id: string) => void;
  focused: boolean;
  onToggleFocus: () => void;
}) {
  if (!layout || layout.tiles.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/40 p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: subject.color }} /><span className="font-semibold text-foreground">{subject.name}</span></div>
        <div className="mt-2">No concepts mapped yet.</div>
      </div>
    );
  }

  const cellW = focused ? 200 : 150;
  const cellH = focused ? 56 : 42;
  const gapX = 22;
  const gapY = 8;
  const rowsPerCol = Math.max(...Array.from({ length: layout.cols }, (_, col) => layout.tiles.filter((t) => t.col === col).length));
  const width = layout.cols * cellW + (layout.cols - 1) * gapX + 24;
  const height = rowsPerCol * cellH + (rowsPerCol - 1) * gapY + 24;

  // tile positions
  const pos = (t: LayoutTile) => ({
    x: 12 + t.col * (cellW + gapX),
    y: 12 + t.row * (cellH + gapY),
    w: cellW,
    h: cellH,
  });

  return (
    <motion.div
      layout
      className={cn(
        "relative rounded-xl border bg-gradient-to-br from-card/80 to-card/40 overflow-hidden",
        focused ? "border-primary/40" : "border-border",
      )}
    >
      {/* Sector header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/40 cursor-pointer"
        onClick={() => onSelectSubject(subject.id)}
      >
        <span className="h-3 w-3 rounded-sm" style={{ background: subject.color, boxShadow: `0 0 12px ${subject.color}66` }} />
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{subject.code} · Sector</div>
          <div className="text-sm font-semibold truncate">{subject.name}</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <ChipMini label="Mast" value={subject.mastery} />
          <ChipMini label="Risk" value={subject.risk} alarm={subject.risk >= 65} />
          <ChipMini label="ROI"  value={subject.roi} />
          {subject.daysToAssessment !== undefined && (
            <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-300">
              <ClipboardCheck className="h-3 w-3" />{subject.daysToAssessment}d
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFocus(); }}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
            title={focused ? "Exit focus" : "Focus"}
          >
            {focused ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Tactical grid */}
      <div className="p-3 overflow-auto">
        <div className="relative" style={{ width, height }}>
          {/* layer column guides */}
          <svg className="absolute inset-0" width={width} height={height} style={{ pointerEvents: "none" }}>
            {Array.from({ length: layout.cols }).map((_, col) => (
              <g key={col}>
                <line
                  x1={12 + col * (cellW + gapX) + cellW / 2}
                  x2={12 + col * (cellW + gapX) + cellW / 2}
                  y1={4} y2={height - 4}
                  stroke="hsl(220 9% 60% / 0.06)" strokeDasharray="2 4"
                />
                <text x={12 + col * (cellW + gapX) + cellW / 2} y={height - 2} textAnchor="middle"
                      fill="hsl(220 9% 60% / 0.5)" fontSize={8} fontFamily="ui-monospace, monospace">
                  L{col}
                </text>
              </g>
            ))}

            {/* prerequisite arrows */}
            {layout.tiles.flatMap((t) =>
              t.c.prerequisiteIds.map((pid) => {
                const from = layout.byId[pid];
                if (!from) return null;
                const a = pos(from);
                const b = pos(t);
                const x1 = a.x + a.w;
                const y1 = a.y + a.h / 2;
                const x2 = b.x;
                const y2 = b.y + b.h / 2;
                const mx = (x1 + x2) / 2;
                const hot = t.c.isCriticalPath && from.c.isCriticalPath;
                const sel = selectedConceptId && (t.c.id === selectedConceptId || from.c.id === selectedConceptId);
                return (
                  <path
                    key={`${pid}-${t.c.id}`}
                    d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={sel ? "hsl(0 0% 100% / 0.8)" : hot ? "hsl(0 80% 65% / 0.6)" : "hsl(220 9% 60% / 0.25)"}
                    strokeWidth={sel ? 1.8 : hot ? 1.4 : 1}
                  />
                );
              })
            )}
          </svg>

          {/* tiles */}
          {layout.tiles.map((t) => {
            const p = pos(t);
            const visible = matchesFilter(t.c) && matchesQuery(t.c);
            const color = colorForConcept(t.c, mode, t.inQuest);
            const selected = selectedConceptId === t.c.id;
            return (
              <button
                key={t.c.id}
                onClick={(e) => { e.stopPropagation(); onSelectConcept(t.c.id); }}
                className={cn(
                  "absolute group rounded-md border text-left transition-all",
                  selected ? "ring-2 ring-white shadow-lg z-10" : "",
                  visible ? "opacity-100" : "opacity-25",
                )}
                style={{
                  left: p.x, top: p.y, width: p.w, height: p.h,
                  background: `linear-gradient(135deg, ${color}26, ${color}0a)`,
                  borderColor: t.c.isCriticalPath ? "hsl(0 80% 65% / 0.7)" : t.c.isBottleneck ? "hsl(28 92% 56% / 0.7)" : `${color}55`,
                  boxShadow: t.inQuest ? `0 0 0 1.5px ${TONE.violet}aa, 0 0 14px ${TONE.violet}44` : undefined,
                }}
                title={`${t.c.name} — ${t.c.topic}`}
              >
                {/* importance vertical bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md" style={{ background: color }} />
                <div className="pl-2 pr-1 py-1 h-full flex flex-col justify-between">
                  <div className="flex items-center gap-1 min-w-0">
                    {t.c.isBottleneck && <Crown className="h-2.5 w-2.5 text-amber-400 shrink-0" />}
                    {t.c.isCriticalPath && <Flame className="h-2.5 w-2.5 text-rose-400 shrink-0" />}
                    <span className={cn("truncate font-semibold", focused ? "text-xs" : "text-[10px]")}>{t.c.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] tabular-nums text-muted-foreground">
                    <span style={{ color }}>{
                      mode === "risk" ? `R${t.c.risk}` :
                      mode === "roi" ? `V${t.c.roi}` :
                      mode === "memory" ? `M${t.c.memoryStrength}` :
                      mode === "discipline" ? `${t.c.daysSinceReview}d` :
                      mode === "forecast" ? `${t.c.memory.predictedForgettingDays}d` :
                      mode === "assessment" ? `${Math.round(t.c.mastery * 0.6 + t.c.memoryStrength * 0.4)}` :
                      `${t.c.mastery}`
                    }</span>
                    <span>·</span>
                    <span>I{t.c.importance}</span>
                    {t.c.dependentIds.length > 0 && (
                      <span className="ml-auto inline-flex items-center gap-0.5"><GitBranch className="h-2.5 w-2.5" />{t.c.dependentIds.length}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function ChipMini({ label, value, alarm }: { label: string; value: number; alarm?: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] tabular-nums",
      alarm ? "border-rose-500/40 bg-rose-500/10 text-rose-300" : "border-border bg-background/40 text-muted-foreground",
    )}>
      <span className="uppercase tracking-wider">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </span>
  );
}

// ---------------- Intelligence panel ----------------

function IntelPanel({
  mode, ops, subjects, concepts, bottlenecks, criticalPath, selectedConcept, selectedSubject, onClose, onSelectConcept,
}: {
  mode: MapMode;
  ops: { totalConcepts: number; bottlenecks: number; critical: number; quests: number; forgetting: number; highRisk: number };
  subjects: DerivedSubject[];
  concepts: DerivedConcept[];
  bottlenecks: { conceptId: string; conceptName: string }[];
  criticalPath: DerivedConcept[];
  selectedConcept: DerivedConcept | null;
  selectedSubject: DerivedSubject | null;
  onClose: () => void;
  onSelectConcept: (id: string) => void;
}) {
  const navigate = useNavigate();
  const launch = useSessionStore((s) => s.launch);

  return (
    <aside className="rounded-2xl border border-border bg-card/40 flex flex-col overflow-hidden">
      <header className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Radar className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Intelligence</span>
        {(selectedConcept || selectedSubject) && (
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-muted text-muted-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <AnimatePresence mode="wait">
          {selectedConcept ? (
            <ConceptIntel key={selectedConcept.id} c={selectedConcept} concepts={concepts}
              onLaunch={() => { const bp = blueprintFromConcept(selectedConcept.id); if (bp) { launch(bp); navigate({ to: "/session" }); } }}
              onDetails={() => navigate({ to: "/concepts/$id", params: { id: selectedConcept.id } })}
              onSelectConcept={onSelectConcept}
            />
          ) : selectedSubject ? (
            <SubjectIntel key={selectedSubject.id} s={selectedSubject}
              onLaunch={() => { const bp = blueprintFromSubject(selectedSubject.id); if (bp) { launch(bp); navigate({ to: "/session" }); } }}
              onDetails={() => navigate({ to: "/subjects/$id", params: { id: selectedSubject.id } })}
            />
          ) : (
            <OpsIntel key="ops" mode={mode} ops={ops} subjects={subjects} bottlenecks={bottlenecks} criticalPath={criticalPath} onSelectConcept={onSelectConcept} />
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}

function OpsIntel({
  mode, ops, subjects, bottlenecks, criticalPath, onSelectConcept,
}: {
  mode: MapMode;
  ops: { totalConcepts: number; bottlenecks: number; critical: number; quests: number; forgetting: number; highRisk: number };
  subjects: DerivedSubject[];
  bottlenecks: { conceptId: string; conceptName: string }[];
  criticalPath: DerivedConcept[];
  onSelectConcept: (id: string) => void;
}) {
  const topRisk = [...subjects].sort((a, b) => b.risk - a.risk).slice(0, 3);
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Theater Vitals</div>
        <div className="grid grid-cols-2 gap-1.5">
          <MetricBox label="Nodes" value={ops.totalConcepts} />
          <MetricBox label="Critical" value={ops.critical} tone="violet" />
          <MetricBox label="Bottlenecks" value={ops.bottlenecks} tone="orange" />
          <MetricBox label="In Quests" value={ops.quests} tone="blue" />
          <MetricBox label="Forgetting" value={ops.forgetting} tone="red" />
          <MetricBox label="High Risk" value={ops.highRisk} tone="red" />
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Most at-risk sectors</div>
        <div className="space-y-1">
          {topRisk.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-xs rounded border border-border/60 bg-background/40 px-2 py-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
              <span className="truncate flex-1">{s.name}</span>
              <span className="tabular-nums text-rose-400 font-semibold">{s.risk}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Top bottlenecks</div>
        <div className="space-y-1">
          {bottlenecks.slice(0, 5).map((b) => (
            <button key={b.conceptId} onClick={() => onSelectConcept(b.conceptId)}
              className="w-full text-left flex items-center gap-2 text-xs rounded border border-border/60 bg-background/40 px-2 py-1.5 hover:border-primary/40">
              <Crown className="h-3 w-3 text-amber-400" />
              <span className="truncate flex-1">{b.conceptName}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
          {bottlenecks.length === 0 && <div className="text-xs text-muted-foreground">No bottlenecks detected.</div>}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1"><Flame className="h-3 w-3" />Critical path</div>
        <div className="space-y-1">
          {criticalPath.slice(0, 5).map((c) => (
            <button key={c.id} onClick={() => onSelectConcept(c.id)}
              className="w-full text-left flex items-center gap-2 text-xs rounded border border-border/60 bg-background/40 px-2 py-1.5 hover:border-primary/40">
              <Flame className="h-3 w-3 text-rose-400" />
              <span className="truncate flex-1">{c.name}</span>
              <span className="text-[10px] text-muted-foreground">{c.subjectName}</span>
            </button>
          ))}
          {criticalPath.length === 0 && <div className="text-xs text-muted-foreground">No critical path identified.</div>}
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground border-t border-border/60 pt-2">
        Active perspective: <span className="text-foreground font-semibold">{MODES.find(m => m.id === mode)!.label}</span> — {MODES.find(m => m.id === mode)!.desc}.
      </div>
    </motion.div>
  );
}

function ConceptIntel({
  c, concepts, onLaunch, onDetails, onSelectConcept,
}: {
  c: DerivedConcept;
  concepts: DerivedConcept[];
  onLaunch: () => void;
  onDetails: () => void;
  onSelectConcept: (id: string) => void;
}) {
  const byId = useMemo(() => new Map(concepts.map((x) => [x.id, x])), [concepts]);
  return (
    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-3">
      <div className="rounded-lg border border-border bg-background/40 p-2.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.subjectName} · {c.topic}</div>
        <div className="text-sm font-bold leading-tight">{c.name}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {c.isCriticalPath && <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1"><Flame className="h-2.5 w-2.5" />Critical path</span>}
          {c.isBottleneck && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1"><Crown className="h-2.5 w-2.5" />Bottleneck</span>}
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-background/40 border border-border capitalize">{c.status}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-background/40 border border-border">Importance {c.importance}/10</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <MetricBox label="Mastery" value={c.mastery} tone={c.mastery >= 70 ? "good" : c.mastery >= 45 ? "warn" : "bad"} />
        <MetricBox label="Memory" value={c.memoryStrength} tone={c.memoryStrength >= 70 ? "good" : c.memoryStrength >= 45 ? "warn" : "bad"} />
        <MetricBox label="Risk" value={c.risk} tone={c.risk >= 65 ? "bad" : c.risk >= 40 ? "warn" : "good"} />
        <MetricBox label="ROI" value={c.roi} tone={c.roi >= 65 ? "good" : c.roi >= 40 ? "warn" : "bad"} />
      </div>

      <Section title="Knowledge Graph">
        <Row label="Prereqs" value={`${c.prerequisiteIds.length} direct · ${c.dependencyCount} upstream`} />
        <Row label="Dependents" value={`${c.dependentIds.length} direct · ${c.downstreamCount} downstream`} />
        <Row label="Structural value" value={`${c.structuralImportance}/100`} />
        <Row label="Unlock potential" value={`${c.unlockPotential}/100`} />
      </Section>

      {c.prerequisiteIds.length > 0 && (
        <Section title="Build from">
          <div className="space-y-1">
            {c.prerequisiteIds.slice(0, 5).map((id) => {
              const p = byId.get(id); if (!p) return null;
              return (
                <button key={id} onClick={() => onSelectConcept(id)}
                  className="w-full text-left flex items-center gap-2 text-xs rounded border border-border/60 bg-background/40 px-2 py-1 hover:border-primary/40">
                  <ChevronRight className="h-3 w-3 rotate-180 text-muted-foreground" />
                  <span className="truncate flex-1">{p.name}</span>
                  <span className="tabular-nums text-muted-foreground text-[10px]">{p.mastery}</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {c.dependentIds.length > 0 && (
        <Section title="Unlocks">
          <div className="space-y-1">
            {c.dependentIds.slice(0, 5).map((id) => {
              const p = byId.get(id); if (!p) return null;
              return (
                <button key={id} onClick={() => onSelectConcept(id)}
                  className="w-full text-left flex items-center gap-2 text-xs rounded border border-border/60 bg-background/40 px-2 py-1 hover:border-primary/40">
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate flex-1">{p.name}</span>
                  <span className="tabular-nums text-muted-foreground text-[10px]">{p.mastery}</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Memory forecast">
        <Row label="Predicted forgetting" value={`${c.memory.predictedForgettingDays}d · ${c.memory.predictedForgettingDate}`} />
        <Row label="Stability" value={`${c.memory.stability}/100`} />
        <Row label="Days since review" value={`${c.daysSinceReview}d`} />
      </Section>

      <Section title="Why this matters">
        {(c.roiContributors.length ? c.roiContributors : ["No notable drivers."]).slice(0, 3).map((r, i) => (
          <div key={i} className="text-[11px] text-muted-foreground">• {r}</div>
        ))}
      </Section>

      <div className="flex gap-2 sticky bottom-0">
        <button onClick={onLaunch} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold py-2 hover:bg-primary/90">
          <Target className="h-3.5 w-3.5" /> Strike
        </button>
        <button onClick={onDetails} className="rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted">
          Details
        </button>
      </div>
    </motion.div>
  );
}

function SubjectIntel({ s, onLaunch, onDetails }: { s: DerivedSubject; onLaunch: () => void; onDetails: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-3">
      <div className="rounded-lg border border-border bg-background/40 p-2.5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ background: s.color, boxShadow: `0 0 10px ${s.color}88` }} />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.code} · Sector</div>
            <div className="text-sm font-bold leading-tight truncate">{s.name}</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <MetricBox label="Mastery" value={s.mastery} tone={s.mastery >= 70 ? "good" : s.mastery >= 45 ? "warn" : "bad"} />
        <MetricBox label="Memory" value={s.memory} tone={s.memory >= 70 ? "good" : s.memory >= 45 ? "warn" : "bad"} />
        <MetricBox label="Risk" value={s.risk} tone={s.risk >= 65 ? "bad" : s.risk >= 40 ? "warn" : "good"} />
        <MetricBox label="ROI" value={s.roi} tone={s.roi >= 65 ? "good" : s.roi >= 40 ? "warn" : "bad"} />
        <MetricBox label="Readiness" value={s.readiness} tone={s.readiness >= 70 ? "good" : s.readiness >= 45 ? "warn" : "bad"} />
        <MetricBox label="Weight" value={s.academicWeight} />
      </div>
      <Section title="Sector status">
        <Row label="Concepts" value={`${s.concepts} (${s.weakConcepts} weak)`} />
        <Row label="Credits" value={`${s.credits}`} />
        <Row label="Heaviest" value={`${s.heaviestAssessment.kind} · ${Math.round(s.heaviestAssessment.weight * 100)}%`} />
        {s.daysToAssessment !== undefined && <Row label="Next assessment" value={`${s.daysToAssessment}d`} />}
        <Row label="Predicted score" value={`${s.predictedScore.low}–${s.predictedScore.high}`} />
      </Section>
      <div className="flex gap-2">
        <button onClick={onLaunch} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold py-2 hover:bg-primary/90">
          <Zap className="h-3.5 w-3.5" /> Launch sector session
        </button>
        <button onClick={onDetails} className="rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted">
          Open
        </button>
      </div>
    </motion.div>
  );
}

function MetricBox({ label, value, tone }: { label: string; value: number; tone?: "good" | "warn" | "bad" | "violet" | "blue" | "orange" | "red" }) {
  const c =
    tone === "good"   ? "text-emerald-400" :
    tone === "warn"   ? "text-amber-400" :
    tone === "bad"    ? "text-rose-400" :
    tone === "violet" ? "text-violet-300" :
    tone === "blue"   ? "text-sky-300" :
    tone === "orange" ? "text-orange-300" :
    tone === "red"    ? "text-rose-300" :
                        "text-foreground";
  return (
    <div className="rounded-md border border-border bg-background/40 p-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-lg font-bold tabular-nums leading-none mt-0.5", c)}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default AcademicMap;
