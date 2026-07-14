"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPagination = buildPagination;
exports.buildPaginatedResult = buildPaginatedResult;
function buildPagination(page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    return {
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        page: safePage,
        limit: safeLimit,
    };
}
function buildPaginatedResult(items, total, meta) {
    return {
        items,
        total,
        page: meta.page,
        limit: meta.limit,
        pages: Math.ceil(total / meta.limit),
    };
}
//# sourceMappingURL=pagination.js.map