import type { PaginatedResult } from "@hms/types";

export interface PaginationMeta {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export function buildPagination(page = 1, limit = 20): PaginationMeta {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);
  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
    page: safePage,
    limit: safeLimit,
  };
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  meta: PaginationMeta,
): PaginatedResult<T> {
  return {
    items,
    total,
    page: meta.page,
    limit: meta.limit,
    pages: Math.ceil(total / meta.limit),
  };
}
