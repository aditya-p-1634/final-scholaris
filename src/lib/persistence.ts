// Persistence layer — read/write the Scholaris academic data
// in Lovable Cloud. Intelligence calculations stay in src/lib/intelligence.ts;
// this module only moves raw concept-level state and activity logs.

import { supabase } from "@/integrations/supabase/client";
import type {
  ConceptCore,
  SubjectMeta,
  SessionLogEntry,
  AssessmentLogEntry,
  QuestionOutcome,
  DerivedMission,
} from "./intelligence";

// ---------------- Read ----------------

export interface WorkspacePayload {
  subjectsById: Record<string, SubjectMeta>;
  conceptsById: Record<string, ConceptCore>;
  prereqs: Record<string, string[]>;
  sessions: SessionLogEntry[];
  assessments: AssessmentLogEntry[];
  completedMissionIds: string[];
  hasWorkspace: boolean;
}

function daysBetween(iso: string | null | undefined): number | undefined {
  if (!iso) return undefined;
  const d = (new Date(iso).getTime() - Date.now()) / 86400000;
  return Math.max(0, Math.round(d));
}

function lastReviewedDays(iso: string | null): number {
  if (!iso) return 14;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000));
}

function dateLabelFromTs(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ymd = (x: Date) => x.toISOString().slice(0, 10);
  const time = d.toTimeString().slice(0, 5);
  if (ymd(d) === ymd(today)) return `Today, ${time}`;
  const yesterday = new Date(today.getTime() - 86400000);
  if (ymd(d) === ymd(yesterday)) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}

export async function loadWorkspace(userId: string): Promise<WorkspacePayload> {
  const [subjectsR, conceptsR, prereqR, sessionsR, assessmentsR, aqR, missionsR] =
    await Promise.all([
      supabase.from("subjects").select("*").eq("user_id", userId).order("rank"),
      supabase.from("concepts").select("*").eq("user_id", userId),
      supabase.from("concept_prerequisites").select("*").eq("user_id", userId),
      supabase
        .from("sessions")
        .select("*")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(40),
      supabase
        .from("assessments")
        .select("*")
        .eq("user_id", userId)
        .order("taken_at", { ascending: false })
        .limit(20),
      supabase.from("assessment_questions").select("*").eq("user_id", userId),
      supabase
        .from("missions")
        .select("id, completed")
        .eq("user_id", userId)
        .eq("completed", true),
    ]);

  const subjects = subjectsR.data ?? [];
  const concepts = conceptsR.data ?? [];
  const prereqRows = prereqR.data ?? [];
  const sessionRows = sessionsR.data ?? [];
  const assessmentRows = assessmentsR.data ?? [];
  const aqRows = aqR.data ?? [];
  const missionRows = missionsR.data ?? [];

  const subjectsById: Record<string, SubjectMeta> = {};
  for (const s of subjects) {
    const days = daysBetween(s.next_assessment as string | null);
    subjectsById[s.id] = {
      id: s.id,
      name: s.name,
      code: s.code ?? "",
      color: s.color,
      nextAssessment: (s.next_assessment as string | null) ?? undefined,
      daysToAssessment: days,
      hoursThisWeek: Number(s.hours_this_week),
      baselineMastery: s.baseline_mastery,
      examWeight: Number(s.exam_weight),
      strategicValue: s.strategic_value,
    };
  }

  const subjectNameById = new Map(subjects.map((s) => [s.id, s.name]));

  const conceptsById: Record<string, ConceptCore> = {};
  for (const c of concepts) {
    conceptsById[c.id] = {
      id: c.id,
      name: c.name,
      subjectId: c.subject_id,
      subjectName: subjectNameById.get(c.subject_id) ?? "",
      topic: "",
      mastery: c.mastery,
      memoryStrength: c.memory_strength,
      importance: c.importance,
      decayRate: Number(c.decay_rate),
      daysSinceReview: lastReviewedDays(c.last_reviewed_at as string | null),
      reviewCount: c.review_count,
      successfulRecalls: c.successful_recalls,
      failedRecalls: c.failed_recalls,
      assessmentAttempts: c.assessment_attempts,
      assessmentCorrect: c.assessment_correct,
    };
  }

  const prereqs: Record<string, string[]> = {};
  for (const r of prereqRows) {
    (prereqs[r.concept_id] ||= []).push(r.prerequisite_id);
  }
  // Every concept must have an entry so the engine sees an empty array.
  for (const cid of Object.keys(conceptsById)) prereqs[cid] ||= [];

  const sessions: SessionLogEntry[] = sessionRows.map((r) => {
    const ts = new Date(r.started_at).getTime();
    const concept = r.concept_id ? conceptsById[r.concept_id] : undefined;
    return {
      id: r.id,
      conceptId: r.concept_id ?? "",
      conceptName: concept?.name ?? "—",
      subjectId: r.subject_id ?? concept?.subjectId ?? "",
      subjectName: subjectNameById.get(r.subject_id ?? "") ?? concept?.subjectName ?? "",
      type: (r.kind as SessionLogEntry["type"]) || "Review",
      duration: r.duration_min,
      gain: 0,
      timestamp: ts,
      dateLabel: dateLabelFromTs(ts),
    };
  });

  const aqByAssessment = new Map<string, QuestionOutcome[]>();
  for (const q of aqRows) {
    if (!q.concept_id) continue;
    const list = aqByAssessment.get(q.assessment_id) ?? [];
    list.push({
      conceptId: q.concept_id,
      correct: q.correct,
      difficulty: Math.round(Number(q.difficulty) * 10),
    });
    aqByAssessment.set(q.assessment_id, list);
  }

  const assessments: AssessmentLogEntry[] = assessmentRows.map((r) => ({
    id: r.id,
    subjectId: r.subject_id ?? "",
    subjectName: subjectNameById.get(r.subject_id ?? "") ?? "",
    title: (r.notes as string | null) ?? r.kind,
    predicted: 0,
    actual: r.score === null ? 0 : Math.round(Number(r.score)),
    timestamp: new Date(r.taken_at).getTime(),
    questions: aqByAssessment.get(r.id),
  }));

  return {
    subjectsById,
    conceptsById,
    prereqs,
    sessions,
    assessments,
    completedMissionIds: missionRows.map((m) => m.id),
    hasWorkspace: subjects.length > 0,
  };
}

// ---------------- Profile ----------------

export interface ProfileRow {
  id: string;
  display_name: string | null;
  board: string | null;
  program: string | null;
  semester: string | null;
  onboarded_at: string | null;
}

export async function loadProfile(userId: string): Promise<ProfileRow | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return (data as ProfileRow | null) ?? null;
}

// ---------------- Writes (fire-and-forget; toast on error) ----------------

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

type ConceptUpdate = {
  mastery?: number;
  memory_strength?: number;
  review_count?: number;
  last_reviewed_at?: string;
  successful_recalls?: number;
  failed_recalls?: number;
  assessment_attempts?: number;
  assessment_correct?: number;
};

export async function persistConceptPatch(conceptId: string, patch: Partial<ConceptCore>) {
  const userId = await currentUserId();
  if (!userId) return;
  const row: ConceptUpdate = {};
  if (patch.mastery !== undefined) row.mastery = patch.mastery;
  if (patch.memoryStrength !== undefined) row.memory_strength = patch.memoryStrength;
  if (patch.reviewCount !== undefined) row.review_count = patch.reviewCount;
  if (patch.daysSinceReview !== undefined) {
    row.last_reviewed_at = new Date(Date.now() - patch.daysSinceReview * 86400000).toISOString();
  }
  if (patch.successfulRecalls !== undefined) row.successful_recalls = patch.successfulRecalls;
  if (patch.failedRecalls !== undefined) row.failed_recalls = patch.failedRecalls;
  if (patch.assessmentAttempts !== undefined) row.assessment_attempts = patch.assessmentAttempts;
  if (patch.assessmentCorrect !== undefined) row.assessment_correct = patch.assessmentCorrect;
  if (Object.keys(row).length === 0) return;
  await supabase.from("concepts").update(row).eq("id", conceptId).eq("user_id", userId);
}

export async function persistConceptsBatch(patches: Record<string, Partial<ConceptCore>>) {
  await Promise.all(Object.entries(patches).map(([id, p]) => persistConceptPatch(id, p)));
}

export async function persistSession(entry: SessionLogEntry) {
  const userId = await currentUserId();
  if (!userId) return;
  await supabase.from("sessions").insert({
    user_id: userId,
    subject_id: entry.subjectId || null,
    concept_id: entry.conceptId || null,
    duration_min: entry.duration,
    kind: entry.type,
    started_at: new Date(entry.timestamp).toISOString(),
  });
}

export async function persistAssessment(
  entry: AssessmentLogEntry,
): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  const { data } = await supabase
    .from("assessments")
    .insert({
      user_id: userId,
      subject_id: entry.subjectId || null,
      kind: "quiz",
      score: entry.actual,
      taken_at: new Date(entry.timestamp).toISOString(),
      notes: entry.title,
    })
    .select("id")
    .single();
  if (!data || !entry.questions?.length) return;
  await supabase.from("assessment_questions").insert(
    entry.questions.map((q) => ({
      assessment_id: data.id,
      user_id: userId,
      concept_id: q.conceptId,
      correct: q.correct,
      difficulty: (q.difficulty ?? 5) / 10,
    })),
  );
}

export async function persistMissionCompletion(mission: DerivedMission) {
  const userId = await currentUserId();
  if (!userId) return;
  await supabase
    .from("missions")
    .upsert(
      {
        id: mission.id,
        user_id: userId,
        subject_id: mission.subjectId || null,
        concept_id: mission.conceptIds[0] || null,
        type: mission.type,
        priority: mission.priority,
        title: mission.title,
        reason: mission.reason,
        roi_score: mission.roiScore,
        estimated_minutes: mission.estimatedMinutes,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
}

export async function persistAdvanceDay(
  conceptUpdates: { id: string; daysSinceReview: number; memoryStrength: number }[],
) {
  const userId = await currentUserId();
  if (!userId) return;
  await Promise.all(
    conceptUpdates.map((u) =>
      supabase
        .from("concepts")
        .update({
          memory_strength: u.memoryStrength,
          last_reviewed_at: new Date(Date.now() - u.daysSinceReview * 86400000).toISOString(),
        })
        .eq("id", u.id)
        .eq("user_id", userId),
    ),
  );
}
