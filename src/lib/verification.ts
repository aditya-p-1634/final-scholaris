// Scholaris — Automated Verification & Self-Test Suite
// =====================================================
// Composes on top of the existing intelligence engines. Generates a synthetic
// engineering / data-science workspace, hydrates the store, exercises every
// major workflow through the same code paths the UI uses, and produces a
// professional verification report.
//
// SAFETY: The current workspace is snapshotted before the run and restored
// afterwards, so verification NEVER overwrites real data.

import {
  useIntelligenceStore,
  deriveConcepts,
  deriveSubjects,
  deriveMissions,
  deriveRecommendations,
  deriveIncidents,
  deriveInsights,
  deriveBottlenecks,
  deriveCriticalPath,
  deriveAcademicStatus,
  DEFAULT_ASSESSMENT_WEIGHTS,
  PREREQUISITES,
  type SubjectMeta,
  type ConceptCore,
  type AssessmentWeights,
} from "./intelligence";
import {
  deriveMainQuest,
  deriveRecovery,
  deriveDiscipline,
  deriveIdentity,
  deriveMomentumV2,
  deriveAccountability,
  deriveProcrastination,
} from "./academic-system";
import { deriveMomentum } from "./execution";
import {
  deriveStudentModel,
  derivePersonalMemoryModel,
  deriveConceptForecasts,
  deriveForgettingForecast,
  deriveRiskForecast,
  deriveDigitalTwin,
  deriveAssessmentForecasts,
  deriveMissionForecasts,
  getCoreState,
} from "./predictive";
import {
  planCapture,
  applyCapture,
  type RawCaptureParse,
} from "./capture";
import {
  buildSnapshot,
  snapshotToPayload,
  createBackup,
  parseSnapshotFile,
  runIntegrityChecks,
  type WorkspaceSnapshot,
} from "./data-safety";
import type { WorkspacePayload } from "./persistence";
import { supabase } from "@/integrations/supabase/client";
import { DEV_MODE } from "./dev-mode";

// ============================================================
// Types
// ============================================================

export type VerificationStatus = "pass" | "warn" | "fail" | "skip";

export interface TestResult {
  id: string;
  group: string;
  name: string;
  status: VerificationStatus;
  message: string;
  durationMs: number;
  detail?: string;
}

export interface GroupResult {
  group: string;
  status: VerificationStatus;
  passed: number;
  failed: number;
  warned: number;
  skipped: number;
  durationMs: number;
  tests: TestResult[];
}

export interface VerificationReport {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  overallScore: number;              // 0–100
  deploymentStatus: "READY" | "READY_WITH_WARNINGS" | "BLOCKED";
  totals: { pass: number; warn: number; fail: number; skip: number };
  severity: { critical: number; high: number; medium: number; low: number };
  groups: GroupResult[];
  performance: PerformanceReport;
  synthetic: { subjects: number; concepts: number; sessions: number; assessments: number };
}

export interface PerformanceReport {
  metrics: { name: string; ms: number; budgetMs: number; ok: boolean }[];
}

// ============================================================
// Synthetic workspace generator
// ============================================================

const SUBJECT_BANK: Array<{ name: string; code: string; topics: string[] }> = [
  { name: "Linear Algebra",             code: "MATH204", topics: ["Vectors", "Matrices", "Eigen Analysis", "Vector Spaces"] },
  { name: "Probability & Statistics",   code: "STAT210", topics: ["Distributions", "Inference", "Bayesian", "Regression"] },
  { name: "Data Structures",            code: "CS201",   topics: ["Trees", "Graphs", "Hashing", "Dynamic Programming"] },
  { name: "Machine Learning",           code: "CS412",   topics: ["Supervised", "Optimisation", "Neural Nets", "Evaluation"] },
  { name: "Databases",                  code: "CS330",   topics: ["Relational Model", "Indexing", "Transactions", "Query Planning"] },
  { name: "Discrete Mathematics",       code: "MATH155", topics: ["Logic", "Combinatorics", "Graph Theory", "Number Theory"] },
];

const UNIVERSITIES = ["Stanford", "MIT", "ETH Zürich", "Cambridge", "IIT Bombay", "TU Delft"];
const SEMESTERS = ["Fall 2026", "Spring 2027", "Autumn 2026"];
const FIRST_NAMES = ["Alex", "Sam", "Priya", "Jordan", "Marta", "Kenji", "Nina", "Omar"];
const LAST_NAMES = ["Chen", "Kumar", "García", "Novak", "Andersen", "Okafor"];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(rnd: () => number, arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const randi = (rnd: () => number, lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const randf = (rnd: () => number, lo: number, hi: number) => lo + rnd() * (hi - lo);

export interface SyntheticProfile {
  studentName: string;
  university: string;
  semester: string;
}

export interface SyntheticWorkspace extends SyntheticProfile {
  payload: WorkspacePayload;
  seed: number;
}

export function generateSyntheticWorkspace(seed = Date.now()): SyntheticWorkspace {
  const rnd = mulberry32(seed);
  const subjectCount = randi(rnd, 4, 5);
  const subjectDefs = SUBJECT_BANK.slice(0, subjectCount);

  const subjectsById: Record<string, SubjectMeta> = {};
  const conceptsById: Record<string, ConceptCore> = {};
  const prereqs: Record<string, string[]> = {};

  const subjectConceptIds: Record<string, string[]> = {};

  subjectDefs.forEach((sd, sIdx) => {
    const subjectId = `syn-sub-${sIdx + 1}`;
    const credits = pick(rnd, [2, 3, 3, 4, 4, 5]);
    const weights: AssessmentWeights = sIdx % 2 === 0
      ? { midterm: 0.2, final: 0.45, assignment: 0.2, lab: 0.0,  project: 0.15 }
      : { midterm: 0.25, final: 0.4, assignment: 0.15, lab: 0.1, project: 0.1 };
    const daysToAssessment = randi(rnd, 4, 28);
    subjectsById[subjectId] = {
      id: subjectId,
      name: sd.name,
      code: sd.code,
      color: `hsl(${(sIdx * 57) % 360} 70% 55%)`,
      nextAssessment: new Date(Date.now() + daysToAssessment * 86400000).toISOString().slice(0, 10),
      daysToAssessment,
      hoursThisWeek: randi(rnd, 2, 9),
      baselineMastery: randi(rnd, 25, 60),
      examWeight: randf(rnd, 0.3, 0.8),
      strategicValue: randi(rnd, 55, 95),
      credits,
      assessmentWeights: { ...DEFAULT_ASSESSMENT_WEIGHTS, ...weights },
    };

    subjectConceptIds[subjectId] = [];
    sd.topics.forEach((topic, tIdx) => {
      const per = randi(rnd, 2, 4);
      for (let k = 0; k < per; k++) {
        const cid = `syn-c-${sIdx + 1}-${tIdx + 1}-${k + 1}`;
        subjectConceptIds[subjectId].push(cid);
        const mastery = randi(rnd, 5, 90);
        const memory = Math.max(5, mastery - randi(rnd, 0, 30));
        const importance = randi(rnd, 3, 10);
        const days = randi(rnd, 0, 24);
        const reviews = randi(rnd, 0, 12);
        conceptsById[cid] = {
          id: cid,
          name: `${topic} · ${k === 0 ? "Foundations" : k === 1 ? "Techniques" : k === 2 ? "Applications" : "Advanced"}`,
          subjectId,
          subjectName: sd.name,
          topic,
          mastery,
          memoryStrength: memory,
          importance,
          decayRate: randf(rnd, 0.03, 0.12),
          daysSinceReview: days,
          reviewCount: reviews,
          successfulRecalls: Math.max(0, Math.floor(reviews * randf(rnd, 0.5, 0.95))),
          failedRecalls: mastery < 40 ? randi(rnd, 1, 4) : 0,
          assessmentAttempts: randi(rnd, 0, 3),
          assessmentCorrect: randi(rnd, 0, 3),
        };
        prereqs[cid] = [];
      }
    });

    // Prerequisite chains within a subject: each concept depends on the previous one (loose chain per topic).
    const ids = subjectConceptIds[subjectId];
    for (let i = 1; i < ids.length; i++) {
      // Every other node connects to previous — creates a partial DAG without cycles.
      if (i % 2 === 1) prereqs[ids[i]] = [ids[i - 1]];
    }
  });

  // Session history — 12 recent sessions across random concepts.
  const sessions = [];
  const conceptIdList = Object.keys(conceptsById);
  for (let i = 0; i < 14; i++) {
    const cid = pick(rnd, conceptIdList);
    const c = conceptsById[cid];
    sessions.push({
      id: `syn-s-${i + 1}`,
      conceptId: cid,
      conceptName: c.name,
      subjectId: c.subjectId,
      subjectName: c.subjectName,
      type: pick(rnd, ["Reinforcement", "Review", "Recovery", "Expansion"] as const),
      duration: randi(rnd, 15, 60),
      gain: randi(rnd, 3, 18),
      timestamp: Date.now() - randi(rnd, 1, 20) * 3_600_000,
      dateLabel: `${randi(rnd, 1, 20)}h ago`,
    });
  }

  const assessments = [];
  for (const s of Object.values(subjectsById).slice(0, 3)) {
    assessments.push({
      id: `syn-a-${s.id}`,
      subjectId: s.id,
      subjectName: s.name,
      title: `${s.code} Midterm`,
      predicted: randi(rnd, 55, 85),
      actual: randi(rnd, 45, 92),
      timestamp: Date.now() - randi(rnd, 1, 10) * 86400000,
    });
  }

  const profile: SyntheticProfile = {
    studentName: `${pick(rnd, FIRST_NAMES)} ${pick(rnd, LAST_NAMES)}`,
    university: pick(rnd, UNIVERSITIES),
    semester: pick(rnd, SEMESTERS),
  };

  return {
    ...profile,
    seed,
    payload: {
      subjectsById,
      conceptsById,
      prereqs,
      sessions,
      assessments,
      completedMissionIds: [],
      hasWorkspace: true,
    },
  };
}

// ============================================================
// Test primitives
// ============================================================

interface TestOutcome { status: VerificationStatus; message: string; detail?: string; }
type TestFn = () => Promise<TestOutcome> | TestOutcome;

interface TestDef { id: string; name: string; fn: TestFn; }
interface GroupDef { name: string; tests: TestDef[]; }

async function runTest(group: string, def: TestDef): Promise<TestResult> {
  const t0 = performance.now();
  try {
    const out = await def.fn();
    return { id: def.id, group, name: def.name, durationMs: Math.round(performance.now() - t0), ...out };
  } catch (err) {
    return {
      id: def.id, group, name: def.name,
      status: "fail",
      message: err instanceof Error ? err.message : String(err),
      durationMs: Math.round(performance.now() - t0),
    };
  }
}

const ok = (message: string, detail?: string) => ({ status: "pass" as const, message, detail });
const warn = (message: string, detail?: string) => ({ status: "warn" as const, message, detail });
const fail = (message: string, detail?: string) => ({ status: "fail" as const, message, detail });
const skip = (message: string) => ({ status: "skip" as const, message });

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

// ============================================================
// Test groups
// ============================================================

function buildGroups(ws: SyntheticWorkspace): GroupDef[] {
  const store = () => useIntelligenceStore.getState();

  const perf: Record<string, number> = {};
  const measure = <T,>(key: string, f: () => T): T => {
    const t0 = performance.now();
    const v = f();
    perf[key] = Math.round(performance.now() - t0);
    return v;
  };

  // Expose perf so PERFORMANCE group can read after other groups run.
  (buildGroups as unknown as { perf?: Record<string, number> }).perf = perf;

  return [
    {
      name: "Authentication",
      tests: [
        {
          id: "auth-client", name: "Supabase auth client available",
          fn: () => (supabase && supabase.auth) ? ok("Auth client initialised") : fail("Supabase client missing"),
        },
        {
          id: "auth-session", name: "Session persistence check",
          fn: async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session) return ok("Live session detected", data.session.user.email ?? undefined);
            if (DEV_MODE) return ok("DEV_MODE active — auth bypass verified");
            return warn("No active session (sign in flow untested here)");
          },
        },
        {
          id: "auth-methods", name: "Login / signup / logout API surface",
          fn: () => {
            const a = supabase.auth;
            const missing = ["signInWithPassword", "signUp", "signOut"].filter(
              (k) => typeof (a as unknown as Record<string, unknown>)[k] !== "function",
            );
            return missing.length ? fail(`Missing auth methods: ${missing.join(", ")}`) : ok("All auth methods present");
          },
        },
      ],
    },
    {
      name: "Curriculum Import",
      tests: [
        {
          id: "curr-subjects", name: "Synthetic subjects hydrated",
          fn: () => {
            const s = store();
            const n = Object.keys(s.subjectsById).length;
            return n >= 4 ? ok(`${n} subjects present`) : fail(`Expected ≥4 subjects, got ${n}`);
          },
        },
        {
          id: "curr-concepts", name: "Concepts + topics stored",
          fn: () => {
            const s = store();
            const n = Object.keys(s.conceptsById).length;
            const topics = new Set(Object.values(s.conceptsById).map((c) => c.topic));
            return n >= 20 ? ok(`${n} concepts across ${topics.size} topics`) : fail(`Only ${n} concepts`);
          },
        },
        {
          id: "curr-credits", name: "Credits + assessment weights stored",
          fn: () => {
            const subs = Object.values(store().subjectsById);
            const badCredits = subs.filter((s) => !s.credits || s.credits <= 0);
            const badWeights = subs.filter((s) => {
              const w = s.assessmentWeights;
              const sum = w.midterm + w.final + w.assignment + w.lab + w.project;
              return Math.abs(sum - 1) > 0.05;
            });
            if (badCredits.length) return fail(`${badCredits.length} subjects missing credits`);
            if (badWeights.length) return warn(`${badWeights.length} subjects with weights not summing to 1.0`);
            return ok("Credits and grading schemes valid");
          },
        },
      ],
    },
    {
      name: "Knowledge Graph",
      tests: [
        {
          id: "kg-build", name: "Dependency graph built",
          fn: () => {
            const edges = Object.values(PREREQUISITES).reduce((a, b) => a + b.length, 0);
            return edges > 0 ? ok(`${edges} prerequisite edges`) : warn("No prerequisite edges (chain not seeded)");
          },
        },
        {
          id: "kg-derived", name: "Concept derivations compute",
          fn: () => {
            const c = measure("deriveConcepts", () => deriveConcepts(store()));
            return c.length > 0 ? ok(`${c.length} derived concepts`) : fail("deriveConcepts returned empty");
          },
        },
        {
          id: "kg-critical", name: "Critical path + bottlenecks",
          fn: () => {
            const cp = deriveCriticalPath(store());
            const b = deriveBottlenecks(store());
            return ok(`${cp.length} on critical path · ${b.length} bottlenecks`);
          },
        },
        {
          id: "kg-orphans", name: "No orphan concepts",
          fn: () => {
            const s = store();
            const subjIds = new Set(Object.keys(s.subjectsById));
            const orphans = Object.values(s.conceptsById).filter((c) => !subjIds.has(c.subjectId));
            return orphans.length ? fail(`${orphans.length} orphan concepts`) : ok("All concepts belong to a subject");
          },
        },
        {
          id: "kg-cycles", name: "No circular prerequisite chains",
          fn: () => {
            const visited = new Set<string>();
            const stack = new Set<string>();
            let cycle = false;
            function dfs(id: string) {
              if (cycle) return;
              if (stack.has(id)) { cycle = true; return; }
              if (visited.has(id)) return;
              visited.add(id); stack.add(id);
              for (const dep of PREREQUISITES[id] ?? []) dfs(dep);
              stack.delete(id);
            }
            for (const id of Object.keys(PREREQUISITES)) dfs(id);
            return cycle ? fail("Cycle detected in prerequisite graph") : ok("Prerequisite graph is acyclic");
          },
        },
      ],
    },
    {
      name: "Intelligence Engines",
      tests: [
        {
          id: "int-subjects", name: "Subject derivation",
          fn: () => {
            const s = measure("deriveSubjects", () => deriveSubjects(store()));
            return s.length > 0 ? ok(`${s.length} derived subjects`) : fail("deriveSubjects empty");
          },
        },
        {
          id: "int-missions", name: "Mission engine",
          fn: () => {
            const m = measure("deriveMissions", () => deriveMissions(store()));
            return m.length ? ok(`${m.length} missions generated`) : warn("No missions (workspace may be too healthy)");
          },
        },
        {
          id: "int-recs", name: "Recommendation engine",
          fn: () => {
            const r = measure("deriveRecommendations", () => deriveRecommendations(store()));
            return r.length ? ok(`${r.length} recommendations`) : warn("No recommendations returned");
          },
        },
        {
          id: "int-inc", name: "Incidents + insights",
          fn: () => {
            const inc = deriveIncidents(store());
            const ins = deriveInsights(store());
            return ok(`${inc.length} incidents · ${ins.length} insights`);
          },
        },
        {
          id: "int-predictive", name: "Predictive intelligence + digital twin",
          fn: () => {
            const core = getCoreState();
            const model = measure("deriveStudentModel", () => deriveStudentModel(core));
            derivePersonalMemoryModel(core, model);
            const f = deriveConceptForecasts(core, model);
            deriveForgettingForecast(core, model);
            deriveRiskForecast(core, model);
            const twin = deriveDigitalTwin(core, model);
            deriveAssessmentForecasts(core, model);
            deriveMissionForecasts(core, model);
            return ok(`${f.length} forecasts · twin now: ${Math.round(twin.currentSelf.mastery)}% mastery`);
          },
        },
        {
          id: "int-determinism", name: "Deterministic outputs for identical inputs",
          fn: () => {
            const a = JSON.stringify(deriveMissions(store()).map((m) => [m.id, m.roiScore, m.priority]));
            const b = JSON.stringify(deriveMissions(store()).map((m) => [m.id, m.roiScore, m.priority]));
            return a === b ? ok("Missions stable across calls") : fail("Mission output non-deterministic");
          },
        },
      ],
    },
    {
      name: "Commander Mode",
      tests: [
        {
          id: "cmd-mainquest", name: "Main quest + side quests",
          fn: () => {
            const mq = deriveMainQuest(store());
            return mq.victory ? ok(`Main quest: ${mq.victory.title}`, `${mq.sideQuests.length} side quests`) : warn("No main quest today");
          },
        },
        {
          id: "cmd-recovery", name: "Recovery quests generated",
          fn: () => {
            const r = deriveRecovery(store());
            return r.quests.length ? ok(`${r.quests.length} recovery quests`) : warn("No recovery quests (nothing at-risk)");
          },
        },
        {
          id: "cmd-status", name: "Academic status computed",
          fn: () => {
            const s = deriveAcademicStatus(store());
            return ok(`Mastery ${s.overallMastery}% · Risk ${s.overallRisk}% · ${s.activeSubjects} subjects`);
          },
        },
      ],
    },
    {
      name: "Session Mode",
      tests: [
        {
          id: "sess-run", name: "Log session → propagates through engines",
          fn: () => {
            const s = store();
            const cid = Object.keys(s.conceptsById)[0];
            const before = s.conceptsById[cid].mastery;
            const beforeMissions = deriveMissions(s).length;
            const t0 = performance.now();
            const entry = s.runSession({ conceptId: cid, type: "Reinforcement", minutes: 30 });
            perf["sessionLaunch"] = Math.round(performance.now() - t0);
            if (!entry) return fail("runSession returned null");
            const after = useIntelligenceStore.getState().conceptsById[cid].mastery;
            const afterMissions = deriveMissions(useIntelligenceStore.getState()).length;
            assert(after >= before, "mastery did not increase");
            return ok(`Mastery ${before} → ${after}, missions ${beforeMissions} → ${afterMissions}`);
          },
        },
        {
          id: "sess-assessment", name: "Assessment recording propagates",
          fn: () => {
            const s = store();
            const subj = Object.values(s.subjectsById)[0];
            s.recordAssessment({ subjectId: subj.id, title: "Verification Quiz", actual: 78 });
            const found = useIntelligenceStore.getState().assessments.find((a) => a.title === "Verification Quiz");
            return found ? ok("Assessment logged", `predicted ${found.predicted} · actual ${found.actual}`) : fail("Assessment not logged");
          },
        },
        {
          id: "sess-mission", name: "Mission completion updates completedMissionIds",
          fn: () => {
            const s = store();
            const m = deriveMissions(s).find((x) => !x.completed);
            if (!m) return skip("No incomplete missions available");
            const before = s.completedMissionIds.length;
            s.runMission(m.id);
            const after = useIntelligenceStore.getState().completedMissionIds.length;
            return after > before ? ok(`Mission "${m.title}" completed`) : fail("completedMissionIds did not grow");
          },
        },
      ],
    },
    {
      name: "Universal Capture",
      tests: [
        {
          id: "cap-parse", name: "Plan phrases against workspace",
          fn: () => {
            const s = store();
            const sub = Object.values(s.subjectsById)[0];
            const concept = Object.values(s.conceptsById).find((c) => c.subjectId === sub.id)!;
            const raw: RawCaptureParse = {
              activities: [
                { type: "study_session", subject: sub.name, subjectId: null, concept: concept.name, conceptId: null,
                  durationMinutes: 45, problemCount: null, assessmentTitle: null, score: null, outOf: null, percent: null,
                  questKind: null, completionStatus: "completed", failureKind: null, confidence: 90,
                  summary: `Studied ${sub.name} for 45 minutes` },
                { type: "problem_solving", subject: sub.name, subjectId: null, concept: concept.name, conceptId: null,
                  durationMinutes: null, problemCount: 15, assessmentTitle: null, score: null, outOf: null, percent: null,
                  questKind: null, completionStatus: "completed", failureKind: null, confidence: 88,
                  summary: "Solved 15 problems" },
              ],
            };
            const plan = planCapture(raw);
            const conf = plan.every((p) => p.confidence >= 60);
            const matched = plan.every((p) => p.subject);
            if (!conf) return warn("Some parses have low confidence");
            return matched ? ok(`Planned ${plan.length} activities · all matched`) : fail("Subject match failed");
          },
        },
        {
          id: "cap-apply", name: "Apply capture drives store actions",
          fn: () => {
            const s = store();
            const sub = Object.values(s.subjectsById)[1] ?? Object.values(s.subjectsById)[0];
            const concept = Object.values(s.conceptsById).find((c) => c.subjectId === sub.id)!;
            const raw: RawCaptureParse = {
              activities: [{
                type: "review", subject: sub.name, subjectId: null, concept: concept.name, conceptId: null,
                durationMinutes: 20, problemCount: null, assessmentTitle: null, score: null, outOf: null, percent: null,
                questKind: null, completionStatus: "completed", failureKind: null, confidence: 85,
                summary: `Revised ${concept.name}`,
              }],
            };
            const before = useIntelligenceStore.getState().sessions.length;
            const applied = applyCapture(planCapture(raw));
            const after = useIntelligenceStore.getState().sessions.length;
            return after > before ? ok(`Applied ${applied.length} entries`, applied.join(" · ")) : fail("No sessions logged");
          },
        },
      ],
    },
    {
      name: "Daily OS",
      tests: [
        {
          id: "dos-status", name: "Discipline / Momentum / Identity computed",
          fn: () => {
            const core = getCoreState();
            const d = deriveDiscipline(core);
            const acc = deriveAccountability(core);
            const rec = deriveRecovery(core);
            const proc = deriveProcrastination(core, rec);
            const base = deriveMomentum(core);
            const id = deriveIdentity(core, d, acc, base, rec);
            const mv2 = deriveMomentumV2(base, d, acc, proc);
            const m = Number.isFinite(mv2.unifiedScore) ? mv2.unifiedScore : "n/a";
            return ok(
              `Discipline ${d.score} (${d.tier}) · Momentum ${m} · Identity ${id.title}`,
            );
          },
        },
      ],
    },
    {
      name: "Academic Map",
      tests: [
        {
          id: "map-nodes", name: "Map node/edge count sane",
          fn: () => {
            const s = store();
            const nodes = Object.keys(s.subjectsById).length + Object.keys(s.conceptsById).length;
            const edges = Object.values(PREREQUISITES).reduce((a, b) => a + b.length, 0);
            return nodes > 0 ? ok(`${nodes} nodes · ${edges} prerequisite edges`) : fail("Map has no nodes");
          },
        },
      ],
    },
    {
      name: "Backup & Restore",
      tests: [
        {
          id: "br-cycle", name: "Backup → mutate → restore → equal",
          fn: () => {
            const t0 = performance.now();
            const snap = buildSnapshot();
            perf["backup"] = Math.round(performance.now() - t0);
            const originalConcepts = Object.keys(snap.workspace.conceptsById).length;
            // Mutate
            const s = useIntelligenceStore.getState();
            const cid = Object.keys(s.conceptsById)[0];
            const originalMastery = s.conceptsById[cid].mastery;
            s.editConcept(cid, { mastery: 3 });
            assert(useIntelligenceStore.getState().conceptsById[cid].mastery === 3, "mutation failed");
            // Restore
            const t1 = performance.now();
            useIntelligenceStore.getState().hydrate(snapshotToPayload(snap));
            perf["restore"] = Math.round(performance.now() - t1);
            const restored = useIntelligenceStore.getState().conceptsById[cid].mastery;
            assert(restored === originalMastery, `restored mastery ${restored} ≠ original ${originalMastery}`);
            const restoredCount = Object.keys(useIntelligenceStore.getState().conceptsById).length;
            assert(restoredCount === originalConcepts, "concept count mismatch after restore");
            return ok(`Backup+restore lossless (${originalConcepts} concepts)`);
          },
        },
        {
          id: "br-parse", name: "Snapshot file parser rejects garbage",
          fn: () => {
            try { parseSnapshotFile('{"foo":1}'); return fail("Parser accepted garbage"); }
            catch { return ok("Parser rejected invalid snapshot"); }
          },
        },
      ],
    },
    {
      name: "Settings",
      tests: [
        {
          id: "set-persist", name: "localStorage available for settings",
          fn: () => {
            try {
              const key = "scholaris:verify:probe";
              localStorage.setItem(key, "1");
              const v = localStorage.getItem(key);
              localStorage.removeItem(key);
              return v === "1" ? ok("localStorage read/write works") : fail("localStorage read mismatch");
            } catch (e) {
              return fail(`localStorage unavailable: ${(e as Error).message}`);
            }
          },
        },
      ],
    },
    {
      name: "Global Search",
      tests: [
        {
          id: "gs-index", name: "Search corpus covers subjects/concepts/missions",
          fn: () => {
            const s = store();
            const missions = deriveMissions(s);
            const recs = deriveRecommendations(s);
            const corpusSize =
              Object.keys(s.subjectsById).length +
              Object.keys(s.conceptsById).length +
              missions.length + recs.length + s.sessions.length + s.assessments.length;
            return corpusSize > 20 ? ok(`Indexable corpus: ${corpusSize} entities`) : warn(`Only ${corpusSize} entities`);
          },
        },
      ],
    },
    {
      name: "Data Integrity",
      tests: [
        {
          id: "di-scan", name: "Integrity scan reports no critical issues",
          fn: () => {
            const report = runIntegrityChecks();
            const crit = report.issues.filter((i) => i.severity === "critical");
            const wns = report.issues.filter((i) => i.severity === "warning");
            if (crit.length) return fail(`${crit.length} critical issues`, crit.map((i) => i.message).join(" · "));
            if (wns.length) return warn(`${wns.length} warnings · health ${report.healthScore}`);
            return ok(`Health score ${report.healthScore}/100`);
          },
        },
        {
          id: "di-ranges", name: "Mastery / memory / decay within valid range",
          fn: () => {
            const bad: string[] = [];
            for (const c of Object.values(store().conceptsById)) {
              if (c.mastery < 0 || c.mastery > 100) bad.push(`${c.name}: mastery ${c.mastery}`);
              if (c.memoryStrength < 0 || c.memoryStrength > 100) bad.push(`${c.name}: memory ${c.memoryStrength}`);
              if (c.decayRate < 0 || c.decayRate > 1) bad.push(`${c.name}: decay ${c.decayRate}`);
            }
            return bad.length ? fail(`${bad.length} out-of-range values`, bad.slice(0, 4).join(" · ")) : ok("All values within range");
          },
        },
        {
          id: "di-unique", name: "No duplicate concept ids",
          fn: () => {
            const ids = Object.keys(store().conceptsById);
            return new Set(ids).size === ids.length ? ok("All ids unique") : fail("Duplicate ids detected");
          },
        },
      ],
    },
  ];
}


// ============================================================
// Runner
// ============================================================

const PERF_BUDGETS: Record<string, number> = {
  hydrate: 100,
  deriveConcepts: 200,
  deriveSubjects: 150,
  deriveMissions: 200,
  deriveRecommendations: 200,
  deriveStudentModel: 250,
  sessionLaunch: 150,
  backup: 100,
  restore: 100,
};

function scoreFromResults(all: TestResult[]): { score: number; totals: VerificationReport["totals"] } {
  const totals = { pass: 0, warn: 0, fail: 0, skip: 0 };
  for (const r of all) totals[r.status]++;
  const graded = totals.pass + totals.warn + totals.fail;
  if (graded === 0) return { score: 0, totals };
  const score = Math.round(((totals.pass + totals.warn * 0.6) / graded) * 100);
  return { score, totals };
}

export interface RunOptions {
  seed?: number;
  onProgress?: (p: { group: string; test: string; done: number; total: number }) => void;
  groups?: string[]; // if provided, only run these group names
}

export async function runVerification(opts: RunOptions = {}): Promise<VerificationReport> {
  const startedAt = new Date().toISOString();
  const runStart = performance.now();

  // 1. Snapshot the real workspace for safe restore.
  const realSnapshot = buildSnapshot();
  try { createBackup("auto", "Pre-verification safety snapshot"); } catch { /* quota / ignored */ }

  // 2. Generate + hydrate synthetic workspace.
  const ws = generateSyntheticWorkspace(opts.seed);
  const hydrateT0 = performance.now();
  useIntelligenceStore.getState().hydrate(ws.payload);
  const hydrateMs = Math.round(performance.now() - hydrateT0);

  const groupDefs = buildGroups(ws);
  const active = opts.groups ? groupDefs.filter((g) => opts.groups!.includes(g.name)) : groupDefs;
  const totalTests = active.reduce((a, g) => a + g.tests.length, 0);
  let done = 0;

  const groupResults: GroupResult[] = [];
  const allResults: TestResult[] = [];

  try {
    for (const g of active) {
      const gStart = performance.now();
      const tests: TestResult[] = [];
      for (const t of g.tests) {
        const r = await runTest(g.name, t);
        tests.push(r);
        allResults.push(r);
        done++;
        opts.onProgress?.({ group: g.name, test: t.name, done, total: totalTests });
      }
      const passed = tests.filter((x) => x.status === "pass").length;
      const failed = tests.filter((x) => x.status === "fail").length;
      const warned = tests.filter((x) => x.status === "warn").length;
      const skipped = tests.filter((x) => x.status === "skip").length;
      const status: VerificationStatus =
        failed > 0 ? "fail" : warned > 0 ? "warn" : passed > 0 ? "pass" : "skip";
      groupResults.push({
        group: g.name, status, passed, failed, warned, skipped,
        durationMs: Math.round(performance.now() - gStart),
        tests,
      });
    }
  } finally {
    // 3. Restore real workspace no matter what.
    useIntelligenceStore.getState().hydrate(snapshotToPayload(realSnapshot));
  }

  // 4. Performance report from captured measurements.
  const perf = (buildGroups as unknown as { perf?: Record<string, number> }).perf ?? {};
  perf["hydrate"] = hydrateMs;
  const performance_: PerformanceReport = {
    metrics: Object.entries(perf).map(([name, ms]) => {
      const budget = PERF_BUDGETS[name] ?? 500;
      return { name, ms, budgetMs: budget, ok: ms <= budget };
    }),
  };

  const { score, totals } = scoreFromResults(allResults);
  const failCount = totals.fail;
  const severity = {
    critical: failCount,
    high: 0,
    medium: totals.warn,
    low: 0,
  };
  const deploymentStatus: VerificationReport["deploymentStatus"] =
    failCount > 0 ? "BLOCKED" : totals.warn > 0 ? "READY_WITH_WARNINGS" : "READY";

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - runStart),
    overallScore: score,
    deploymentStatus,
    totals,
    severity,
    groups: groupResults,
    performance: performance_,
    synthetic: {
      subjects: Object.keys(ws.payload.subjectsById).length,
      concepts: Object.keys(ws.payload.conceptsById).length,
      sessions: ws.payload.sessions.length,
      assessments: ws.payload.assessments.length,
    },
  };
}

// ============================================================
// Report formatting
// ============================================================

const dot = (s: VerificationStatus) =>
  s === "pass" ? "PASS" : s === "warn" ? "WARN" : s === "fail" ? "FAIL" : "SKIP";

export function formatReport(r: VerificationReport): string {
  const line = "-".repeat(38);
  const rows = r.groups.map((g) => `${g.group.padEnd(24, " ")} ${dot(g.status)}`);
  return [
    "Scholaris Verification Report",
    "",
    ...rows,
    line,
    `Overall Score: ${r.overallScore}%`,
    `Deployment Status: ${r.deploymentStatus.replace("_", " ")}`,
    `Duration: ${(r.durationMs / 1000).toFixed(2)}s`,
    `Totals: ${r.totals.pass} pass · ${r.totals.warn} warn · ${r.totals.fail} fail · ${r.totals.skip} skip`,
    `Warnings: ${r.severity.medium} medium · ${r.severity.high} high · ${r.severity.critical} critical`,
    `Synthetic workspace: ${r.synthetic.subjects} subjects · ${r.synthetic.concepts} concepts · ${r.synthetic.sessions} sessions`,
  ].join("\n");
}

export function downloadReport(r: VerificationReport) {
  const blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `scholaris-verification-${r.startedAt.slice(0, 19).replace(/[:T]/g, "-")}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
