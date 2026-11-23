import { formatDateShort, formatMonthLabel } from "./date";
import type { ReparentCandidate, ReparentSection } from "./reparentCandidates";

/** ルールグループごとに初期表示する月数（もっと見るで残りを出す） */
export const REPARENT_PICKER_DEFAULT_MONTHS_PER_RULE = 3;

export const REPARENT_PICKER_SECTIONS: { id: ReparentSection; title: string; proOnly: boolean }[] = [
  { id: "oneoff", title: "単発", proOnly: false },
  { id: "recurring-virtual", title: "定期・未確定", proOnly: true },
  { id: "recurring-confirmed", title: "定期・確定済", proOnly: true },
];

export function displayTitle(c: ReparentCandidate): string {
  if (c.section === "recurring-confirmed" && c.ruleName !== undefined && c.ruleMonth !== undefined) {
    return `${c.ruleName}（${formatMonthLabel(c.ruleMonth)}）`;
  }
  if (c.section === "recurring-virtual" && c.ruleMonth !== undefined) {
    return `${c.ruleName ?? c.name}（${formatMonthLabel(c.ruleMonth)}）`;
  }
  return c.name;
}

export function candidateKey(c: ReparentCandidate): string {
  if (c.targetKind === "transaction") return `tx:${c.txId}`;
  return `rule:${c.ruleId}:${c.ruleMonth}`;
}

export function dayDistanceFromSource(sourceDate: string, candidateDate: string): number {
  const t0 = Date.parse(`${sourceDate}T00:00:00Z`);
  const t1 = Date.parse(`${candidateDate}T00:00:00Z`);
  if (Number.isNaN(t0) || Number.isNaN(t1)) return Number.POSITIVE_INFINITY;
  return Math.abs(t1 - t0) / 86_400_000;
}

export function sortByClosenessToSource(
  list: ReparentCandidate[],
  sourceDate: string,
): ReparentCandidate[] {
  return [...list].sort((a, b) => {
    const da = dayDistanceFromSource(sourceDate, a.date);
    const db = dayDistanceFromSource(sourceDate, b.date);
    if (da !== db) return da - db;
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return displayTitle(a).localeCompare(displayTitle(b), "ja");
  });
}

export function candidateMatchesQuery(c: ReparentCandidate, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  const title = displayTitle(c).toLowerCase();
  return (
    title.includes(q) ||
    c.name.toLowerCase().includes(q) ||
    c.date.includes(q) ||
    formatDateShort(c.date).includes(q) ||
    (c.ruleMonth !== undefined && formatMonthLabel(c.ruleMonth).includes(q)) ||
    (c.ruleName !== undefined && c.ruleName.toLowerCase().includes(q))
  );
}

export type ReparentRuleGroup = {
  ruleId: string;
  ruleName: string;
  items: ReparentCandidate[];
  visibleItems: ReparentCandidate[];
  hiddenCount: number;
};

export function groupRecurringCandidates(
  candidates: ReparentCandidate[],
  sourceDate: string,
  options: {
    query: string;
    expandedRuleIds: ReadonlySet<string>;
    defaultPerRule?: number;
  },
): ReparentRuleGroup[] {
  const defaultPerRule = options.defaultPerRule ?? REPARENT_PICKER_DEFAULT_MONTHS_PER_RULE;
  const searching = options.query.trim() !== "";

  const byRule = new Map<string, ReparentCandidate[]>();
  const ruleNames = new Map<string, string>();

  for (const c of candidates) {
    if (c.section !== "recurring-virtual" && c.section !== "recurring-confirmed") continue;
    if (!candidateMatchesQuery(c, options.query)) continue;

    const ruleId =
      c.ruleId !== undefined
        ? String(c.ruleId)
        : c.targetKind === "transaction"
          ? `tx-rule:${c.txId}`
          : "unknown";
    const ruleName = c.ruleName ?? c.name;
    ruleNames.set(ruleId, ruleName);

    const bucket = byRule.get(ruleId);
    if (bucket) bucket.push(c);
    else byRule.set(ruleId, [c]);
  }

  const groups: ReparentRuleGroup[] = [];
  for (const [ruleId, items] of byRule) {
    const sorted = sortByClosenessToSource(items, sourceDate);
    const ruleName = ruleNames.get(ruleId) ?? sorted[0]?.name ?? "定期";
    let visibleItems = sorted;
    let hiddenCount = 0;
    if (!searching && !options.expandedRuleIds.has(ruleId) && sorted.length > defaultPerRule) {
      visibleItems = sorted.slice(0, defaultPerRule);
      hiddenCount = sorted.length - defaultPerRule;
    }
    groups.push({ ruleId, ruleName, items: sorted, visibleItems, hiddenCount });
  }

  groups.sort((a, b) => a.ruleName.localeCompare(b.ruleName, "ja"));
  return groups;
}

export function oneoffCandidatesForTab(
  candidates: ReparentCandidate[],
  sourceDate: string,
  query: string,
): ReparentCandidate[] {
  const list = candidates.filter((c) => c.section === "oneoff" && candidateMatchesQuery(c, query));
  return sortByClosenessToSource(list, sourceDate);
}

export function recurringCandidatesForTab(
  candidates: ReparentCandidate[],
  section: "recurring-virtual" | "recurring-confirmed",
  sourceDate: string,
  query: string,
  expandedRuleIds: ReadonlySet<string>,
): ReparentRuleGroup[] {
  const sectionOnly = candidates.filter((c) => c.section === section);
  return groupRecurringCandidates(sectionOnly, sourceDate, { query, expandedRuleIds });
}