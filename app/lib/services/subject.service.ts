/**
 * Subject service.
 * Contains business logic for subject operations.
 */

import { subjectRepository, type SubjectWithCounts, type CreateSubjectData, type UpdateSubjectData } from "@/app/lib/repositories";
import {
  BaseService,
  type ServiceResponse,
  success,
  notFoundError,
  internalError,
} from "./base.service";

export class SubjectService extends BaseService {
  protected readonly resourceName = "Subject";

  /**
   * List all subjects for a user with counts
   */
  async list(userId: string): Promise<ServiceResponse<SubjectWithCounts[]>> {
    return this.tryCatch(
      () => subjectRepository.findManyByUserId(userId),
      "Failed to list subjects"
    );
  }

  /**
   * Paginated list of subjects for a user
   */
  async listPaginated(
    userId: string,
    page: number,
    limit: number
  ): Promise<ServiceResponse<{ items: SubjectWithCounts[]; total: number; page: number; limit: number; totalPages: number }>> {
    return this.tryCatch(
      () => subjectRepository.findManyByUserIdPaginated(userId, { page, limit }),
      "Failed to list subjects"
    );
  }

  /**
   * Get a single subject by ID (with ownership check)
   */
  async getById(userId: string, subjectId: string): Promise<ServiceResponse<SubjectWithCounts | null>> {
    return this.tryCatch(async () => {
      const subject = await subjectRepository.findByIdAndUserId(subjectId, userId);
      if (!subject) {
        return notFoundError(this.resourceName);
      }

      // Get counts
      const subjectsWithCounts = await subjectRepository.findManyByUserId(userId);
      const withCounts = subjectsWithCounts.find((s) => s.id === subjectId);

      if (withCounts) {
        return success(withCounts);
      }

      // If not found in the list (shouldn't happen), return subject with zero counts
      return success({
        ...subject,
        _count: { notes: 0, studySessions: 0 },
      });
    }, "Failed to get subject");
  }

  /**
   * Create a new subject
   */
  async create(userId: string, data: CreateSubjectData): Promise<ServiceResponse<SubjectWithCounts>> {
    return this.tryCatch(async () => {
      const subject = await subjectRepository.create(userId, data);

      // Log activity
      await this.logActivity({
        userId,
        type: "subject_created",
        subjectId: subject.id,
        label: `Created subject "${subject.name}"`,
      });

      // Return with empty counts
      return success({
        ...subject,
        _count: { notes: 0, studySessions: 0 },
      });
    }, "Failed to create subject");
  }

  /**
   * Update a subject
   */
  async update(userId: string, subjectId: string, data: UpdateSubjectData): Promise<ServiceResponse<SubjectWithCounts>> {
    return this.tryCatch(async () => {
      // Verify ownership
      const owns = await subjectRepository.userOwnsSubject(userId, subjectId);
      if (!owns) {
        return notFoundError(this.resourceName);
      }

      const subject = await subjectRepository.update(subjectId, userId, data);

      // Log activity
      await this.logActivity({
        userId,
        type: "subject_updated",
        subjectId: subject.id,
        label: `Updated subject "${subject.name}"`,
      });

      // Get updated with counts
      const subjectsWithCounts = await subjectRepository.findManyByUserId(userId);
      const withCounts = subjectsWithCounts.find((s) => s.id === subjectId);

      return success(withCounts!);
    }, "Failed to update subject");
  }

  /**
   * Delete a subject (cascades to notes and study sessions)
   */
  async delete(userId: string, subjectId: string): Promise<ServiceResponse<{ deleted: true }>> {
    return this.tryCatch(async () => {
      // Verify ownership
      const subject = await subjectRepository.findByIdAndUserId(subjectId, userId);
      if (!subject) {
        return notFoundError(this.resourceName);
      }

      const subjectName = subject.name;

      // Delete (cascades to notes, study sessions via Prisma relations)
      await subjectRepository.delete(subjectId, userId);

      // Log activity
      await this.logActivity({
        userId,
        type: "subject_deleted",
        subjectId,
        label: `Deleted subject "${subjectName}"`,
      });

      return success({ deleted: true });
    }, "Failed to delete subject");
  }

  /**
   * Get subjects with stats for dashboard
   */
  async getStats(userId: string): Promise<ServiceResponse<Array<{ id: string; name: string; noteCount: number; studySessionCount: number }>>> {
    return this.tryCatch(
      () => subjectRepository.getSubjectsWithStats(userId),
      "Failed to get subject stats"
    );
  }
}

// Singleton instance
export const subjectService = new SubjectService();

// Export shared types
export type { ServiceResponse } from "./base.service";