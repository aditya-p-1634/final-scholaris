// Curriculum & Syllabus Intelligence — shared types and client-safe helpers.
// The extraction server function returns a raw structure; the client normalizes
// it (assigns stable ids, fills defaults) for the editable Import Review Center.

import { DEFAULT_ASSESSMENT_WEIGHTS, type AssessmentWeights } from "./intelligence";

export type SubjectProgress = "not_started" | "in_progress" | "completed";
export type UnitCoverage = "covered" | "partial" | "not_covered";

export interface ImportConcept {
  id: string;
  name: string;
}

export interface ImportTopic {
  id: string;
  name: string;
  concepts: ImportConcept[];
}

export interface ImportUnit {
  id: string;
  name: string;
  coverage: UnitCoverage;
  topics: ImportTopic[];
}

export interface ImportSubject {
  id: string;
  name: string;
  code: string;
  credits: number;
  assessmentWeights: AssessmentWeights;
  progress: SubjectProgress;
  learningOutcomes: string[];
  units: ImportUnit[];
}

// `from` is a prerequisite of `to` (concept names; resolved to ids at import).
export interface PrereqHint {
  from: string;
  to: string;
}

export interface CurriculumDraft {
  subjects: ImportSubject[];
  prerequisites: PrereqHint[];
}

// ---- Raw AI shape (no ids, fields optional) ----

export interface RawConcept {
  name?: string;
}
export interface RawTopic {
  name?: string;
  concepts?: (string | RawConcept)[];
}
export interface RawUnit {
  name?: string;
  coverage?: string;
  topics?: RawTopic[];
}
export interface RawSubject {
  name?: string;
  code?: string;
  credits?: number | null;
  assessmentWeights?: Partial<AssessmentWeights>;
  progress?: string;
  learningOutcomes?: string[];
  units?: RawUnit[];
}
export interface RawExtraction {
  subjects?: RawSubject[];
  prerequisites?: { from?: string; to?: string }[];
}

let _seq = 0;
function uid(prefix: string): string {
  _seq += 1;
  const rnd = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${_seq}-${rnd}`;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function coerceProgress(v: string | undefined): SubjectProgress {
  if (v === "completed" || v === "in_progress" || v === "not_started") return v;
  return "not_started";
}
function coerceCoverage(v: string | undefined): UnitCoverage {
  if (v === "covered" || v === "partial" || v === "not_covered") return v;
  return "not_covered";
}

// Assessment weights → normalize to fractions summing to ~1.
// Accepts percentages (e.g. 30) or fractions (e.g. 0.3).
export function normalizeWeights(w?: Partial<AssessmentWeights>): AssessmentWeights {
  if (!w) return { ...DEFAULT_ASSESSMENT_WEIGHTS };
  const raw = {
    midterm: Number(w.midterm) || 0,
    final: Number(w.final) || 0,
    assignment: Number(w.assignment) || 0,
    lab: Number(w.lab) || 0,
    project: Number(w.project) || 0,
  };
  const sum = raw.midterm + raw.final + raw.assignment + raw.lab + raw.project;
  if (sum <= 0) return { ...DEFAULT_ASSESSMENT_WEIGHTS };
  // If values look like percentages (sum >> 1), divide by their total.
  const divisor = sum > 1.5 ? sum : 1;
  return {
    midterm: clamp01(raw.midterm / divisor),
    final: clamp01(raw.final / divisor),
    assignment: clamp01(raw.assignment / divisor),
    lab: clamp01(raw.lab / divisor),
    project: clamp01(raw.project / divisor),
  };
}

export function weightsSum(w: AssessmentWeights): number {
  return w.midterm + w.final + w.assignment + w.lab + w.project;
}

// Convert the raw AI extraction into an editable, id-bearing draft.
export function normalizeExtraction(raw: RawExtraction): CurriculumDraft {
  const subjects: ImportSubject[] = (raw.subjects ?? [])
    .filter((s) => (s.name ?? "").trim().length > 0)
    .map((s) => {
      const units: ImportUnit[] = (s.units ?? []).map((u) => ({
        id: uid("unit"),
        name: (u.name ?? "Unit").trim(),
        coverage: coerceCoverage(u.coverage),
        topics: (u.topics ?? []).map((t) => ({
          id: uid("topic"),
          name: (t.name ?? "Topic").trim(),
          concepts: (t.concepts ?? [])
            .map((c) => (typeof c === "string" ? c : c.name ?? ""))
            .filter((n) => n.trim().length > 0)
            .map((n) => ({ id: uid("concept"), name: n.trim() })),
        })),
      }));
      const credits = s.credits == null ? 0 : Math.max(0, Math.round(Number(s.credits)));
      return {
        id: uid("subject"),
        name: (s.name ?? "").trim(),
        code: (s.code ?? "").trim(),
        credits,
        assessmentWeights: normalizeWeights(s.assessmentWeights),
        progress: coerceProgress(s.progress),
        learningOutcomes: (s.learningOutcomes ?? []).filter((x) => (x ?? "").trim().length > 0),
        units,
      };
    });

  const prerequisites: PrereqHint[] = (raw.prerequisites ?? [])
    .map((p) => ({ from: (p.from ?? "").trim(), to: (p.to ?? "").trim() }))
    .filter((p) => p.from && p.to && p.from.toLowerCase() !== p.to.toLowerCase());

  return { subjects, prerequisites };
}

// ---- Manipulation helpers (immutable) for the review center ----

export function emptySubject(): ImportSubject {
  return {
    id: uid("subject"),
    name: "New Subject",
    code: "",
    credits: 3,
    assessmentWeights: { ...DEFAULT_ASSESSMENT_WEIGHTS },
    progress: "not_started",
    learningOutcomes: [],
    units: [],
  };
}
export function emptyUnit(): ImportUnit {
  return { id: uid("unit"), name: "New Unit", coverage: "not_covered", topics: [] };
}
export function emptyTopic(): ImportTopic {
  return { id: uid("topic"), name: "New Topic", concepts: [] };
}
export function emptyConcept(name = "New Concept"): ImportConcept {
  return { id: uid("concept"), name };
}

export interface DraftCounts {
  subjects: number;
  units: number;
  topics: number;
  concepts: number;
  creditsTotal: number;
  prerequisites: number;
}

export function countDraft(draft: CurriculumDraft): DraftCounts {
  let units = 0;
  let topics = 0;
  let concepts = 0;
  let creditsTotal = 0;
  for (const s of draft.subjects) {
    creditsTotal += s.credits;
    units += s.units.length;
    for (const u of s.units) {
      topics += u.topics.length;
      for (const t of u.topics) {
        // A topic with no concepts still becomes one learnable concept on import.
        concepts += t.concepts.length > 0 ? t.concepts.length : 1;
      }
      // A unit with no topics still becomes one learnable concept on import.
      if (u.topics.length === 0) concepts += 1;
    }
  }
  return {
    subjects: draft.subjects.length,
    units,
    topics,
    concepts,
    creditsTotal,
    prerequisites: draft.prerequisites.length,
  };
}

// Subjects missing mandatory credits — blocks import.
export function subjectsMissingCredits(draft: CurriculumDraft): ImportSubject[] {
  return draft.subjects.filter((s) => !s.credits || s.credits <= 0);
}
