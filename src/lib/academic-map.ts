// Academic Map — derives a graph layout from existing intelligence engines.
// Pure derivation, no new intelligence. Subjects act as cluster centres,
// concepts orbit their subject grouped by topic, edges = prerequisites.

import { useMemo } from "react";
import { useIntelligence, type DerivedConcept, type DerivedSubject } from "./intelligence";

export type MapMode =
  | "knowledge" | "memory" | "risk" | "roi" | "quest" | "discipline" | "assessment" | "forecast";

export interface MapNode {
  id: string;
  kind: "subject" | "concept";
  label: string;
  x: number;
  y: number;
  r: number;          // radius in SVG units
  color: string;      // hsl/var
  ring?: string;      // outline color (alerts)
  subjectId: string;
  subjectColor: string;
  topic?: string;
  concept?: DerivedConcept;
  subject?: DerivedSubject;
}

export interface MapEdge {
  id: string;
  from: string;
  to: string;
  kind: "prereq" | "structure";
  highlight?: boolean;
}

export interface MapBundle {
  nodes: MapNode[];
  edges: MapEdge[];
  width: number;
  height: number;
  byId: Record<string, MapNode>;
  conceptsBySubject: Record<string, DerivedConcept[]>;
}

const W = 1800;
const H = 1200;

// Status-driven colors via CSS vars defined in styles.css
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

function colorForMastery(m: number, started: boolean): string {
  if (!started) return TONE.gray;
  if (m >= 80) return TONE.emerald;
  if (m >= 60) return TONE.amber;
  if (m >= 40) return TONE.orange;
  return TONE.red;
}
function colorForRisk(r: number): string {
  if (r >= 75) return TONE.red;
  if (r >= 55) return TONE.orange;
  if (r >= 35) return TONE.amber;
  return TONE.emerald;
}
function colorForRoi(roi: number): string {
  if (roi >= 75) return TONE.violet;
  if (roi >= 55) return TONE.blue;
  if (roi >= 35) return TONE.cyan;
  return TONE.gray;
}
function colorForForecast(days: number): string {
  if (days <= 2) return TONE.red;
  if (days <= 5) return TONE.orange;
  if (days <= 10) return TONE.amber;
  return TONE.emerald;
}
function colorForDiscipline(daysSince: number): string {
  if (daysSince >= 14) return TONE.red;
  if (daysSince >= 7) return TONE.orange;
  if (daysSince >= 3) return TONE.amber;
  return TONE.emerald;
}

function styleConcept(c: DerivedConcept, mode: MapMode, missionConceptIds: Set<string>):
  { color: string; r: number; ring?: string } {
  const started = c.reviewCount > 0 || c.mastery > 0;
  const importance = c.importance; // 1–10
  const base = 8 + importance * 1.2;
  switch (mode) {
    case "knowledge":
      return { color: colorForMastery(c.mastery, started), r: base + c.structuralImportance * 0.05 };
    case "memory":
      return { color: colorForMastery(c.memoryStrength, started), r: base };
    case "risk":
      return { color: colorForRisk(c.risk), r: 8 + c.risk * 0.12, ring: c.isBottleneck ? TONE.red : undefined };
    case "roi":
      return { color: colorForRoi(c.roi), r: 8 + c.roi * 0.14 };
    case "quest": {
      const inQuest = missionConceptIds.has(c.id);
      const onPath = c.isCriticalPath;
      return {
        color: inQuest ? TONE.violet : onPath ? TONE.blue : TONE.gray,
        r: base + (inQuest ? 6 : 0),
        ring: inQuest ? TONE.violet : undefined,
      };
    }
    case "discipline":
      return { color: colorForDiscipline(c.daysSinceReview), r: base, ring: c.daysSinceReview >= 10 ? TONE.orange : undefined };
    case "assessment":
      return {
        color: colorForMastery(c.mastery * 0.6 + c.memoryStrength * 0.4, started),
        r: 8 + importance * 1.4,
      };
    case "forecast":
      return { color: colorForForecast(c.memory.predictedForgettingDays), r: base, ring: c.memory.predictedForgettingDays <= 3 ? TONE.red : undefined };
  }
}

export function useAcademicMap(mode: MapMode): MapBundle {
  const { concepts, subjects, missions } = useIntelligence();

  return useMemo(() => {
    const cx = W / 2;
    const cy = H / 2;
    const subjectRing = Math.min(W, H) * 0.34;

    const conceptsBySubject: Record<string, DerivedConcept[]> = {};
    for (const c of concepts) {
      (conceptsBySubject[c.subjectId] ??= []).push(c);
    }

    const missionConceptIds = new Set<string>();
    for (const m of missions) if (!m.completed) m.conceptIds.forEach((id) => missionConceptIds.add(id));

    const nodes: MapNode[] = [];
    const byId: Record<string, MapNode> = {};
    const N = Math.max(1, subjects.length);

    subjects.forEach((s, i) => {
      const theta = (i / N) * Math.PI * 2 - Math.PI / 2;
      const sx = cx + Math.cos(theta) * subjectRing;
      const sy = cy + Math.sin(theta) * subjectRing;

      const subjectNode: MapNode = {
        id: `subj:${s.id}`,
        kind: "subject",
        label: s.name,
        x: sx,
        y: sy,
        r: 26 + Math.min(20, s.concepts * 0.6),
        color: s.color,
        subjectId: s.id,
        subjectColor: s.color,
        subject: s,
      };
      nodes.push(subjectNode);
      byId[subjectNode.id] = subjectNode;

      const list = conceptsBySubject[s.id] ?? [];
      // Group concepts by topic and lay them out in concentric ring slices around subject center.
      const byTopic = new Map<string, DerivedConcept[]>();
      for (const c of list) {
        const t = c.topic || "General";
        if (!byTopic.has(t)) byTopic.set(t, []);
        byTopic.get(t)!.push(c);
      }
      const topics = Array.from(byTopic.entries());
      const baseRadius = 90;
      const ringStep = 46;
      topics.forEach(([topic, items], ti) => {
        const ringR = baseRadius + ti * ringStep;
        const slots = items.length;
        const arcSpan = Math.min(Math.PI * 1.6, 0.6 + slots * 0.18);
        items.forEach((c, j) => {
          const t = slots === 1 ? 0 : (j / (slots - 1) - 0.5);
          const localAngle = theta + t * arcSpan;
          const x = sx + Math.cos(localAngle) * ringR;
          const y = sy + Math.sin(localAngle) * ringR;
          const styled = styleConcept(c, mode, missionConceptIds);
          const node: MapNode = {
            id: `con:${c.id}`,
            kind: "concept",
            label: c.name,
            x, y,
            r: styled.r,
            color: styled.color,
            ring: styled.ring,
            subjectId: s.id,
            subjectColor: s.color,
            topic,
            concept: c,
          };
          nodes.push(node);
          byId[node.id] = node;
        });
      });
    });

    const edges: MapEdge[] = [];
    for (const c of concepts) {
      for (const pid of c.prerequisiteIds) {
        const from = byId[`con:${pid}`];
        const to = byId[`con:${c.id}`];
        if (!from || !to) continue;
        edges.push({
          id: `e:${pid}->${c.id}`,
          from: from.id,
          to: to.id,
          kind: "prereq",
          highlight: c.isCriticalPath && from.concept?.isCriticalPath,
        });
      }
    }

    return { nodes, edges, width: W, height: H, byId, conceptsBySubject };
  }, [concepts, subjects, missions, mode]);
}

export function findUpstreamChain(target: DerivedConcept, all: DerivedConcept[]): Set<string> {
  const map = new Map(all.map((c) => [c.id, c]));
  const visited = new Set<string>();
  const stack: string[] = [target.id];
  while (stack.length) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const c = map.get(id);
    if (!c) continue;
    for (const p of c.prerequisiteIds) stack.push(p);
  }
  return visited;
}

export function findDownstreamChain(target: DerivedConcept, all: DerivedConcept[]): Set<string> {
  const map = new Map(all.map((c) => [c.id, c]));
  const visited = new Set<string>();
  const stack: string[] = [target.id];
  while (stack.length) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const c = map.get(id);
    if (!c) continue;
    for (const d of c.dependentIds) stack.push(d);
  }
  return visited;
}
