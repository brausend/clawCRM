// Cursor-based pagination types for RPC + subscriptions

/** Request params for paginated queries. */
export interface PaginationParams {
  cursor?: string;
  limit?: number;
  sort?: string;
  direction?: "asc" | "desc";
}

/** Response wrapper for paginated results. */
export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  total: number;
}

/** Default page size. */
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

/** Clamp limit to allowed range. */
export function clampLimit(limit?: number): number {
  if (!limit || limit < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(limit, MAX_PAGE_SIZE);
}
