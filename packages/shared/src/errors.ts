// Unified error codes for RPC + WebSocket communication

export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SETUP_REQUIRED: "SETUP_REQUIRED",
  PAIRING_INVALID: "PAIRING_INVALID",
  SESSION_EXPIRED: "SESSION_EXPIRED",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface RpcError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/** Human-readable default messages per error code. */
export const ErrorMessages: Record<ErrorCode, string> = {
  UNAUTHORIZED: "Not authenticated.",
  FORBIDDEN: "Access denied — contact your admin.",
  NOT_FOUND: "Not found.",
  VALIDATION_ERROR: "Invalid input.",
  CONFLICT: "Conflict — data was modified in the meantime.",
  RATE_LIMITED: "Too many requests. Please wait.",
  INTERNAL_ERROR: "Internal error. Please try again.",
  SETUP_REQUIRED: "Initial setup required.",
  PAIRING_INVALID: "Instance pairing invalid or expired.",
  SESSION_EXPIRED: "Session expired. Please log in again.",
};
