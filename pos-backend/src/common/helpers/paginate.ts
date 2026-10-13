export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function resolvePaging(page?: number, pageSize?: number) {
  const size = Math.min(Math.max(pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const current = Math.max(page ?? 1, 1);
  return { page: current, pageSize: size, skip: (current - 1) * size, take: size };
}

export function toPageResult<T>(items: T[], total: number, page: number, pageSize: number): PageResult<T> {
  return { items, total, page, pageSize, totalPages: Math.max(Math.ceil(total / pageSize), 1) };
}
