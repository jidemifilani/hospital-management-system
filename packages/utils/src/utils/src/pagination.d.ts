import type { PaginatedResult } from "@hms/types";
export interface PaginationMeta {
    skip: number;
    take: number;
    page: number;
    limit: number;
}
export declare function buildPagination(page?: number, limit?: number): PaginationMeta;
export declare function buildPaginatedResult<T>(items: T[], total: number, meta: PaginationMeta): PaginatedResult<T>;
//# sourceMappingURL=pagination.d.ts.map