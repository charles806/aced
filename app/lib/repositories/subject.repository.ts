/**
 * Subject repository.
 * Handles all database operations for subjects.
 */

import { BaseRepository, type PaginationParams, type PaginatedResult } from "./base.repository";
import { prisma } from "@/app/lib/auth";
import type { Subject, Prisma } from "@/app/generated/prisma/client";

export interface SubjectWithCounts extends Subject {
  _count: {
    notes: number;
    studySessions: number;
  };
}

export interface CreateSubjectData {
  name: string;
}

export interface UpdateSubjectData {
  name?: string;
}

export class SubjectRepository extends BaseRepository {
  /**
   * Find a subject by ID and user ID (ownership check)
   */
  async findByIdAndUserId(id: string, userId: string): Promise<Subject | null> {
    return this.execute(
      () =>
        this.prisma.subject.findFirst({
          where: { id, userId },
        }),
      "Subject"
    );
  }

  /**
   * Find a subject by ID only (for admin or internal use)
   */
  async findById(id: string): Promise<Subject | null> {
    return this.execute(
      () => this.prisma.subject.findUnique({ where: { id } }),
      "Subject"
    );
  }

  /**
   * List all subjects for a user with note and study session counts
   */
  async findManyByUserId(userId: string): Promise<SubjectWithCounts[]> {
    return this.execute(
      () =>
        this.prisma.subject.findMany({
          where: { userId },
          include: {
            _count: {
              select: { notes: true, studySessions: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
      "Subject"
    );
  }

  /**
   * Paginated list of subjects for a user
   */
  async findManyByUserIdPaginated(
    userId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<SubjectWithCounts>> {
    const where: Prisma.SubjectWhereInput = { userId };
    const orderBy: Prisma.SubjectOrderByWithRelationInput = { createdAt: "desc" };

    return this.paginate(
      (args) =>
        this.prisma.subject.findMany({
          ...args,
          include: {
            _count: {
              select: { notes: true, studySessions: true },
            },
          },
        }),
      (args) => this.prisma.subject.count(args),
      where,
      orderBy,
      pagination
    );
  }

  /**
   * Create a new subject
   */
  async create(userId: string, data: CreateSubjectData): Promise<Subject> {
    return this.execute(
      () =>
        this.prisma.subject.create({
          data: {
            name: data.name,
            userId,
          },
        }),
      "Subject"
    );
  }

  /**
   * Update a subject (ownership verified)
   */
  async update(id: string, userId: string, data: UpdateSubjectData): Promise<Subject> {
    return this.execute(
      () =>
        this.prisma.subject.update({
          where: { id },
          data: {
            name: data.name,
          },
        }),
      "Subject"
    );
  }

  /**
   * Delete a subject (ownership verified, cascades to notes/study sessions)
   */
  async delete(id: string, userId: string): Promise<Subject> {
    return this.execute(
      () =>
        this.prisma.subject.delete({
          where: { id },
        }),
      "Subject"
    );
  }

  /**
   * Check if user owns a subject
   */
  async userOwnsSubject(userId: string, subjectId: string): Promise<boolean> {
    const subject = await this.findByIdAndUserId(subjectId, userId);
    return subject !== null;
  }

  /**
   * Get subject count for a user
   */
  async countByUserId(userId: string): Promise<number> {
    return this.execute(
      () => this.prisma.subject.count({ where: { userId } }),
      "Subject"
    );
  }

  /**
   * Get subjects with note counts for dashboard stats
   */
  async getSubjectsWithStats(userId: string): Promise<
    Array<{
      id: string;
      name: string;
      noteCount: number;
      studySessionCount: number;
    }>
  > {
    return this.execute(
      () =>
        this.prisma.subject.findMany({
          where: { userId },
          select: {
            id: true,
            name: true,
            _count: {
              select: { notes: true, studySessions: true },
            },
          },
          orderBy: { createdAt: "desc" },
        }).then((subjects) =>
          subjects.map((s) => ({
            id: s.id,
            name: s.name,
            noteCount: s._count.notes,
            studySessionCount: s._count.studySessions,
          }))
        ),
      "Subject"
    );
  }
}

// Singleton instance
export const subjectRepository = new SubjectRepository();