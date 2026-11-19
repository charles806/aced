/**
 * Base service layer.
 * Shared types, error handling, and common patterns for all services.
 */

import type { ActivityType } from "@/app/lib/config/constants";
import type { LimitKey } from "@/app/lib/billing/limits";

// ============================================================================
// Shared Service Response Types
// ============================================================================

export interface ServiceResult<T> {
  success: true;
  data: T;
}

export interface ServiceError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ServiceResponse<T> = ServiceResult<T> | ServiceError;

// ============================================================================
// Error Code Constants
// ============================================================================

export const ServiceErrorCode = {
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  CONFLICT: "CONFLICT",
  UNPROCESSABLE_ENTITY: "UNPROCESSABLE_ENTITY",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

export type ServiceErrorCode = (typeof ServiceErrorCode)[keyof typeof ServiceErrorCode];

// ============================================================================
// Error Factory Functions
// ============================================================================

export function createError(
  code: ServiceErrorCode,
  message: string,
  details?: Record<string, unknown>
): ServiceError {
  return {
    success: false,
    error: { code, message, details },
  };
}

export function notFoundError(resource = "Resource", details?: Record<string, unknown>): ServiceError {
  return createError(ServiceErrorCode.NOT_FOUND, `${resource} not found`, details);
}

export function forbiddenError(resource = "Resource", details?: Record<string, unknown>): ServiceError {
  return createError(ServiceErrorCode.FORBIDDEN, `${resource} not found`, details);
}

export function quotaExceededError(resource: string, limit: number, details?: Record<string, unknown>): ServiceError {
  return createError(
    ServiceErrorCode.QUOTA_EXCEEDED,
    `Free tier limit reached: you can create up to ${limit} ${resource}. Upgrade to Pro for unlimited.`,
    { limit, ...details }
  );
}

export function conflictError(message: string, details?: Record<string, unknown>): ServiceError {
  return createError(ServiceErrorCode.CONFLICT, message, details);
}

export function unprocessableEntityError(message: string, details?: Record<string, unknown>): ServiceError {
  return createError(ServiceErrorCode.UNPROCESSABLE_ENTITY, message, details);
}

export function serviceUnavailableError(message: string, details?: Record<string, unknown>): ServiceError {
  return createError(ServiceErrorCode.SERVICE_UNAVAILABLE, message, details);
}

export function internalError(message = "Internal server error", details?: Record<string, unknown>): ServiceError {
  return createError(ServiceErrorCode.INTERNAL_ERROR, message, details);
}

export function validationError(message = "Validation failed", details?: Record<string, unknown>): ServiceError {
  return createError(ServiceErrorCode.VALIDATION_ERROR, message, details);
}

// ============================================================================
// Success Factory Functions
// ============================================================================

export function success<T>(data: T): ServiceResult<T> {
  return { success: true, data };
}

// ============================================================================
// Async Error Handling Wrapper
// ============================================================================

export async function tryCatch<T>(
  operation: () => Promise<ServiceResponse<T> | T>,
  errorMessage: string,
  errorCode: ServiceErrorCode = ServiceErrorCode.INTERNAL_ERROR
): Promise<ServiceResponse<T>> {
  try {
    const result = await operation();
    // If the operation already returns a ServiceResponse, return it directly
    if (result && typeof result === "object" && "success" in result) {
      return result as ServiceResponse<T>;
    }
    // Otherwise wrap in success
    return success(result as T);
  } catch (error) {
    // If it's already a ServiceError, pass it through
    if (error && typeof error === "object" && "success" in error && error.success === false) {
      return error as ServiceError;
    }
    console.error(`[Service Error] ${errorMessage}:`, error);
    return createError(errorCode, errorMessage);
  }
}

// ============================================================================
// Ownership Verification Helper
// ============================================================================

export type OwnershipChecker<T> = (
  userId: string,
  resourceId: string
) => Promise<{ owns: boolean; resource?: T }>;

export async function verifyOwnership<T>(
  userId: string,
  resourceId: string,
  checker: OwnershipChecker<T>,
  resourceName = "Resource"
): Promise<{ ok: true; resource: T } | ServiceError> {
  const result = await checker(userId, resourceId);
  if (!result.owns || !result.resource) {
    return notFoundError(resourceName);
  }
  return { ok: true, resource: result.resource };
}

// ============================================================================
// Activity Logging Helper
// ============================================================================

export interface ActivityInput {
  userId: string;
  type: ActivityType;
  label: string;
  subjectId?: string;
  noteId?: string;
}

export async function logActivity(activity: ActivityInput): Promise<void> {
  const { createActivity } = await import("@/app/lib/activity");
  await createActivity(activity);
}

// ============================================================================
// Free Tier Quota Helper
// ============================================================================

export interface QuotaCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
}

export type QuotaChecker = (userId: string, feature: LimitKey) => Promise<QuotaCheckResult>;
export type UsageIncrementer = (userId: string, feature: LimitKey) => Promise<void>;

// Helper type to check if a value is a ServiceError
function isServiceError<T>(value: ServiceResponse<T>): value is ServiceError {
  return value.success === false;
}

export async function checkQuota(
  userId: string,
  feature: LimitKey,
  checker: QuotaChecker,
  resourceName: string
): Promise<QuotaCheckResult> {
  const result = await checker(userId, feature);
  if (!result.allowed) {
    throw quotaExceededError(resourceName, result.limit);
  }
  return result;
}

export async function incrementQuota(
  userId: string,
  feature: LimitKey,
  incrementer: UsageIncrementer
): Promise<void> {
  await incrementer(userId, feature);
}

// ============================================================================
// Pagination Helpers
// ============================================================================

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function createPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number
): PaginatedData<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ============================================================================
// Common Types
// ============================================================================

// Client-safe quiz question (without correct answer/explanation)
export interface ClientQuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  position: number;
}

// ============================================================================
// Base Service Class (Optional - for services that want inheritance)
// ============================================================================

export abstract class BaseService {
  protected abstract readonly resourceName: string;

  protected async tryCatch<T>(
    operation: () => Promise<ServiceResponse<T> | T>,
    errorMessage: string,
    errorCode: ServiceErrorCode = ServiceErrorCode.INTERNAL_ERROR
  ): Promise<ServiceResponse<T>> {
    return tryCatch(operation, errorMessage, errorCode);
  }

  protected async verifyOwnership<T>(
    userId: string,
    resourceId: string,
    checker: OwnershipChecker<T>
  ): Promise<{ ok: true; resource: T } | ServiceError> {
    return verifyOwnership(userId, resourceId, checker, this.resourceName);
  }

  protected async logActivity(input: ActivityInput): Promise<void> {
    await logActivity(input);
  }

  protected async checkQuota(
    userId: string,
    feature: LimitKey,
    checker: QuotaChecker,
    resourceName: string
  ): Promise<QuotaCheckResult> {
    return checkQuota(userId, feature, checker, resourceName);
  }

  protected async incrementQuota(
    userId: string,
    feature: LimitKey,
    incrementer: UsageIncrementer
  ): Promise<void> {
    await incrementQuota(userId, feature, incrementer);
  }

  // Expose error factory methods for subclasses
  protected notFoundError(resource?: string, details?: Record<string, unknown>): ServiceError {
    return notFoundError(resource ?? this.resourceName, details);
  }

  protected forbiddenError(resource?: string, details?: Record<string, unknown>): ServiceError {
    return forbiddenError(resource ?? this.resourceName, details);
  }

  protected quotaExceededError(resource: string, limit: number, details?: Record<string, unknown>): ServiceError {
    return quotaExceededError(resource, limit, details);
  }

  protected conflictError(message: string, details?: Record<string, unknown>): ServiceError {
    return conflictError(message, details);
  }

  protected unprocessableEntityError(message: string, details?: Record<string, unknown>): ServiceError {
    return unprocessableEntityError(message, details);
  }

  protected serviceUnavailableError(message: string, details?: Record<string, unknown>): ServiceError {
    return serviceUnavailableError(message, details);
  }

  protected internalError(message?: string, details?: Record<string, unknown>): ServiceError {
    return internalError(message, details);
  }

  protected validationError(message?: string, details?: Record<string, unknown>): ServiceError {
    return validationError(message, details);
  }

  protected success<T>(data: T): ServiceResult<T> {
    return success(data);
  }
}