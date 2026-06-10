import type { SearchParams } from "./types";

export const DEFAULT_PAGE_SIZE = 10;

export function param(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function pageParam(params: SearchParams) {
  const value = Number(param(params, "page") ?? "1");
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

export function pagination(params: SearchParams, pageSize = DEFAULT_PAGE_SIZE) {
  const page = pageParam(params);
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function dateRangeWhere(from?: string, to?: string) {
  if (!from && !to) return undefined;
  const range: { gte?: Date; lte?: Date } = {};
  if (from) range.gte = new Date(`${from}T00:00:00`);
  if (to) range.lte = new Date(`${to}T23:59:59`);
  return range;
}
