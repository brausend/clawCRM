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

/** Human-readable default messages per error code (German). */
export const ErrorMessages: Record<ErrorCode, string> = {
  UNAUTHORIZED: "Nicht authentifiziert.",
  FORBIDDEN: "Kein Zugriff -- kontaktiere deinen Admin.",
  NOT_FOUND: "Nicht gefunden.",
  VALIDATION_ERROR: "Ungueltige Eingabe.",
  CONFLICT: "Konflikt -- Daten wurden zwischenzeitlich geaendert.",
  RATE_LIMITED: "Zu viele Anfragen. Bitte warte kurz.",
  INTERNAL_ERROR: "Interner Fehler. Bitte versuche es erneut.",
  SETUP_REQUIRED: "Ersteinrichtung erforderlich.",
  PAIRING_INVALID: "Instance-Pairing ungueltig oder abgelaufen.",
  SESSION_EXPIRED: "Sitzung abgelaufen. Bitte erneut anmelden.",
};
