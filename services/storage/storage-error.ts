/**
 * MOTION-BOT — Storage Error & Result Helpers
 * Concrete utility constructors and type guards for StorageResult and StorageError.
 * Part of Phase 4.1: Storage Architecture & Abstraction.
 */

import { StorageError, StorageErrorCode, StorageResult } from "@/types/storage";

/**
 * Creates a successful StorageResult wrapping the provided data.
 */
export function storageSuccess<T>(data: T): StorageResult<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Creates a structured StorageError descriptor.
 */
export function createStorageError(
  code: StorageErrorCode,
  message: string,
  details?: unknown,
  originalError?: unknown
): StorageError {
  return {
    code,
    message,
    details,
    originalError:
      originalError instanceof Error
        ? { name: originalError.name, message: originalError.message, stack: originalError.stack }
        : originalError,
  };
}

/**
 * Creates a failed StorageResult wrapping a structured StorageError.
 */
export function storageFailure<T>(
  code: StorageErrorCode,
  message: string,
  details?: unknown,
  originalError?: unknown
): StorageResult<T> {
  return {
    success: false,
    error: createStorageError(code, message, details, originalError),
  };
}

/**
 * Type guard for checking if a StorageResult is successful.
 */
export function isStorageSuccess<T>(
  result: StorageResult<T>
): result is { success: true; data: T } {
  return result.success;
}

/**
 * Type guard for checking if a StorageResult is a failure.
 */
export function isStorageFailure<T>(
  result: StorageResult<T>
): result is { success: false; error: StorageError } {
  return !result.success;
}
