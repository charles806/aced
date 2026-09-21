// =============================================================================
// MOCK / SAMPLE DATA — ACED dashboard
// -----------------------------------------------------------------------------
// This file is the single source of sample data used to design the dashboard
// UI. It is NOT connected to a database and must not be treated as real user
// data anywhere in the UI.
//
// Subjects are now real data fetched from /api/subject (see
// components/dashboard/use-subjects.ts). The remaining constants below mirror
// the Prisma Note shape so swapping them for real data later is a drop-in
// replacement:
//
//   Prisma Note:    { id, title, fileName, subjectId, userId }
//
// UI-only fields (color, progress, ...) can be dropped or computed
// server-side once real data exists.
// =============================================================================

export type MockNote = {
  id: string;
  title: string;
  fileName: string;
  subjectId: string;
  subjectName: string;
  /** ISO date string — sample only. */
  createdAt: string;
};

export type MockContinueItem = {
  id: string;
  subject: string;
  subjectColorClass: string;
  topic: string;
  /** 0-100, sample only. */
  progress: number;
};

export type MockStat = {
  id: string;
  label: string;
  value: string;
  hint: string;
};

export type MockStudyDay = {
  id: string;
  label: string;
  /** Hours studied, sample only. */
  hours: number;
  isToday?: boolean;
};

export type MockCompletion = {
  id: string;
  subject: string;
  /** 0-100, sample only. */
  percent: number;
  colorClass: string;
};

export const MOCK_STATS: MockStat[] = [
  { id: "today", label: "Today's study time", value: "1h 36m", hint: "2 sessions" },
  { id: "streak", label: "Day streak", value: "12", hint: "days in a row" },
  { id: "subjects", label: "Active subjects", value: "4", hint: "in progress" },
  { id: "notes", label: "Notes", value: "8", hint: "across subjects" },
];

export const MOCK_CONTINUE_ITEMS: MockContinueItem[] = [
  {
    id: "cont_math",
    subject: "Mathematics",
    subjectColorClass: "bg-accent-500",
    topic: "Integration by parts",
    progress: 65,
  },
  {
    id: "cont_physics",
    subject: "Physics",
    subjectColorClass: "bg-sky-500",
    topic: "Newton's laws of motion",
    progress: 40,
  },
];

export const MOCK_NOTES: MockNote[] = [
  {
    id: "note_1",
    title: "Integration techniques",
    fileName: "integration-techniques.pdf",
    subjectId: "sub_math",
    subjectName: "Mathematics",
    createdAt: "2026-08-18T14:20:00.000Z",
  },
  {
    id: "note_2",
    title: "Newton's laws summary",
    fileName: "newtons-laws-summary.pdf",
    subjectId: "sub_physics",
    subjectName: "Physics",
    createdAt: "2026-08-17T09:05:00.000Z",
  },
  {
    id: "note_3",
    title: "WWII causes essay outline",
    fileName: "wwii-causes-outline.pdf",
    subjectId: "sub_history",
    subjectName: "History",
    createdAt: "2026-08-15T18:40:00.000Z",
  },
  {
    id: "note_4",
    title: "Spanish verb tenses",
    fileName: "spanish-verb-tenses.pdf",
    subjectId: "sub_spanish",
    subjectName: "Spanish",
    createdAt: "2026-08-12T11:15:00.000Z",
  },
];

export const MOCK_STUDY_HOURS: MockStudyDay[] = [
  { id: "mon", label: "Mon", hours: 1.25 },
  { id: "tue", label: "Tue", hours: 0.75 },
  { id: "wed", label: "Wed", hours: 1.75 },
  { id: "thu", label: "Thu", hours: 1.0 },
  { id: "fri", label: "Fri", hours: 0.5 },
  { id: "sat", label: "Sat", hours: 1.5 },
  { id: "sun", label: "Sun", hours: 1.6, isToday: true },
];

export const MOCK_COMPLETION: MockCompletion[] = [
  { id: "sub_math", subject: "Mathematics", percent: 65, colorClass: "bg-accent-500" },
  { id: "sub_physics", subject: "Physics", percent: 40, colorClass: "bg-sky-500" },
  { id: "sub_history", subject: "History", percent: 80, colorClass: "bg-amber-500" },
  { id: "sub_spanish", subject: "Spanish", percent: 25, colorClass: "bg-emerald-500" },
];
