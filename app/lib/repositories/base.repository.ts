/**
 * Base repository class.
 * Provides common database operations and error handling.
 */

import { prisma } from "@/app/lib/auth";
import { handlePrismaError } from "@/app/lib/responses";
import type { Prisma } from "@/app/generated/prisma/client";

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export abstract class BaseRepository {
  protected prisma = prisma;

  /**
   * Calculate pagination metadata
   */
  protected getPaginationMeta(total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit);
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Execute a query with standard error handling
   */
  protected async execute<T>(operation: () => Promise<T>, resource: string): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw handlePrismaError(error, resource);
    }
  }

  /**
   * Build paginated query options
   */
  protected buildPaginatedQuery<T extends { where?: unknown; orderBy?: unknown }>(
    baseQuery: T,
    pagination: PaginationParams
  ): T & { skip: number; take: number } {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    return { ...baseQuery, skip, take: limit };
  }

  /**
   * Execute paginated query with count
   */
  protected async paginate<T, TWhere, TOrderBy>(
    findMany: (args: { where?: TWhere; orderBy?: TOrderBy; skip: number; take: number }) => Promise<T[]>,
    count: (args: { where?: TWhere }) => Promise<number>,
    where: TWhere | undefined,
    orderBy: TOrderBy | undefined,
    pagination: PaginationParams
  ): Promise<PaginatedResult<T>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      findMany({ where, orderBy, skip, take: limit }),
      count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}