import { prisma } from "@/app/lib/auth";
import { ACTIVITY_TYPES, type ActivityType } from "@/app/lib/config/constants";

export type { ActivityType };

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