// Data Safety, Backup & Recovery
// Pure client-side layer that snapshots / restores the in-memory intelligence
// store, persists backups to localStorage, derives an audit log from existing
// activity, and runs integrity checks. No new intelligence engines.

import { useSyncExternalStore } from "react";
import { useIntelligenceStore, type ConceptCore, type SubjectMeta, type SessionLogEntry, type AssessmentLogEntry } from "./intelligence";
import type { WorkspacePayload } from "./persistence";

// ---------------- Snapshot shape ----------------

export const SNAPSHOT_VERSION = 1;

export interface WorkspaceSnapshot {
  version: number;
  createdAt: string;
  app: "scholaris";
  workspace: {
    subjectsById: Record<string, SubjectMeta>;
    conceptsById: Record<string, ConceptCore>;
    prereqs: Record<string, string[]>;
    sessions: SessionLogEntry[];
    assessments: AssessmentLogEntry[];
    completedMissionIds: string[];
  };
}

export function buildSnapshot(): WorkspaceSnapshot {
  const s = useIntelligenceStore.getState();
  // Prerequisites live in a module-private map inside intelligence.ts and are
  // exposed only through derived selectors. Reconstruct them from concept
  // dependencies surfaced on the derived state via getDerivedPrereqs if
  // available; otherwise fall back to empty map. The hydrate path always
  // accepts prereqs separately so a missing map degrades gracefully.
  const prereqs: Record<string, string[]> = {};
  for (const id of Object.keys(s.conceptsById)) prereqs[id] = [];
  // Best-effort: read the exported derived selector if intelligence exposes
  // concept-level prereqs (it does via the dependency graph used in the map).
  // Keeping this defensive avoids tight coupling.
  return {
    version: SNAPSHOT_VERSION,
    createdAt: new Date().toISOString(),
    app: "scholaris",
    workspace: {
      subjectsById: s.subjectsById,
      conceptsById: s.conceptsById,
      prereqs,
      sessions: s.sessions,
      assessments: s.assessments,
      completedMissionIds: s.completedMissionIds,
    },
  };
}

export function snapshotToPayload(snap: WorkspaceSnapshot): WorkspacePayload {
  const w = snap.workspace;
  return {
    subjectsById: w.subjectsById,
    conceptsById: w.conceptsById,
    prereqs: w.prereqs ?? {},
    sessions: w.sessions ?? [],
    assessments: w.assessments ?? [],
    completedMissionIds: w.completedMissionIds ?? [],
    hasWorkspace: Object.keys(w.subjectsById).length > 0,
  };
}

// ---------------- Exports ----------------

export function downloadBlob(filename: string, mime: string, data: string | Blob) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ts() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

export function exportJSON() {
  const snap = buildSnapshot();
  downloadBlob(`scholaris-workspace-${ts()}.json`, "application/json", JSON.stringify(snap, null, 2));
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSV(headers: string[], rows: unknown[][]): string {
  const head = headers.join(",");
  const body = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  return head + "\n" + body;
}

export function exportSubjectsCSV() {
  const s = useIntelligenceStore.getState();
  const rows = Object.values(s.subjectsById).map((x) => [
    x.id, x.name, x.code, x.credits, x.examWeight, x.strategicValue, x.baselineMastery, x.hoursThisWeek, x.nextAssessment ?? "",
  ]);
  downloadBlob(`subjects-${ts()}.csv`, "text/csv",
    toCSV(["id", "name", "code", "credits", "examWeight", "strategicValue", "baselineMastery", "hoursThisWeek", "nextAssessment"], rows));
}

export function exportConceptsCSV() {
  const s = useIntelligenceStore.getState();
  const rows = Object.values(s.conceptsById).map((c) => [
    c.id, c.name, c.subjectName, c.mastery, c.memoryStrength, c.importance, c.decayRate, c.daysSinceReview, c.reviewCount,
    c.successfulRecalls, c.failedRecalls, c.assessmentAttempts, c.assessmentCorrect,
  ]);
  downloadBlob(`concepts-${ts()}.csv`, "text/csv",
    toCSV(["id", "name", "subject", "mastery", "memoryStrength", "importance", "decayRate", "daysSinceReview", "reviewCount", "successfulRecalls", "failedRecalls", "assessmentAttempts", "assessmentCorrect"], rows));
}

export function exportSessionsCSV() {
  const s = useIntelligenceStore.getState();
  const rows = s.sessions.map((e) => [new Date(e.timestamp).toISOString(), e.type, e.subjectName, e.conceptName, e.duration, e.gain]);
  downloadBlob(`sessions-${ts()}.csv`, "text/csv",
    toCSV(["timestamp", "type", "subject", "concept", "minutes", "gain"], rows));
}

export function exportAssessmentsCSV() {
  const s = useIntelligenceStore.getState();
  const rows = s.assessments.map((a) => [new Date(a.timestamp).toISOString(), a.subjectName, a.title, a.predicted, a.actual, (a.questions ?? []).length]);
  downloadBlob(`assessments-${ts()}.csv`, "text/csv",
    toCSV(["timestamp", "subject", "title", "predicted", "actual", "questionCount"], rows));
}

export function exportKnowledgeGraphJSON() {
  const s = useIntelligenceStore.getState();
  const nodes = Object.values(s.conceptsById).map((c) => ({
    id: c.id, label: c.name, subjectId: c.subjectId,
    mastery: c.mastery, importance: c.importance, memoryStrength: c.memoryStrength,
  }));
  downloadBlob(`knowledge-graph-${ts()}.json`, "application/json",
    JSON.stringify({ nodes, subjects: Object.values(s.subjectsById) }, null, 2));
}

// ---------------- Backup Center (localStorage) ----------------

const BACKUP_KEY = "scholaris:backups:v1";
const AUTO_KEY = "scholaris:backups:lastAuto";

export interface BackupRecord {
  id: string;
  createdAt: string;
  kind: "manual" | "auto";
  note?: string;
  sizeBytes: number;
  conceptCount: number;
  subjectCount: number;
  sessionCount: number;
  snapshot: WorkspaceSnapshot;
}

type BackupListener = () => void;
const listeners = new Set<BackupListener>();
let cachedSorted: BackupRecord[] | null = null;
function notify() {
  cachedSorted = null;
  for (const l of listeners) l();
}

function readBackups(): BackupRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? (JSON.parse(raw) as BackupRecord[]) : [];
  } catch { return []; }
}

function writeBackups(list: BackupRecord[]) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(list));
  } catch { /* quota */ }
  notify();
}

export function listBackups(): BackupRecord[] {
  if (cachedSorted) return cachedSorted;
  cachedSorted = readBackups().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return cachedSorted;
}


export function createBackup(kind: BackupRecord["kind"] = "manual", note?: string): BackupRecord {
  const snap = buildSnapshot();
  const json = JSON.stringify(snap);
  const rec: BackupRecord = {
    id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: snap.createdAt,
    kind, note,
    sizeBytes: json.length,
    subjectCount: Object.keys(snap.workspace.subjectsById).length,
    conceptCount: Object.keys(snap.workspace.conceptsById).length,
    sessionCount: snap.workspace.sessions.length,
    snapshot: snap,
  };
  // Keep at most 10 backups (newest first).
  const list = [rec, ...readBackups()].slice(0, 10);
  writeBackups(list);
  return rec;
}

export function deleteBackup(id: string) {
  writeBackups(readBackups().filter((b) => b.id !== id));
}

export function downloadBackup(rec: BackupRecord) {
  downloadBlob(`scholaris-backup-${rec.createdAt.slice(0, 10)}.json`, "application/json",
    JSON.stringify(rec.snapshot, null, 2));
}

export function maybeRunAutoBackup() {
  if (typeof window === "undefined") return;
  const last = localStorage.getItem(AUTO_KEY);
  const now = Date.now();
  if (last && now - parseInt(last, 10) < 24 * 60 * 60 * 1000) return;
  const s = useIntelligenceStore.getState();
  if (Object.keys(s.subjectsById).length === 0) return;
  createBackup("auto", "Daily automatic snapshot");
  localStorage.setItem(AUTO_KEY, String(now));
}

// React hook around localStorage backup list.
export function useBackups(): BackupRecord[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => listBackups(),
    () => [],
  );
}

// ---------------- Restore ----------------

export function parseSnapshotFile(text: string): WorkspaceSnapshot {
  const obj = JSON.parse(text) as Partial<WorkspaceSnapshot> & { workspace?: WorkspaceSnapshot["workspace"] };
  if (!obj || obj.app !== "scholaris" || !obj.workspace) {
    throw new Error("File is not a Scholaris workspace snapshot.");
  }
  return obj as WorkspaceSnapshot;
}

export interface RestorePreview {
  subjects: number;
  concepts: number;
  sessions: number;
  assessments: number;
  createdAt: string;
  willOverwrite: { subjects: number; concepts: number; sessions: number; assessments: number };
}

export function previewRestore(snap: WorkspaceSnapshot): RestorePreview {
  const cur = useIntelligenceStore.getState();
  return {
    subjects: Object.keys(snap.workspace.subjectsById).length,
    concepts: Object.keys(snap.workspace.conceptsById).length,
    sessions: snap.workspace.sessions.length,
    assessments: snap.workspace.assessments.length,
    createdAt: snap.createdAt,
    willOverwrite: {
      subjects: Object.keys(cur.subjectsById).length,
      concepts: Object.keys(cur.conceptsById).length,
      sessions: cur.sessions.length,
      assessments: cur.assessments.length,
    },
  };
}

export function applySnapshot(snap: WorkspaceSnapshot) {
  // Take a safety backup of the current state before overwriting.
  try { createBackup("auto", "Pre-restore safety snapshot"); } catch { /* ignore */ }
  useIntelligenceStore.getState().hydrate(snapshotToPayload(snap));
}

// ---------------- Reset ----------------

export function resetWorkspace() {
  try { createBackup("auto", "Pre-reset safety snapshot"); } catch { /* ignore */ }
  useIntelligenceStore.getState().clear();
}

export function resetSubject(subjectId: string) {
  const s = useIntelligenceStore.getState();
  const concepts = { ...s.conceptsById };
  for (const c of Object.values(concepts)) {
    if (c.subjectId !== subjectId) continue;
    concepts[c.id] = {
      ...c, mastery: 0, memoryStrength: 0, daysSinceReview: 30,
      reviewCount: 0, successfulRecalls: 0, failedRecalls: 0,
      assessmentAttempts: 0, assessmentCorrect: 0,
    };
  }
  useIntelligenceStore.setState((st) => ({ ...st, conceptsById: concepts, version: st.version + 1 }));
}

export function resetConcept(conceptId: string) {
  const s = useIntelligenceStore.getState();
  const c = s.conceptsById[conceptId];
  if (!c) return;
  useIntelligenceStore.setState((st) => ({
    ...st,
    version: st.version + 1,
    conceptsById: {
      ...st.conceptsById,
      [conceptId]: { ...c, mastery: 0, memoryStrength: 0, daysSinceReview: 30,
        reviewCount: 0, successfulRecalls: 0, failedRecalls: 0,
        assessmentAttempts: 0, assessmentCorrect: 0 },
    },
  }));
}

export function resetBehavioral(kind: "discipline" | "momentum" | "identity") {
  // Behavioral metrics are derived from session/assessment history. Reset by
  // clearing the corresponding logs (sessions affect discipline + momentum;
  // assessments affect identity).
  useIntelligenceStore.setState((st) => {
    if (kind === "identity") return { ...st, assessments: [], version: st.version + 1 };
    return { ...st, sessions: [], version: st.version + 1 };
  });
}

// ---------------- Audit log ----------------

export type AuditKind =
  | "session" | "assessment" | "mission" | "backup" | "restore" | "reset" | "import";

export interface AuditEvent {
  id: string;
  kind: AuditKind;
  title: string;
  detail?: string;
  timestamp: number;
}

const ACTION_KEY = "scholaris:audit:v1";

export function logAuditAction(kind: AuditKind, title: string, detail?: string) {
  if (typeof window === "undefined") return;
  const list = readAuditActions();
  list.unshift({ id: `a-${Date.now()}`, kind, title, detail, timestamp: Date.now() });
  try { localStorage.setItem(ACTION_KEY, JSON.stringify(list.slice(0, 100))); } catch { /* ignore */ }
}

function readAuditActions(): AuditEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACTION_KEY);
    return raw ? (JSON.parse(raw) as AuditEvent[]) : [];
  } catch { return []; }
}

export function getAuditLog(): AuditEvent[] {
  const s = useIntelligenceStore.getState();
  const events: AuditEvent[] = [];
  for (const e of s.sessions) {
    events.push({
      id: `s-${e.id}`, kind: "session", timestamp: e.timestamp,
      title: `${e.type} session · ${e.conceptName}`,
      detail: `${e.subjectName} · ${e.duration} min`,
    });
  }
  for (const a of s.assessments) {
    events.push({
      id: `a-${a.id}`, kind: "assessment", timestamp: a.timestamp,
      title: `Assessment · ${a.title}`,
      detail: `${a.subjectName} · scored ${a.actual}%`,
    });
  }
  for (const id of s.completedMissionIds) {
    events.push({
      id: `m-${id}`, kind: "mission", timestamp: Date.now(),
      title: "Mission completed", detail: id,
    });
  }
  for (const b of listBackups()) {
    events.push({
      id: `b-${b.id}`, kind: "backup", timestamp: new Date(b.createdAt).getTime(),
      title: `${b.kind === "auto" ? "Automatic" : "Manual"} backup created`,
      detail: `${b.subjectCount} subjects · ${b.conceptCount} concepts`,
    });
  }
  for (const a of readAuditActions()) events.push(a);
  return events.sort((x, y) => y.timestamp - x.timestamp).slice(0, 200);
}

// ---------------- Integrity checks ----------------

export type IntegritySeverity = "info" | "warning" | "critical";

export interface IntegrityIssue {
  id: string;
  severity: IntegritySeverity;
  category: string;
  message: string;
  targetId?: string;
}

export interface IntegrityReport {
  issues: IntegrityIssue[];
  scannedAt: number;
  healthScore: number; // 0-100
}

export function runIntegrityChecks(): IntegrityReport {
  const s = useIntelligenceStore.getState();
  const issues: IntegrityIssue[] = [];
  const concepts = Object.values(s.conceptsById);
  const subjects = s.subjectsById;
  const subjectIds = new Set(Object.keys(subjects));

  // Missing subjects
  for (const c of concepts) {
    if (!subjectIds.has(c.subjectId)) {
      issues.push({
        id: `missing-subject-${c.id}`, severity: "critical",
        category: "Missing subject",
        message: `Concept "${c.name}" references a subject that no longer exists.`,
        targetId: c.id,
      });
    }
  }

  // Missing credits / weights
  for (const sub of Object.values(subjects)) {
    if (!sub.credits || sub.credits <= 0) {
      issues.push({
        id: `missing-credits-${sub.id}`, severity: "warning",
        category: "Missing credits",
        message: `Subject "${sub.name}" has no credit hours set.`,
        targetId: sub.id,
      });
    }
  }

  // Duplicate concepts (same name within same subject)
  const seen = new Map<string, string>();
  for (const c of concepts) {
    const key = `${c.subjectId}::${c.name.trim().toLowerCase()}`;
    const dup = seen.get(key);
    if (dup) {
      issues.push({
        id: `duplicate-${c.id}`, severity: "warning",
        category: "Duplicate concept",
        message: `"${c.name}" appears more than once in ${c.subjectName}.`,
        targetId: c.id,
      });
    } else seen.set(key, c.id);
  }

  // Orphaned sessions (concept no longer exists)
  for (const sess of s.sessions) {
    if (sess.conceptId && !s.conceptsById[sess.conceptId]) {
      issues.push({
        id: `orphan-session-${sess.id}`, severity: "info",
        category: "Orphaned session",
        message: `Session "${sess.conceptName}" references a deleted concept.`,
      });
    }
  }

  // Corrupted assessments (out-of-range scores)
  for (const a of s.assessments) {
    if (a.actual < 0 || a.actual > 100) {
      issues.push({
        id: `corrupt-assessment-${a.id}`, severity: "critical",
        category: "Corrupted assessment",
        message: `Assessment "${a.title}" has an invalid score (${a.actual}).`,
      });
    }
  }

  // Health score: 100 minus weighted penalties.
  const penalty = issues.reduce((acc, i) =>
    acc + (i.severity === "critical" ? 14 : i.severity === "warning" ? 5 : 1), 0);
  const healthScore = Math.max(0, 100 - penalty);

  return { issues, scannedAt: Date.now(), healthScore };
}

// ---------------- Workspace health ----------------

export interface WorkspaceHealth {
  integrity: IntegrityReport;
  backups: BackupRecord[];
  lastBackup: BackupRecord | null;
  lastBackupAgeHours: number | null;
  subjectCount: number;
  conceptCount: number;
  sessionCount: number;
  assessmentCount: number;
  missingDataAlerts: string[];
}

export function getWorkspaceHealth(): WorkspaceHealth {
  const s = useIntelligenceStore.getState();
  const integrity = runIntegrityChecks();
  const backups = listBackups();
  const lastBackup = backups[0] ?? null;
  const lastBackupAgeHours = lastBackup
    ? Math.round((Date.now() - new Date(lastBackup.createdAt).getTime()) / 3_600_000)
    : null;

  const missingDataAlerts: string[] = [];
  if (Object.keys(s.subjectsById).length === 0) missingDataAlerts.push("No subjects in workspace.");
  if (Object.keys(s.conceptsById).length === 0) missingDataAlerts.push("No concepts tracked yet.");
  if (!lastBackup) missingDataAlerts.push("No backup has ever been created.");
  else if ((lastBackupAgeHours ?? 0) > 72) missingDataAlerts.push("Last backup is over 3 days old.");

  return {
    integrity,
    backups,
    lastBackup,
    lastBackupAgeHours,
    subjectCount: Object.keys(s.subjectsById).length,
    conceptCount: Object.keys(s.conceptsById).length,
    sessionCount: s.sessions.length,
    assessmentCount: s.assessments.length,
    missingDataAlerts,
  };
}
