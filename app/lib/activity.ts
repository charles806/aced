import { prisma } from "@/app/lib/auth";

export type ActivityType =
  | "note_created"
  | "note_opened"
  | "subject_created"
  | "study_session_completed";

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