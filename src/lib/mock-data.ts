// Realistic mock data for the Scholaris Academic Intelligence OS

export type SubjectStatus = "dominant" | "stable" | "at-risk" | "critical";
export type ConceptStatus = "mastered" | "strong" | "developing" | "weak" | "forgotten";
export type MissionPriority = "critical" | "high" | "medium" | "low";
export type MissionType = "recovery" | "reinforcement" | "expansion" | "assessment" | "review";

export interface Subject {
  id: string;
  name: string;
  code: string;
  color: string;
  mastery: number;
  memory: number;
  roi: number;
  risk: number;
  status: SubjectStatus;
  concepts: number;
  weakConcepts: number;
  trend: number;
  nextAssessment?: string;
  hoursThisWeek: number;
  rank: number;
}

export interface Concept {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  status: ConceptStatus;
  mastery: number;
  memoryStrength: number;
  roi: number;
  risk: number;
  lastReviewed: string;
  reviewCount: number;
  decayRate: number;
  importance: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  priority: MissionPriority;
  subjectId: string;
  subjectName: string;
  conceptIds: string[];
  estimatedMinutes: number;
  roiScore: number;
  reason: string;
  dueBy?: string;
  completed: boolean;
}

export interface Insight {
  id: string;
  kind: "alert" | "roi" | "memory" | "risk" | "recommendation";
  title: string;
  body: string;
  subjectId?: string;
  timestamp: string;
  severity: "critical" | "high" | "info";
}

export const subjects: Subject[] = [
  {
    id: "sub-1", name: "Organic Chemistry", code: "CHEM 301", color: "oklch(0.72 0.16 250)",
    mastery: 78, memory: 84, roi: 92, risk: 22, status: "dominant",
    concepts: 142, weakConcepts: 8, trend: 4.2, nextAssessment: "2025-06-18",
    hoursThisWeek: 8.5, rank: 1,
  },
  {
    id: "sub-2", name: "Linear Algebra", code: "MATH 220", color: "oklch(0.72 0.16 155)",
    mastery: 71, memory: 68, roi: 85, risk: 34, status: "stable",
    concepts: 96, weakConcepts: 14, trend: 2.1, nextAssessment: "2025-06-22",
    hoursThisWeek: 6.2, rank: 2,
  },
  {
    id: "sub-3", name: "Cellular Biology", code: "BIO 240", color: "oklch(0.78 0.16 75)",
    mastery: 64, memory: 58, roi: 71, risk: 48, status: "stable",
    concepts: 188, weakConcepts: 27, trend: -1.4, nextAssessment: "2025-06-19",
    hoursThisWeek: 4.8, rank: 3,
  },
  {
    id: "sub-4", name: "Macroeconomics", code: "ECON 102", color: "oklch(0.65 0.22 320)",
    mastery: 52, memory: 49, roi: 64, risk: 67, status: "at-risk",
    concepts: 74, weakConcepts: 22, trend: -3.8, nextAssessment: "2025-06-16",
    hoursThisWeek: 2.1, rank: 4,
  },
  {
    id: "sub-5", name: "Quantum Mechanics", code: "PHYS 410", color: "oklch(0.62 0.22 25)",
    mastery: 38, memory: 41, roi: 58, risk: 82, status: "critical",
    concepts: 64, weakConcepts: 31, trend: -6.1, nextAssessment: "2025-06-15",
    hoursThisWeek: 1.2, rank: 5,
  },
  {
    id: "sub-6", name: "Modern Philosophy", code: "PHIL 215", color: "oklch(0.70 0.10 200)",
    mastery: 81, memory: 76, roi: 54, risk: 18, status: "dominant",
    concepts: 52, weakConcepts: 3, trend: 1.8,
    hoursThisWeek: 2.5, rank: 6,
  },
];

export const concepts: Concept[] = [
  { id: "c-1", name: "SN2 Reaction Mechanism", subjectId: "sub-1", subjectName: "Organic Chemistry", topic: "Substitution Reactions", status: "strong", mastery: 82, memoryStrength: 88, roi: 94, risk: 18, lastReviewed: "2d ago", reviewCount: 12, decayRate: 0.08, importance: 9 },
  { id: "c-2", name: "Stereochemistry of Chiral Centers", subjectId: "sub-1", subjectName: "Organic Chemistry", topic: "Stereochemistry", status: "developing", mastery: 58, memoryStrength: 62, roi: 89, risk: 42, lastReviewed: "5d ago", reviewCount: 7, decayRate: 0.14, importance: 10 },
  { id: "c-3", name: "Eigenvalues & Eigenvectors", subjectId: "sub-2", subjectName: "Linear Algebra", topic: "Spectral Theory", status: "mastered", mastery: 94, memoryStrength: 91, roi: 88, risk: 12, lastReviewed: "1d ago", reviewCount: 18, decayRate: 0.06, importance: 10 },
  { id: "c-4", name: "Gram-Schmidt Process", subjectId: "sub-2", subjectName: "Linear Algebra", topic: "Orthogonality", status: "weak", mastery: 34, memoryStrength: 28, roi: 76, risk: 71, lastReviewed: "14d ago", reviewCount: 3, decayRate: 0.22, importance: 8 },
  { id: "c-5", name: "Krebs Cycle", subjectId: "sub-3", subjectName: "Cellular Biology", topic: "Cellular Respiration", status: "developing", mastery: 61, memoryStrength: 55, roi: 82, risk: 38, lastReviewed: "4d ago", reviewCount: 9, decayRate: 0.12, importance: 9 },
  { id: "c-6", name: "Sodium-Potassium Pump", subjectId: "sub-3", subjectName: "Cellular Biology", topic: "Membrane Transport", status: "forgotten", mastery: 18, memoryStrength: 12, roi: 71, risk: 88, lastReviewed: "28d ago", reviewCount: 2, decayRate: 0.31, importance: 8 },
  { id: "c-7", name: "Phillips Curve", subjectId: "sub-4", subjectName: "Macroeconomics", topic: "Inflation & Unemployment", status: "weak", mastery: 41, memoryStrength: 38, roi: 68, risk: 64, lastReviewed: "9d ago", reviewCount: 4, decayRate: 0.18, importance: 7 },
  { id: "c-8", name: "Schrödinger Equation", subjectId: "sub-5", subjectName: "Quantum Mechanics", topic: "Wave Mechanics", status: "weak", mastery: 32, memoryStrength: 29, roi: 92, risk: 78, lastReviewed: "11d ago", reviewCount: 3, decayRate: 0.24, importance: 10 },
  { id: "c-9", name: "Hilbert Spaces", subjectId: "sub-5", subjectName: "Quantum Mechanics", topic: "Mathematical Foundations", status: "forgotten", mastery: 14, memoryStrength: 9, roi: 81, risk: 91, lastReviewed: "35d ago", reviewCount: 1, decayRate: 0.34, importance: 9 },
  { id: "c-10", name: "Kantian Categorical Imperative", subjectId: "sub-6", subjectName: "Modern Philosophy", topic: "Deontological Ethics", status: "mastered", mastery: 91, memoryStrength: 87, roi: 62, risk: 14, lastReviewed: "3d ago", reviewCount: 14, decayRate: 0.07, importance: 8 },
  { id: "c-11", name: "Diels-Alder Reaction", subjectId: "sub-1", subjectName: "Organic Chemistry", topic: "Pericyclic Reactions", status: "strong", mastery: 76, memoryStrength: 79, roi: 86, risk: 24, lastReviewed: "2d ago", reviewCount: 10, decayRate: 0.10, importance: 9 },
  { id: "c-12", name: "Singular Value Decomposition", subjectId: "sub-2", subjectName: "Linear Algebra", topic: "Matrix Decomposition", status: "developing", mastery: 54, memoryStrength: 51, roi: 90, risk: 46, lastReviewed: "6d ago", reviewCount: 5, decayRate: 0.16, importance: 10 },
];

export const missions: Mission[] = [
  { id: "m-1", title: "Recover Schrödinger Equation", description: "Decay risk is critical 11 days before exam. 20-minute targeted recovery sprint.", type: "recovery", priority: "critical", subjectId: "sub-5", subjectName: "Quantum Mechanics", conceptIds: ["c-8"], estimatedMinutes: 20, roiScore: 96, reason: "Highest weighted concept + critical decay", dueBy: "today", completed: false },
  { id: "m-2", title: "Reinforce Stereochemistry Chain", description: "Three connected concepts approaching memory decay threshold.", type: "reinforcement", priority: "high", subjectId: "sub-1", subjectName: "Organic Chemistry", conceptIds: ["c-2"], estimatedMinutes: 35, roiScore: 89, reason: "High ROI cluster with falling memory", dueBy: "today", completed: false },
  { id: "m-3", title: "Restore Sodium-Potassium Pump", description: "Forgotten concept tied to upcoming BIO 240 quiz.", type: "recovery", priority: "high", subjectId: "sub-3", subjectName: "Cellular Biology", conceptIds: ["c-6"], estimatedMinutes: 25, roiScore: 84, reason: "Forgotten + scheduled assessment", dueBy: "tomorrow", completed: false },
  { id: "m-4", title: "Diagnostic — Macroeconomics", description: "Assessment to recalibrate intelligence model. 12 questions, 18 minutes.", type: "assessment", priority: "high", subjectId: "sub-4", subjectName: "Macroeconomics", conceptIds: ["c-7"], estimatedMinutes: 18, roiScore: 78, reason: "Stale concept signals — model uncertainty rising", completed: false },
  { id: "m-5", title: "Expand SN2 → SN1 Bridge", description: "You mastered SN2 — extend to comparative mechanism analysis.", type: "expansion", priority: "medium", subjectId: "sub-1", subjectName: "Organic Chemistry", conceptIds: ["c-1"], estimatedMinutes: 40, roiScore: 71, reason: "Concept expansion from a mastered node", completed: false },
  { id: "m-6", title: "Review Eigenvalue Applications", description: "Maintenance review to preserve mastery streak.", type: "review", priority: "low", subjectId: "sub-2", subjectName: "Linear Algebra", conceptIds: ["c-3"], estimatedMinutes: 12, roiScore: 58, reason: "Spaced repetition window opening", completed: false },
  { id: "m-7", title: "Recover Hilbert Spaces", description: "Foundational concept blocking 6 downstream nodes.", type: "recovery", priority: "critical", subjectId: "sub-5", subjectName: "Quantum Mechanics", conceptIds: ["c-9"], estimatedMinutes: 45, roiScore: 93, reason: "Foundational dependency for 6 weak concepts", dueBy: "today", completed: false },
];

export const insights: Insight[] = [
  { id: "i-1", kind: "alert", title: "Quantum Mechanics is destabilizing", body: "Mastery dropped 6.1% this week. 31 concepts are weak or forgotten before the June 15 assessment.", subjectId: "sub-5", timestamp: "2h ago", severity: "critical" },
  { id: "i-2", kind: "roi", title: "Highest ROI right now: Schrödinger Equation", body: "20 minutes of recovery here yields a projected +4.2% subject mastery gain.", subjectId: "sub-5", timestamp: "2h ago", severity: "high" },
  { id: "i-3", kind: "memory", title: "Memory decay accelerating in Cellular Biology", body: "7 concepts crossed the forgetting threshold in the last 5 days.", subjectId: "sub-3", timestamp: "5h ago", severity: "high" },
  { id: "i-4", kind: "recommendation", title: "Shift 2 hours from Philosophy → Quantum Mechanics", body: "Philosophy is in dominant zone with low decay. Quantum is at critical risk with an exam in 3 days.", timestamp: "6h ago", severity: "high" },
  { id: "i-5", kind: "risk", title: "Macroeconomics exam risk: 67%", body: "Projected score 58–64% based on current concept readiness.", subjectId: "sub-4", timestamp: "1d ago", severity: "high" },
];

export const masteryTrend = [
  { day: "Mon", mastery: 62, memory: 58, roi: 71 },
  { day: "Tue", mastery: 64, memory: 60, roi: 73 },
  { day: "Wed", mastery: 63, memory: 59, roi: 72 },
  { day: "Thu", mastery: 67, memory: 62, roi: 76 },
  { day: "Fri", mastery: 69, memory: 65, roi: 78 },
  { day: "Sat", mastery: 71, memory: 68, roi: 81 },
  { day: "Sun", mastery: 73, memory: 70, roi: 84 },
];

export const focusToday = {
  totalMinutes: 95,
  completedMinutes: 38,
  sessionsCompleted: 2,
  sessionsPlanned: 5,
  conceptsReviewed: 14,
  conceptsRecovered: 3,
};

export const academicStatus = {
  overallMastery: 64,
  overallMemory: 61,
  overallRoi: 74,
  overallRisk: 45,
  activeSubjects: 6,
  totalConcepts: 616,
  weakConcepts: 105,
  masteredConcepts: 218,
  weeklyHours: 25.3,
  trend7d: 2.4,
};
