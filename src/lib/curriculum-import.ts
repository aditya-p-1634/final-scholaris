// Curriculum import — turns the reviewed draft into a real Scholaris workspace:
// subjects (with credits + assessment weights), units (topics table), concepts,
// inferred prerequisite edges (knowledge graph), and an initial progress state
// that seeds Mastery / Memory / Risk / Momentum / Missions instead of zero.

import { supabase } from "@/integrations/supabase/client";
import type {
  CurriculumDraft,
  ImportSubject,
  SubjectProgress,
  UnitCoverage,
} from "./curriculum";

const PALETTE = [
  "oklch(0.72 0.16 250)",
  "oklch(0.72 0.16 155)",
  "oklch(0.78 0.16 75)",
  "oklch(0.65 0.22 320)",
  "oklch(0.62 0.22 25)",
  "oklch(0.70 0.10 200)",
];

export interface ImportSummary {
  subjects: number;
  units: number;
  topics: number;
  concepts: number;
  prerequisites: number;
  creditsAssigned: number;
  progressInitialized: number;
}

export interface ImportProfileMeta {
  board?: string;
  program?: string;
  semester?: string;
}

// Effective state for a concept: unit coverage takes priority, else subject progress.
type EffectiveState = "done" | "partial" | "fresh";

function effectiveState(progress: SubjectProgress, coverage: UnitCoverage): EffectiveState {
  if (coverage === "covered") return "done";
  if (coverage === "partial") return "partial";
  if (coverage === "not_covered") {
    // No explicit unit coverage signal — fall back to subject-level progress.
    if (progress === "completed") return "done";
    if (progress === "in_progress") return "partial";
    return "fresh";
  }
  return "fresh";
}

// Initial concept signal so the intelligence engine starts from reality.
function conceptSeed(state: EffectiveState, idx: number) {
  if (state === "done") {
    return {
      mastery: 80 + (idx % 3) * 3,
      memory_strength: 76 + (idx % 4) * 2,
      review_count: 4,
      successful_recalls: 5,
      failed_recalls: 1,
      last_reviewed_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    };
  }
  if (state === "partial") {
    return {
      mastery: 46 + (idx % 4) * 3,
      memory_strength: 44 + (idx % 4) * 3,
      review_count: 2,
      successful_recalls: 2,
      failed_recalls: 1,
      last_reviewed_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    };
  }
  return {
    mastery: 12 + (idx % 3) * 3,
    memory_strength: 18 + (idx % 3) * 3,
    review_count: 0,
    successful_recalls: 0,
    failed_recalls: 0,
    last_reviewed_at: null as string | null,
  };
}

function baselineFor(progress: SubjectProgress): number {
  if (progress === "completed") return 80;
  if (progress === "in_progress") return 50;
  return 25;
}

interface PendingConcept {
  name: string;
  state: EffectiveState;
  topicId: string | null;
}

export async function importCurriculum(
  draft: CurriculumDraft,
  meta?: ImportProfileMeta,
): Promise<ImportSummary> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Not authenticated");

  const summary: ImportSummary = {
    subjects: 0,
    units: 0,
    topics: 0,
    concepts: 0,
    prerequisites: 0,
    creditsAssigned: 0,
    progressInitialized: 0,
  };

  // name (lowercased) -> concept id, for prerequisite resolution across subjects.
  const conceptIdByName = new Map<string, string>();

  for (let si = 0; si < draft.subjects.length; si++) {
    const s: ImportSubject = draft.subjects[si];
    const { data: subjRow, error: subjErr } = await supabase
      .from("subjects")
      .insert({
        user_id: userId,
        name: s.name,
        code: s.code ?? "",
        color: PALETTE[si % PALETTE.length],
        exam_weight: 0.5,
        strategic_value: 70,
        hours_this_week: 0,
        baseline_mastery: baselineFor(s.progress),
        rank: si + 1,
        credits: s.credits,
        midterm_weight: s.assessmentWeights.midterm,
        final_weight: s.assessmentWeights.final,
        assignment_weight: s.assessmentWeights.assignment,
        lab_weight: s.assessmentWeights.lab,
        project_weight: s.assessmentWeights.project,
      })
      .select("id")
      .single();
    if (subjErr || !subjRow) continue;
    summary.subjects += 1;
    summary.creditsAssigned += s.credits;
    const subjectId = subjRow.id;

    const pending: PendingConcept[] = [];

    for (let ui = 0; ui < s.units.length; ui++) {
      const u = s.units[ui];
      const state = effectiveState(s.progress, u.coverage);
      // Each unit becomes a topics-table row (the structural grouping).
      const { data: topicRow } = await supabase
        .from("topics")
        .insert({ user_id: userId, subject_id: subjectId, name: u.name, ordinal: ui + 1 })
        .select("id")
        .single();
      summary.units += 1;
      const topicId = topicRow?.id ?? null;

      if (u.topics.length === 0) {
        pending.push({ name: u.name, state, topicId });
        continue;
      }
      for (const t of u.topics) {
        summary.topics += 1;
        if (t.concepts.length === 0) {
          pending.push({ name: t.name, state, topicId });
        } else {
          for (const c of t.concepts) {
            pending.push({ name: c.name, state, topicId });
          }
        }
      }
    }

    // Subject with no units at all — still make it learnable.
    if (s.units.length === 0) {
      pending.push({ name: s.name, state: effectiveState(s.progress, "not_covered"), topicId: null });
    }

    if (pending.length) {
      const rows = pending.map((p, idx) => {
        const seed = conceptSeed(p.state, idx);
        if (p.state !== "fresh") summary.progressInitialized += 1;
        return {
          user_id: userId,
          subject_id: subjectId,
          topic_id: p.topicId,
          name: p.name,
          importance: 6 + (idx % 4),
          decay_rate: 0.1,
          ...seed,
        };
      });
      const { data: inserted } = await supabase
        .from("concepts")
        .insert(rows)
        .select("id, name");
      for (const row of inserted ?? []) {
        summary.concepts += 1;
        const key = (row.name as string).toLowerCase();
        if (!conceptIdByName.has(key)) conceptIdByName.set(key, row.id);
      }
    }
  }

  // Knowledge graph — inferred prerequisite edges (concept_id depends on prerequisite_id).
  const edgeRows: { user_id: string; concept_id: string; prerequisite_id: string }[] = [];
  const seen = new Set<string>();
  for (const p of draft.prerequisites) {
    const fromId = conceptIdByName.get(p.from.toLowerCase());
    const toId = conceptIdByName.get(p.to.toLowerCase());
    if (!fromId || !toId || fromId === toId) continue;
    const key = `${toId}:${fromId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edgeRows.push({ user_id: userId, concept_id: toId, prerequisite_id: fromId });
  }
  if (edgeRows.length) {
    const { error } = await supabase.from("concept_prerequisites").insert(edgeRows);
    if (!error) summary.prerequisites = edgeRows.length;
  }

  // Mark onboarding complete so the app routes into the workspace.
  await supabase.from("profiles").upsert(
    {
      id: userId,
      board: meta?.board ?? null,
      program: meta?.program ?? null,
      semester: meta?.semester ?? null,
      onboarded_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  return summary;
}
