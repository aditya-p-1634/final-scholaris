// Persistence layer — read/write the Scholaris academic data
// in Lovable Cloud. Intelligence calculations stay in src/lib/intelligence.ts;
// this module only moves raw concept-level state and activity logs.

import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_ASSESSMENT_WEIGHTS, useIntelligenceStore } from "./intelligence";
import { DEV_MODE, saveDevWorkspace } from "./dev-mode";
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
  void flushOfflineQueue();
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
        .select("type, subject_id, concept_id")
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
      credits: Number((s as Record<string, unknown>).credits ?? 3),
      assessmentWeights: {
        midterm: Number((s as Record<string, unknown>).midterm_weight ?? DEFAULT_ASSESSMENT_WEIGHTS.midterm),
        final: Number((s as Record<string, unknown>).final_weight ?? DEFAULT_ASSESSMENT_WEIGHTS.final),
        assignment: Number((s as Record<string, unknown>).assignment_weight ?? DEFAULT_ASSESSMENT_WEIGHTS.assignment),
        lab: Number((s as Record<string, unknown>).lab_weight ?? DEFAULT_ASSESSMENT_WEIGHTS.lab),
        project: Number((s as Record<string, unknown>).project_weight ?? DEFAULT_ASSESSMENT_WEIGHTS.project),
      },
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
    completedMissionIds: missionRows.map((m) =>
      m.type === "assessment"
        ? `m-assessment-${m.subject_id ?? ""}`
        : `m-${m.type}-${m.concept_id ?? ""}`,
    ),
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

// ---------------- Offline Write Queue (Production Retry Layer) ----------------

export const OFFLINE_QUEUE_KEY = "scholaris:offline_write_queue_v1";

export type QueuedOperation =
  | { type: "concept_patch"; id: string; userId: string; conceptId: string; patch: Partial<ConceptCore>; timestamp: number }
  | { type: "session"; id: string; userId: string; entry: SessionLogEntry; timestamp: number }
  | { type: "assessment"; id: string; userId: string; entry: AssessmentLogEntry; timestamp: number }
  | { type: "mission_completion"; id: string; userId: string; mission: DerivedMission; timestamp: number };

export function loadOfflineQueue(): QueuedOperation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: QueuedOperation[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Quota or storage restrictions — ignore silently
  }
}

export function enqueueOfflineOp(op: QueuedOperation): void {
  if (DEV_MODE || typeof window === "undefined") return;
  const queue = loadOfflineQueue();
  if (op.type === "concept_patch") {
    const idx = queue.findIndex(
      (x) => x.type === "concept_patch" && x.userId === op.userId && x.conceptId === op.conceptId,
    );
    if (idx >= 0) {
      const existing = queue[idx] as Extract<QueuedOperation, { type: "concept_patch" }>;
      queue[idx] = { ...existing, patch: { ...existing.patch, ...op.patch }, timestamp: Date.now() };
    } else {
      queue.push(op);
    }
  } else {
    if (!queue.some((x) => x.id === op.id)) {
      queue.push(op);
    }
  }
  saveOfflineQueue(queue);
}

let isFlushing = false;

export async function flushOfflineQueue(): Promise<void> {
  if (isFlushing || DEV_MODE || typeof window === "undefined" || !navigator.onLine) return;
  isFlushing = true;
  try {
    const userId = await currentUserId();
    if (!userId) return;

    const queue = loadOfflineQueue();
    if (queue.length === 0) return;

    const remaining: QueuedOperation[] = [];
    for (const op of queue) {
      // Process ONLY operations belonging to the currently authenticated user.
      // Operations belonging to other accounts are safely preserved for when that account logs back in.
      if (op.userId !== userId) {
        remaining.push(op);
        continue;
      }
      try {
        if (op.type === "concept_patch") {
          const row: ConceptUpdate = {};
          if (op.patch.mastery !== undefined) row.mastery = op.patch.mastery;
          if (op.patch.memoryStrength !== undefined) row.memory_strength = op.patch.memoryStrength;
          if (op.patch.reviewCount !== undefined) row.review_count = op.patch.reviewCount;
          if (op.patch.daysSinceReview !== undefined) {
            row.last_reviewed_at = new Date(Date.now() - op.patch.daysSinceReview * 86400000).toISOString();
          }
          if (op.patch.successfulRecalls !== undefined) row.successful_recalls = op.patch.successfulRecalls;
          if (op.patch.failedRecalls !== undefined) row.failed_recalls = op.patch.failedRecalls;
          if (op.patch.assessmentAttempts !== undefined) row.assessment_attempts = op.patch.assessmentAttempts;
          if (op.patch.assessmentCorrect !== undefined) row.assessment_correct = op.patch.assessmentCorrect;
          if (Object.keys(row).length > 0) {
            const { error } = await supabase.from("concepts").update(row).eq("id", op.conceptId).eq("user_id", userId);
            if (error) throw error;
          }
        } else if (op.type === "session") {
          const { error } = await supabase.from("sessions").insert({
            user_id: userId,
            subject_id: op.entry.subjectId || null,
            concept_id: op.entry.conceptId || null,
            duration_min: op.entry.duration,
            kind: op.entry.type,
            started_at: new Date(op.entry.timestamp).toISOString(),
          });
          if (error) throw error;
        } else if (op.type === "assessment") {
          const { data, error } = await supabase
            .from("assessments")
            .insert({
              user_id: userId,
              subject_id: op.entry.subjectId || null,
              kind: "quiz",
              score: op.entry.actual,
              taken_at: new Date(op.entry.timestamp).toISOString(),
              notes: op.entry.title,
            })
            .select("id")
            .single();
          if (error || !data) throw error || new Error("Failed to sync assessment");
          if (op.entry.questions?.length) {
            const { error: qErr } = await supabase.from("assessment_questions").insert(
              op.entry.questions.map((q) => ({
                assessment_id: data.id,
                user_id: userId,
                concept_id: q.conceptId,
                correct: q.correct,
                difficulty: (q.difficulty ?? 5) / 10,
              })),
            );
            if (qErr) throw qErr;
          }
        } else if (op.type === "mission_completion") {
          const id = stringToUuid(`${userId}:${op.mission.id}`);
          const { error } = await supabase.from("missions").upsert(
            {
              id,
              user_id: userId,
              subject_id: op.mission.subjectId || null,
              concept_id: op.mission.conceptIds[0] || null,
              type: op.mission.type,
              priority: op.mission.priority,
              title: op.mission.title,
              reason: op.mission.reason,
              roi_score: op.mission.roiScore,
              estimated_minutes: op.mission.estimatedMinutes,
              completed: true,
              completed_at: new Date().toISOString(),
            },
            { onConflict: "id" },
          );
          if (error) throw error;
        }
      } catch {
        remaining.push(op);
      }
    }
    saveOfflineQueue(remaining);
  } finally {
    isFlushing = false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void flushOfflineQueue();
  });
}

export async function persistConceptPatch(conceptId: string, patch: Partial<ConceptCore>) {
  if (DEV_MODE) return;
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

  try {
    const { error } = await supabase.from("concepts").update(row).eq("id", conceptId).eq("user_id", userId);
    if (error) throw error;
  } catch {
    enqueueOfflineOp({ type: "concept_patch", id: `cp-${conceptId}-${Date.now()}`, userId, conceptId, patch, timestamp: Date.now() });
  }
}

export async function persistConceptsBatch(patches: Record<string, Partial<ConceptCore>>) {
  await Promise.all(Object.entries(patches).map(([id, p]) => persistConceptPatch(id, p)));
}

// ---------------- Subject / Concept CRUD (fully persisted) ----------------

// CREATE subject — returns the new row id (uuid) so the store can key it.
export async function createSubject(meta: Omit<SubjectMeta, "id"> & { rank?: number }): Promise<string | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("subjects")
    .insert({
      user_id: userId,
      name: meta.name,
      code: meta.code ?? "",
      color: meta.color ?? PALETTE[0],
      exam_weight: meta.examWeight ?? 0.5,
      strategic_value: meta.strategicValue ?? 70,
      hours_this_week: meta.hoursThisWeek ?? 0,
      baseline_mastery: meta.baselineMastery ?? 50,
      next_assessment: meta.nextAssessment ?? null,
      rank: meta.rank ?? 1,
      credits: meta.credits ?? 3,
      midterm_weight: meta.assessmentWeights?.midterm ?? DEFAULT_ASSESSMENT_WEIGHTS.midterm,
      final_weight: meta.assessmentWeights?.final ?? DEFAULT_ASSESSMENT_WEIGHTS.final,
      assignment_weight: meta.assessmentWeights?.assignment ?? DEFAULT_ASSESSMENT_WEIGHTS.assignment,
      lab_weight: meta.assessmentWeights?.lab ?? DEFAULT_ASSESSMENT_WEIGHTS.lab,
      project_weight: meta.assessmentWeights?.project ?? DEFAULT_ASSESSMENT_WEIGHTS.project,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

// UPDATE subject — partial patch of the editable fields.
export async function updateSubject(subjectId: string, patch: Partial<SubjectMeta>): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  const row: {
    name?: string; code?: string; color?: string; exam_weight?: number;
    strategic_value?: number; hours_this_week?: number; baseline_mastery?: number;
    next_assessment?: string | null; credits?: number; midterm_weight?: number;
    final_weight?: number; assignment_weight?: number; lab_weight?: number; project_weight?: number;
  } = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.code !== undefined) row.code = patch.code;
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.examWeight !== undefined) row.exam_weight = patch.examWeight;
  if (patch.strategicValue !== undefined) row.strategic_value = patch.strategicValue;
  if (patch.hoursThisWeek !== undefined) row.hours_this_week = patch.hoursThisWeek;
  if (patch.baselineMastery !== undefined) row.baseline_mastery = patch.baselineMastery;
  if (patch.nextAssessment !== undefined) row.next_assessment = patch.nextAssessment || null;
  if (patch.credits !== undefined) row.credits = patch.credits;
  if (patch.assessmentWeights) {
    row.midterm_weight = patch.assessmentWeights.midterm;
    row.final_weight = patch.assessmentWeights.final;
    row.assignment_weight = patch.assessmentWeights.assignment;
    row.lab_weight = patch.assessmentWeights.lab;
    row.project_weight = patch.assessmentWeights.project;
  }
  if (Object.keys(row).length === 0) return;
  await supabase.from("subjects").update(row).eq("id", subjectId).eq("user_id", userId);
}

// DELETE subject — no FK cascade in the schema, so clean up children explicitly.
export async function deleteSubject(subjectId: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  const { data: conceptRows } = await supabase
    .from("concepts")
    .select("id")
    .eq("user_id", userId)
    .eq("subject_id", subjectId);
  const conceptIds = (conceptRows ?? []).map((c) => c.id);
  if (conceptIds.length) {
    await supabase.from("concept_prerequisites").delete().eq("user_id", userId).in("concept_id", conceptIds);
    await supabase.from("concept_prerequisites").delete().eq("user_id", userId).in("prerequisite_id", conceptIds);
  }
  await Promise.all([
    supabase.from("concepts").delete().eq("user_id", userId).eq("subject_id", subjectId),
    supabase.from("topics").delete().eq("user_id", userId).eq("subject_id", subjectId),
    supabase.from("sessions").delete().eq("user_id", userId).eq("subject_id", subjectId),
    supabase.from("assessments").delete().eq("user_id", userId).eq("subject_id", subjectId),
    supabase.from("missions").delete().eq("user_id", userId).eq("subject_id", subjectId),
  ]);
  await supabase.from("subjects").delete().eq("id", subjectId).eq("user_id", userId);
}

// CREATE concept — returns the new row id.
export async function createConcept(meta: Omit<ConceptCore, "id" | "subjectName">): Promise<string | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("concepts")
    .insert({
      user_id: userId,
      subject_id: meta.subjectId,
      name: meta.name,
      importance: meta.importance ?? 6,
      decay_rate: meta.decayRate ?? 0.1,
      mastery: meta.mastery ?? 40,
      memory_strength: meta.memoryStrength ?? 45,
      review_count: meta.reviewCount ?? 0,
      successful_recalls: meta.successfulRecalls ?? 0,
      failed_recalls: meta.failedRecalls ?? 0,
      assessment_attempts: meta.assessmentAttempts ?? 0,
      assessment_correct: meta.assessmentCorrect ?? 0,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

// DELETE concept — also remove any prerequisite edges that reference it.
export async function deleteConcept(conceptId: string): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await supabase.from("concept_prerequisites").delete().eq("user_id", userId).eq("concept_id", conceptId);
  await supabase.from("concept_prerequisites").delete().eq("user_id", userId).eq("prerequisite_id", conceptId);
  await supabase.from("concepts").delete().eq("id", conceptId).eq("user_id", userId);
}

// SET prerequisites for a concept — full replace of its dependency edges.
export async function persistPrerequisites(conceptId: string, prerequisiteIds: string[]): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  await supabase.from("concept_prerequisites").delete().eq("user_id", userId).eq("concept_id", conceptId);
  if (prerequisiteIds.length) {
    await supabase.from("concept_prerequisites").insert(
      prerequisiteIds.map((prerequisite_id) => ({ user_id: userId, concept_id: conceptId, prerequisite_id })),
    );
  }
}

export async function persistSession(entry: SessionLogEntry) {
  if (DEV_MODE) return;
  const userId = await currentUserId();
  if (!userId) return;
  try {
    const { error } = await supabase.from("sessions").insert({
      user_id: userId,
      subject_id: entry.subjectId || null,
      concept_id: entry.conceptId || null,
      duration_min: entry.duration,
      kind: entry.type,
      started_at: new Date(entry.timestamp).toISOString(),
    });
    if (error) throw error;
  } catch {
    enqueueOfflineOp({ type: "session", id: `s-${entry.id || Date.now()}`, userId, entry, timestamp: Date.now() });
  }
}

export async function persistAssessment(
  entry: AssessmentLogEntry,
): Promise<void> {
  if (DEV_MODE) return;
  const userId = await currentUserId();
  if (!userId) return;
  try {
    const { data, error } = await supabase
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
    if (error || !data) throw error || new Error("Failed to insert assessment");
    if (entry.questions?.length) {
      const { error: qErr } = await supabase.from("assessment_questions").insert(
        entry.questions.map((q) => ({
          assessment_id: data.id,
          user_id: userId,
          concept_id: q.conceptId,
          correct: q.correct,
          difficulty: (q.difficulty ?? 5) / 10,
        })),
      );
      if (qErr) throw qErr;
    }
  } catch {
    enqueueOfflineOp({ type: "assessment", id: `a-${entry.id || Date.now()}`, userId, entry, timestamp: Date.now() });
  }
}

// Deterministic UUID from any string — used to map engine mission ids
// (e.g. "m-recovery-{conceptId}") onto the missions.id uuid column so
// completion state survives reload.
function stringToUuid(input: string): string {
  let h1 = 0x6d2b79f5 ^ input.length;
  let h2 = 0xa3c59ac3 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h1 = Math.imul(h1 ^ input.charCodeAt(i), 2654435761);
    h2 = Math.imul(h2 ^ input.charCodeAt(i), 1597334677);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  const a = hex(h1);
  const b = hex(Math.imul(h1, 0x85ebca6b) ^ h2);
  const c = hex(Math.imul(h2, 0xc2b2ae35));
  const d = hex(h1 ^ Math.imul(h2, 0x27d4eb2d));
  return `${a}-${b.slice(0, 4)}-4${b.slice(4, 7)}-8${c.slice(0, 3)}-${c.slice(3)}${d}`;
}

export async function persistMissionCompletion(mission: DerivedMission) {
  if (DEV_MODE) return;
  const userId = await currentUserId();
  if (!userId) return;
  const id = stringToUuid(`${userId}:${mission.id}`);
  try {
    const { error } = await supabase.from("missions").upsert(
      {
        id,
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
    if (error) throw error;
  } catch {
    enqueueOfflineOp({ type: "mission_completion", id: `m-${mission.id}`, userId, mission, timestamp: Date.now() });
  }
}

// ---------------- Onboarding seed ----------------

export interface OnboardingInput {
  board: string;
  program: string;
  semester: string;
  subjects: { name: string; code?: string; color?: string; concepts: string[] }[];
}

const PALETTE = [
  "oklch(0.72 0.16 250)",
  "oklch(0.72 0.16 155)",
  "oklch(0.78 0.16 75)",
  "oklch(0.65 0.22 320)",
  "oklch(0.62 0.22 25)",
  "oklch(0.70 0.10 200)",
];

export async function seedWorkspace(input: OnboardingInput): Promise<void> {
  const userId = await currentUserId();
  if (!userId) {
    if (DEV_MODE) {
      const subjectsById: Record<string, SubjectMeta> = {};
      const conceptsById: Record<string, ConceptCore> = {};

      for (let i = 0; i < input.subjects.length; i++) {
        const s = input.subjects[i];
        const subjectId = `dev-sub-${i + 1}`;
        subjectsById[subjectId] = {
          id: subjectId,
          name: s.name,
          code: s.code ?? "",
          color: s.color ?? PALETTE[i % PALETTE.length],
          hoursThisWeek: 0,
          baselineMastery: 50,
          examWeight: 0.5,
          strategicValue: 70,
          credits: 3,
          assessmentWeights: { ...DEFAULT_ASSESSMENT_WEIGHTS },
        };

        s.concepts.forEach((cName, idx) => {
          const cid = `dev-c-${i + 1}-${idx + 1}`;
          conceptsById[cid] = {
            id: cid,
            name: cName,
            subjectId,
            subjectName: s.name,
            topic: "General",
            mastery: 40 + ((idx * 7) % 25),
            memoryStrength: 45 + ((idx * 11) % 30),
            importance: 6 + (idx % 4),
            decayRate: 0.1,
            daysSinceReview: 0,
            reviewCount: 0,
            successfulRecalls: 0,
            failedRecalls: 0,
            assessmentAttempts: 0,
            assessmentCorrect: 0,
          };
        });
      }

      const payload: WorkspacePayload = {
        subjectsById,
        conceptsById,
        prereqs: {},
        sessions: [],
        assessments: [],
        completedMissionIds: [],
        hasWorkspace: Object.keys(subjectsById).length > 0,
      };

      useIntelligenceStore.getState().hydrate(payload);
      saveDevWorkspace(payload);
      return;
    }
    throw new Error("Not authenticated");
  }

  await supabase.from("profiles").upsert(
    {
      id: userId,
      board: input.board,
      program: input.program,
      semester: input.semester,
      onboarded_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  for (let i = 0; i < input.subjects.length; i++) {
    const s = input.subjects[i];
    const { data: subj, error: subjErr } = await supabase
      .from("subjects")
      .insert({
        user_id: userId,
        name: s.name,
        code: s.code ?? "",
        color: s.color ?? PALETTE[i % PALETTE.length],
        exam_weight: 0.5,
        strategic_value: 70,
        hours_this_week: 0,
        baseline_mastery: 50,
        rank: i + 1,
      })
      .select("id")
      .single();
    if (subjErr || !subj) continue;

    const conceptRows = s.concepts.map((name, idx) => ({
      user_id: userId,
      subject_id: subj.id,
      name,
      importance: 6 + (idx % 4),
      decay_rate: 0.1,
      mastery: 40 + ((idx * 7) % 25),
      memory_strength: 45 + ((idx * 11) % 30),
    }));
    if (conceptRows.length) {
      await supabase.from("concepts").insert(conceptRows);
    }
  }
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
