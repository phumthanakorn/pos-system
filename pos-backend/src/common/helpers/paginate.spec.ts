import { describe, expect, it } from 'vitest';
import { resolvePaging, toPageResult } from './paginate.js';

describe('resolvePaging', () => {
  it('defaults to page 1 with 20 rows', () => {
    expect(resolvePaging()).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 });
  });

  it('skips the right number of rows for later pages', () => {
    expect(resolvePaging(3, 10)).toEqual({ page: 3, pageSize: 10, skip: 20, take: 10 });
  });

  it('clamps an oversized page size and a bad page number', () => {
    expect(resolvePaging(0, 5000)).toEqual({ page: 1, pageSize: 100, skip: 0, take: 100 });
    expect(resolvePaging(-4, 0).pageSize).toBe(1);
  });
});

describe('toPageResult', () => {
  it('computes total pages, rounding up', () => {
    expect(toPageResult([], 41, 1, 20).totalPages).toBe(3);
    expect(toPageResult([], 40, 1, 20).totalPages).toBe(2);
  });

  it('reports at least one page when empty', () => {
    expect(toPageResult([], 0, 1, 20).totalPages).toBe(1);
  });
});
