import type { RatingFilter, SakeRecord } from "./types.ts";

export function matchesRatingFilter(rating: number, filter: RatingFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "4plus":
      return rating >= 4;
    case "3plus":
      return rating >= 3;
    case "5only":
      return rating === 5;
    default:
      return true;
  }
}

export function recordSearchText(record: SakeRecord): string {
  return [
    record.memo,
    record.label.brandName,
    record.label.brewery,
    record.label.classification,
    record.label.region,
    record.label.tasteHints,
  ]
    .join(" ")
    .toLowerCase();
}

export function matchesSearchQuery(record: SakeRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return recordSearchText(record).includes(q);
}

export function filterSakeRecords(
  records: SakeRecord[],
  options: { filter: RatingFilter; query: string },
): SakeRecord[] {
  return records.filter(
    (record) =>
      matchesRatingFilter(record.rating, options.filter) &&
      matchesSearchQuery(record, options.query),
  );
}
