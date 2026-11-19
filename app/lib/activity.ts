import { prisma } from "@/app/lib/auth";

export type ActivityType =
  | "note_created"
  | "note_opened"
  | "subject_created"
  | "study_session_completed"
  | "flashcard_deck_created"
  | "flashcard_deck_deleted"
  | "quiz_created"
  | "quiz_updated"
  | "quiz_deleted"
  | "quiz_attempt_started"
  | "quiz_attempt_submitted";

type CreateActivityInput = {
  userId: string;
  type: ActivityType;
  noteId?: string | null;
  subjectId?: string | null;
  label: string;
};

export async function createActivity({
  userId,
  type,
  noteId,
  subjectId,
  label,
}: CreateActivityInput) {
  try {
    await prisma.activity.create({
      data: {
        userId,
        type,
        noteId: noteId ?? null,
        subjectId: subjectId ?? null,
        label,
      },
    });
  } catch (error) {
    // Activity tracking must never break the primary operation.
    console.error("createActivity failed:", error);
  }
}