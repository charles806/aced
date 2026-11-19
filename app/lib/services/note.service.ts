/**
 * Note service.
 * Contains business logic for note operations.
 */

import {
  noteRepository,
  type NoteWithSignedUrl,
  type CreateNoteData,
  type UpdateNoteData,
  type NoteFilters,
} from "@/app/lib/repositories";
import {
  BaseService,
  type ServiceResponse,
  success,
  notFoundError,
  forbiddenError,
  internalError,
  quotaExceededError,
} from "./base.service";
import { canUseFreeFeature, incrementUsage } from "@/app/lib/billing/limits";
import { FILE_UPLOAD } from "@/app/lib/config/constants";
import { inngest } from "@/inngest/client";
import { storage } from "@/app/lib/storage";

export class NoteService extends BaseService {
  protected readonly resourceName = "Note";

  /**
   * List all notes for a user with filters
   */
  async list(userId: string, filters: NoteFilters = {}): Promise<ServiceResponse<NoteWithSignedUrl[]>> {
    return this.tryCatch(
      () => noteRepository.findManyByUserId(userId, filters),
      "Failed to list notes"
    );
  }

  /**
   * Paginated list of notes for a user
   */
  async listPaginated(
    userId: string,
    page: number,
    limit: number,
    filters: NoteFilters = {}
  ): Promise<ServiceResponse<{ items: NoteWithSignedUrl[]; total: number; page: number; limit: number; totalPages: number }>> {
    return this.tryCatch(
      () => noteRepository.findManyByUserIdPaginated(userId, { page, limit }, filters),
      "Failed to list notes"
    );
  }

  /**
   * Get a single note by ID (with ownership check)
   */
  async getById(userId: string, noteId: string): Promise<ServiceResponse<NoteWithSignedUrl | null>> {
    return this.tryCatch(async () => {
      const note = await noteRepository.findByIdAndUserId(noteId, userId);
      if (!note) {
        return notFoundError(this.resourceName);
      }
      return success(note);
    }, "Failed to get note");
  }

  /**
   * Create a written note
   */
  async createWrittenNote(userId: string, data: CreateNoteData): Promise<ServiceResponse<NoteWithSignedUrl>> {
    return this.tryCatch(async () => {
      // Check free tier limit for notes upload
      const notesLimit = await canUseFreeFeature(userId, "notesUploaded");
      if (!notesLimit.allowed) {
        return quotaExceededError("notes", notesLimit.limit);
      }

      // Validate subject ownership (DB FK constraint will enforce)
      // We'll rely on the database foreign key constraint

      // Create the note
      const note = await noteRepository.create({
        ...data,
        userId,
      });

      await incrementUsage(userId, "notesUploaded");

      await this.logActivity({
        userId,
        type: "note_created",
        noteId: note.id,
        subjectId: note.subjectId,
        label: `Created note "${note.title}"`,
      });

      return success(note);
    }, "Failed to create note");
  }

  /**
   * Create a file note (with upload)
   */
  async createFileNote(
    userId: string,
    data: CreateNoteData & { fileBuffer: Buffer; fileName: string; fileType: string }
  ): Promise<ServiceResponse<NoteWithSignedUrl>> {
    return this.tryCatch(async () => {
      // Check free tier limit for notes upload
      const notesLimit = await canUseFreeFeature(userId, "notesUploaded");
      if (!notesLimit.allowed) {
        return quotaExceededError("notes", notesLimit.limit);
      }

      // Validate file size
      if (data.fileBuffer.length > FILE_UPLOAD.MAX_SIZE_BYTES) {
        return internalError("File must be 20MB or smaller");
      }

      // Validate file type
      if (!FILE_UPLOAD.ALLOWED_MIME_TYPES.includes(data.fileType as typeof FILE_UPLOAD.ALLOWED_MIME_TYPES[number])) {
        return internalError("Only PDF and image files are allowed");
      }

      // Validate file name length
      if (data.fileName.length > FILE_UPLOAD.MAX_FILE_NAME_LENGTH) {
        return internalError("File name too long");
      }

      // Upload to storage
      const key = `users/${userId}/notes/${crypto.randomUUID()}-${data.fileName}`;
      const uploadedFile = await storage.upload({
        key,
        body: data.fileBuffer,
        contentType: data.fileType,
        metadata: {
          userId,
          subjectId: data.subjectId,
          title: data.title,
        },
      });

      // Create note record
      const note = await noteRepository.create({
        title: data.title,
        subjectId: data.subjectId,
        userId,
        fileName: data.fileName,
        fileUrl: uploadedFile.url ?? uploadedFile.key,
        fileType: uploadedFile.contentType ?? data.fileType,
      });

      // Trigger extraction
      await inngest.send({
        name: "note/extraction.requested",
        data: { noteId: note.id },
      });

      await incrementUsage(userId, "notesUploaded");

      await this.logActivity({
        userId,
        type: "note_created",
        noteId: note.id,
        subjectId: note.subjectId,
        label: `Created note "${note.title}"`,
      });

      return success(note);
    }, "Failed to create note");
  }

  /**
   * Update a note
   */
  async update(userId: string, noteId: string, data: UpdateNoteData): Promise<ServiceResponse<NoteWithSignedUrl>> {
    return this.tryCatch(async () => {
      // Verify ownership
      const owns = await noteRepository.userOwnsNote(userId, noteId);
      if (!owns) {
        return forbiddenError(this.resourceName);
      }

      // Get current note to check if it's a written note
      const currentNote = await noteRepository.findByIdAndUserId(noteId, userId);
      if (!currentNote) {
        return notFoundError(this.resourceName);
      }

      // For written notes, validate content is provided
      if (!currentNote.fileUrl && data.content !== undefined && data.content !== null) {
        if (typeof data.content !== "string" || data.content.trim() === "") {
          return internalError("Please add some content to your note.");
        }
      }

      const note = await noteRepository.update(noteId, userId, data);

      await this.logActivity({
        userId,
        type: "note_updated",
        noteId: note.id,
        subjectId: note.subjectId,
        label: `Updated note "${note.title}"`,
      });

      return success(note);
    }, "Failed to update note");
  }

  /**
   * Delete a note
   */
  async delete(userId: string, noteId: string): Promise<ServiceResponse<{ deleted: true }>> {
    return this.tryCatch(async () => {
      const note = await noteRepository.findByIdAndUserId(noteId, userId);
      if (!note) {
        return notFoundError(this.resourceName);
      }

      // Delete file from storage if it exists
      if (note.fileUrl) {
        try {
          await storage.delete(note.fileUrl);
        } catch (_error) {
          console.error(`Note deletion storage error for ${noteId}:`, _error);
          return internalError("Failed to delete note file");
        }
      }

      await noteRepository.delete(noteId);

      await this.logActivity({
        userId,
        type: "note_deleted",
        noteId,
        subjectId: note.subjectId,
        label: `Deleted note "${note.title}"`,
      });

      return success({ deleted: true });
    }, "Failed to delete note");
  }

  /**
   * Re-extract note content
   */
  async reextract(userId: string, noteId: string): Promise<ServiceResponse<NoteWithSignedUrl>> {
    return this.tryCatch(async () => {
      const note = await noteRepository.findByIdAndUserId(noteId, userId);
      if (!note) {
        return notFoundError(this.resourceName);
      }

      if (!note.fileUrl) {
        return internalError("Only file notes can be re-extracted");
      }

      // Reset extraction status
      await noteRepository.updateExtraction(noteId, "", "pending");

      // Trigger extraction
      await inngest.send({
        name: "note/extraction.requested",
        data: { noteId },
      });

      const updated = await noteRepository.findByIdAndUserId(noteId, userId);
      return success(updated!);
    }, "Failed to re-extract note");
  }
}

// Singleton instance
export const noteService = new NoteService();

// Export shared types
export type { ServiceResponse } from "./base.service";