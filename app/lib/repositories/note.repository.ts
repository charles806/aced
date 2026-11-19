/**
 * Note repository.
 * Data access layer for notes.
 */

import { BaseRepository, type PaginatedResult } from "@/app/lib/repositories/base.repository";
import { prisma } from "@/app/lib/auth";
import { Prisma } from "@/app/generated/prisma/client";

export interface NoteWithSignedUrl {
  id: string;
  title: string;
  content: string | null;
  fileName: string | null;
  fileUrl: string | null;
  fileType: string | null;
  extractedText: string | null;
  extractionStatus: string;
  extractionError: string | null;
  summary: string | null;
  summaryStatus: string;
  summaryError: string | null;
  summaryUpdatedAt: Date | null;
  summaryModel: string | null;
  summaryLength: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  subjectId: string;
  signedUrl: string | null;
}

// Note without signed URL - for internal use
interface NoteBase {
  id: string;
  title: string;
  content: string | null;
  fileName: string | null;
  fileUrl: string | null;
  fileType: string | null;
  extractedText: string | null;
  extractionStatus: string;
  extractionError: string | null;
  summary: string | null;
  summaryStatus: string;
  summaryError: string | null;
  summaryUpdatedAt: Date | null;
  summaryModel: string | null;
  summaryLength: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  subjectId: string;
}

export interface NoteFilters {
  subjectId?: string;
  search?: string;
  fileType?: string;
}

export interface CreateNoteData {
  title: string;
  subjectId: string;
  userId: string;
  content?: string;
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
}

export interface UpdateNoteData {
  title?: string;
  subjectId?: string;
  content?: string | null;
}

export class NoteRepository extends BaseRepository {
  /**
   * Find a note by ID and user ID (ownership check)
   */
  async findByIdAndUserId(noteId: string, userId: string): Promise<NoteWithSignedUrl | null> {
    const note = await prisma.note.findFirst({
      where: { id: noteId, userId },
    });
    if (!note) return null;
    return this.mapToWithSignedUrl(note);
  }

  /**
   * Find many notes by user ID with filters
   */
  async findManyByUserId(userId: string, filters: NoteFilters = {}): Promise<NoteWithSignedUrl[]> {
    const where = this.buildWhereClause(userId, filters);

    const notes = await prisma.note.findMany({
      where,
      orderBy: { createdAt: "desc" } as Prisma.NoteOrderByWithRelationInput,
    });

    return Promise.all(notes.map((note) => this.mapToWithSignedUrl(note)));
  }

  /**
   * Find many notes by user ID with pagination
   */
  async findManyByUserIdPaginated(
    userId: string,
    pagination: { page: number; limit: number },
    filters: NoteFilters = {}
  ): Promise<PaginatedResult<NoteWithSignedUrl>> {
    const where = this.buildWhereClause(userId, filters);
    return this.paginate(
      (args) => prisma.note.findMany(args) as Promise<NoteWithSignedUrl[]>,
      (args) => prisma.note.count(args),
      where,
      { createdAt: "desc" } as Prisma.NoteOrderByWithRelationInput,
      pagination
    );
  }

  /**
   * Create a new note
   */
  async create(data: CreateNoteData): Promise<NoteWithSignedUrl> {
    const note = await prisma.note.create({
      data: {
        title: data.title,
        content: data.content ?? null,
        fileName: data.fileName ?? null,
        fileUrl: data.fileUrl ?? null,
        fileType: data.fileType ?? null,
        userId: data.userId,
        subjectId: data.subjectId,
      },
    });
    return this.mapToWithSignedUrl(note);
  }

  /**
   * Update a note
   */
  async update(noteId: string, userId: string, data: UpdateNoteData): Promise<NoteWithSignedUrl> {
    const note = await prisma.note.update({
      where: { id: noteId },
      data: {
        title: data.title,
        subjectId: data.subjectId,
        content: data.content,
        updatedAt: new Date(),
      },
    });
    return this.mapToWithSignedUrl(note);
  }

  /**
   * Delete a note
   */
  async delete(noteId: string): Promise<void> {
    await prisma.note.delete({
      where: { id: noteId },
    });
  }

  /**
   * Check if user owns a note
   */
  async userOwnsNote(userId: string, noteId: string): Promise<boolean> {
    const count = await prisma.note.count({
      where: { id: noteId, userId },
    });
    return count > 0;
  }

  /**
   * Update note extraction status and extracted text
   */
  async updateExtraction(noteId: string, extractedText: string, status: string, error?: string): Promise<NoteWithSignedUrl> {
    const note = await prisma.note.update({
      where: { id: noteId },
      data: {
        extractedText,
        extractionStatus: status,
        extractionError: error ?? null,
      },
    });
    return this.mapToWithSignedUrl(note);
  }

  /**
   * Update note summary
   */
  async updateSummary(
    noteId: string,
    summary: string,
    status: string,
    model?: string,
    length?: string,
    error?: string
  ): Promise<NoteWithSignedUrl> {
    const note = await prisma.note.update({
      where: { id: noteId },
      data: {
        summary,
        summaryStatus: status,
        summaryError: error ?? null,
        summaryUpdatedAt: new Date(),
        summaryModel: model ?? null,
        summaryLength: length ?? null,
      },
    });
    return this.mapToWithSignedUrl(note);
  }

  /**
   * Build where clause for note queries
   */
  private buildWhereClause(userId: string, filters: NoteFilters): Prisma.NoteWhereInput {
    const where: Prisma.NoteWhereInput = { userId };

    if (filters.subjectId) {
      where.subjectId = filters.subjectId;
    }

    if (filters.search) {
      where.title = {
        contains: filters.search.trim(),
        mode: "insensitive",
      };
    }

    if (filters.fileType) {
      const trimmed = filters.fileType.trim();
      if (trimmed === "written") {
        where.fileType = null;
      } else if (trimmed.endsWith("/*")) {
        where.fileType = { startsWith: trimmed.slice(0, -1) };
      } else {
        where.fileType = { equals: trimmed };
      }
    }

    return where;
  }

  /**
   * Map note to NoteWithSignedUrl (signed URL generated lazily by caller if needed)
   */
  private async mapToWithSignedUrl(note: NoteBase): Promise<NoteWithSignedUrl> {
    return {
      ...note,
      signedUrl: note.fileUrl ? await this.getSignedUrl(note.fileUrl) : null,
    };
  }

  /**
   * Get signed URL for file access
   * This is a thin wrapper - actual implementation uses storage lib
   */
  private async getSignedUrl(fileUrl: string): Promise<string | null> {
    // Import dynamically to avoid circular dependency
    const { getSignedFileUrl } = await import("@/app/lib/storage");
    try {
      return await getSignedFileUrl(fileUrl);
    } catch {
      return fileUrl; // Fallback to original URL
    }
  }
}

// Singleton instance
export const noteRepository = new NoteRepository();