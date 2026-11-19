/**
 * Standardized API response helpers.
 * All API routes should use these for consistent envelopes.
 */

import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// Types
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
  meta?: Record<string, unknown>;
}

// ============================================================================
// Error Codes
// ============================================================================

export const ErrorCode = {
  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Resources
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  ALREADY_EXISTS: "ALREADY_EXISTS",

  // Rate limiting
  RATE_LIMITED: "RATE_LIMITED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",

  // Server
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",

  // Database
  DATABASE_ERROR: "DATABASE_ERROR",
  UNIQUE_CONSTRAINT: "UNIQUE_CONSTRAINT",
  FOREIGN_KEY_CONSTRAINT: "FOREIGN_KEY_CONSTRAINT",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ============================================================================
// HTTP Status Mapping
// ============================================================================

export const ERROR_STATUS: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.SESSION_EXPIRED]: 401,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.QUOTA_EXCEEDED]: 403,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.UNIQUE_CONSTRAINT]: 409,
  [ErrorCode.FOREIGN_KEY_CONSTRAINT]: 400,
};

// ============================================================================
// Response Builders
// ============================================================================

export function success<T>(data: T, meta?: Record<string, unknown>): Response {
  const body: ApiSuccess<T> = { data };
  if (meta) body.meta = meta;
  return Response.json(body, { status: 200 });
}

export function created<T>(data: T, meta?: Record<string, unknown>): Response {
  const body: ApiSuccess<T> = { data };
  if (meta) body.meta = meta;
  return Response.json(body, { status: 201 });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export function paginated<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
  meta?: Record<string, unknown>
): Response {
  const totalPages = Math.ceil(total / limit);
  const pagination: PaginationMeta = {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };

  const body: PaginatedResponse<T> = {
    data: items,
    pagination,
  };

  if (meta) {
    body.meta = meta;
  }

  return Response.json(body, { status: 200 });
}

// ============================================================================
// Error Builders
// ============================================================================

export function error(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): Response {
  const status = ERROR_STATUS[code] ?? 500;
  const body = {
    error: {
      code,
      message,
      details,
    },
  };
  return Response.json(body, { status });
}

export function unauthorized(message = "Unauthorized", details?: Record<string, unknown>): Response {
  return error(ErrorCode.UNAUTHORIZED, message, details);
}

export function forbidden(message = "Forbidden", details?: Record<string, unknown>): Response {
  return error(ErrorCode.FORBIDDEN, message, details);
}

export function notFound(resource = "Resource", details?: Record<string, unknown>): Response {
  return error(ErrorCode.NOT_FOUND, `${resource} not found`, details);
}

export function conflict(message = "Conflict", details?: Record<string, unknown>): Response {
  return error(ErrorCode.CONFLICT, message, details);
}

export function validationError(message = "Validation failed", details?: Record<string, unknown>): Response {
  return error(ErrorCode.VALIDATION_ERROR, message, details);
}

export function internalError(message = "Internal server error", details?: Record<string, unknown>): Response {
  // Don't leak internal details in production
  const isDev = process.env.NODE_ENV === "development";
  return error(ErrorCode.INTERNAL_ERROR, isDev ? message : "Something went wrong", isDev ? details : undefined);
}

export function quotaExceeded(resource: string, limit: number, details?: Record<string, unknown>): Response {
  return error(ErrorCode.QUOTA_EXCEEDED, `Free tier limit reached: you can create up to ${limit} ${resource}`, details);
}

export function rateLimited(message = "Too many requests", details?: Record<string, unknown>): Response {
  return error(ErrorCode.RATE_LIMITED, message, details);
}

// ============================================================================
// Prisma Error Handling
// ============================================================================

export function handlePrismaError(error: unknown, resource = "Resource"): Response {
  console.error(`[Prisma Error] ${resource}:`, error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": // Unique constraint violation
        const target = error.meta?.target as string[] | undefined;
        return conflict(`${resource} already exists`, { field: target?.join(", ") });
      case "P2003": // Foreign key constraint violation
        return validationError(`Invalid reference`, { field: error.meta?.field_name });
      case "P2025": // Record not found
        return notFound(resource);
      default:
        return internalError(`Database error: ${error.code}`);
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return validationError("Invalid data provided");
  }

  return internalError("Database operation failed");
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function getValidatedBody<T>(req: Request): Promise<T | null> {
  return req.json().catch(() => null);
}

export function validateRequired<T extends Record<string, unknown>>(
  body: T | null,
  fields: (keyof T)[]
): { valid: true; data: T } | { valid: false; missing: string[] } {
  if (!body) return { valid: false, missing: fields as string[] };

  const missing = fields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
  });

  if (missing.length > 0) {
    return { valid: false, missing: missing as string[] };
  }

  return { valid: true, data: body };
}