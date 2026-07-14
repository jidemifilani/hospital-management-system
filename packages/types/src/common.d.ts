export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}
export interface PaginationQuery {
    page?: number;
    limit?: number;
    q?: string;
    sort?: string;
}
export interface ApiError {
    statusCode: number;
    message: string | string[];
    error?: string;
    timestamp: string;
    path: string;
}
export interface AuditFields {
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
    createdById?: string | null;
    updatedById?: string | null;
}
//# sourceMappingURL=common.d.ts.map