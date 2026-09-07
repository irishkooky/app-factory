import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../../convex/schema";
import type { PdfImportRow } from "./pdfImportTypes";

const modules = import.meta.glob("../../convex/**/*.*s");
const preview = makeFunctionReference<"query">("pdfImports:preview");
const commit = makeFunctionReference<"mutation">("pdfImports:commit");
const list = makeFunctionReference<"query">("pdfImports:list");
const details = makeFunctionReference<"query">("pdfImports:details");
const cancel = makeFunctionReference<"mutation">("pdfImports:cancel");
const FILE_HASH = "a".repeat(64);

function row(overrides: Partial<PdfImportRow> = {}): PdfImportRow {
  return {
    installment: 1,
    sourceDate: "2027-01-31",
    date: "2027-02-01",
    name: "日本政策金融公庫 返済",
    principal: 75_000,
    interest: 12_077,
    amount: 87_077,
    page: 1,
    ...overrides,
  };
}

async function configuredTest(subject = "user-a") {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    await ctx.db.insert("settings", {
      userId: subject,
      anchorDate: "2026-12-31",
      anchorBalance: 1_000_000,
      threshold: 100_000,
    });
  });
  return { t, user: t.withIdentity({ subject }) };
}

describe("pdfImports", () => {
  it("requires authentication and an existing setting", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(commit, {
      loanKey: "loan-1", fileHash: FILE_HASH, fileName: "statement.pdf", rows: [row()],
    })).rejects.toThrow("ログインが必要です");
    await expect(t.withIdentity({ subject: "user-a" }).mutation(commit, {
      loanKey: "loan-1", fileHash: FILE_HASH, fileName: "statement.pdf", rows: [row()],
    })).rejects.toThrow("先に残高の初期設定");
  });

  it("commits valid rows atomically and exposes only the owner's batch", async () => {
    const { t, user } = await configuredTest();
    const second = row({ installment: 2, sourceDate: "2027-02-28", date: "2027-03-01", interest: 11_924, amount: 86_924, page: 2 });
    const result = await user.mutation(commit, {
      loanKey: "loan-1", fileHash: FILE_HASH, fileName: "statement.pdf", rows: [row(), second],
    });
    expect(result.count).toBe(2);
    expect(await user.query(details, { batchId: result.batchId })).toHaveLength(2);
    expect(await user.query(list, {})).toMatchObject([{ count: 2, status: "active", cancellable: true }]);
    expect(await t.withIdentity({ subject: "user-b" }).query(list, {})).toEqual([]);
    await expect(t.withIdentity({ subject: "user-b" }).query(details, { batchId: result.batchId })).rejects.toThrow("権限がありません");
    await expect(t.withIdentity({ subject: "user-b" }).mutation(cancel, { batchId: result.batchId })).rejects.toThrow("権限がありません");
  });

  it("rejects invalid calendar dates, amounts, duplicate source dates, and past rows without partial writes", async () => {
    const { t, user } = await configuredTest();
    const base = { loanKey: "loan-1", fileHash: FILE_HASH, fileName: "statement.pdf" };
    await expect(user.mutation(commit, { ...base, rows: [row(), row({ installment: 2 })] })).rejects.toThrow("記載日");
    await expect(user.mutation(commit, { ...base, rows: [row({ sourceDate: "2027-02-30" })] })).rejects.toThrow("実在しない日付");
    await expect(user.mutation(commit, { ...base, rows: [row({ amount: 1 })] })).rejects.toThrow("合計");
    await expect(user.mutation(commit, { ...base, rows: [row({ principal: -1, interest: 1, amount: 0 })] })).rejects.toThrow("整数");
    await expect(user.mutation(commit, { ...base, rows: [row({ principal: 1.5, interest: 0, amount: 1.5 })] })).rejects.toThrow("整数");
    await expect(user.mutation(commit, { ...base, rows: [row({ principal: 1_000_000_001, interest: 0, amount: 1_000_000_001 })] })).rejects.toThrow("10億円以下");
    await expect(user.mutation(commit, { ...base, rows: Array.from({ length: 361 }, () => row()) })).rejects.toThrow("360件以下");
    await expect(user.mutation(commit, { ...base, rows: [row({ sourceDate: "2026-12-01", date: "2026-12-01" })] })).rejects.toThrow("基準日");
    const batches = await t.run((ctx) => ctx.db.query("pdfImportBatches").collect());
    expect(batches).toEqual([]);
  });

  it("detects an active hash even when the matching batch is older than the latest 20", async () => {
    const { t, user } = await configuredTest();
    await t.run(async (ctx) => {
      for (let index = 0; index < 21; index += 1) {
        await ctx.db.insert("pdfImportBatches", {
          userId: "user-a",
          fileHash: index === 0 ? FILE_HASH : index.toString(16).padStart(64, "0"),
          fileName: `${index}.pdf`,
          loanKey: "loan-1",
          createdAt: index,
          count: 1,
          status: "active",
          rows: [row()],
        });
      }
    });
    expect((await user.query(preview, { loanKey: "loan-1", fileHash: FILE_HASH, rows: [row()] })).alreadyImported).toBe(true);
    await expect(user.mutation(commit, {
      loanKey: "loan-1", fileHash: FILE_HASH, fileName: "statement.pdf", rows: [row()],
    })).rejects.toThrow("すでに取り込まれています");
  });

  it("allows only one of two concurrent commits for the same hash", async () => {
    const { user } = await configuredTest();
    const args = {
      loanKey: "loan-1", fileHash: FILE_HASH, fileName: "statement.pdf", rows: [row()],
    };
    const results = await Promise.allSettled([
      user.mutation(commit, args),
      user.mutation(commit, args),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("allows only one concurrent registration of the same loan row across different hashes", async () => {
    const { user } = await configuredTest();
    const results = await Promise.allSettled([
      user.mutation(commit, { loanKey: "loan-1", fileHash: "1".repeat(64), fileName: "first.pdf", rows: [row()] }),
      user.mutation(commit, { loanKey: "loan-1", fileHash: "2".repeat(64), fileName: "second.pdf", rows: [row()] }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("reports only virtual rules that forecast would actually generate", async () => {
    const endDateCase = await configuredTest();
    await endDateCase.t.run(async (ctx) => {
      await ctx.db.insert("rules", {
        userId: "user-a", name: "公庫返済", kind: "expense", amount: 80_000, dayOfMonth: 31, endDate: "2027-02-01",
      });
    });
    const february = row({ sourceDate: "2027-02-20", date: "2027-02-28" });
    expect((await endDateCase.user.query(preview, {
      loanKey: "rule-end", fileHash: "3".repeat(64), rows: [february],
    })).rows[0]).toMatchObject({ status: "new" });

    const settledCase = await configuredTest();
    await settledCase.t.run(async (ctx) => {
      const ruleId = await ctx.db.insert("rules", {
        userId: "user-a", name: "公庫返済", kind: "expense", amount: 80_000, dayOfMonth: 28,
      });
      await ctx.db.insert("transactions", {
        userId: "user-a", date: "2027-02-28", name: "公庫返済（確定）", kind: "expense", amount: 80_000, ruleId, ruleMonth: "2027-02",
      });
    });
    expect((await settledCase.user.query(preview, {
      loanKey: "rule-settled", fileHash: "4".repeat(64), rows: [february],
    })).rows[0]).toMatchObject({ status: "new" });

    const anchorCase = await configuredTest();
    await anchorCase.t.run(async (ctx) => {
      await ctx.db.insert("rules", {
        userId: "user-a", name: "公庫返済", kind: "expense", amount: 80_000, dayOfMonth: 1,
      });
      const settings = await ctx.db.query("settings").withIndex("by_user", (q) => q.eq("userId", "user-a")).unique();
      await ctx.db.patch(settings!._id, { anchorDate: "2027-03-10" });
    });
    const march = row({ sourceDate: "2027-03-12", date: "2027-03-15" });
    expect((await anchorCase.user.query(preview, {
      loanKey: "rule-anchor", fileHash: "5".repeat(64), rows: [march],
    })).rows[0]).toMatchObject({ status: "new" });
  });

  it("classifies imported updates and permits acknowledged manual conflicts only", async () => {
    const { t, user } = await configuredTest();
    await user.mutation(commit, {
      loanKey: "loan-1", fileHash: FILE_HASH, fileName: "statement.pdf", rows: [row()],
    });
    const changed = row({ interest: 10_000, amount: 85_000 });
    const result = await user.query(preview, { loanKey: "loan-1", fileHash: "b".repeat(64), rows: [changed] });
    expect(result.rows[0]).toMatchObject({ status: "conflict", canAcknowledge: false });
    await expect(user.mutation(commit, {
      loanKey: "loan-1", fileHash: "b".repeat(64), fileName: "updated.pdf", rows: [changed],
    })).rejects.toThrow("既存取引を修正または取り消してから");

    await t.run(async (ctx) => {
      await ctx.db.insert("transactions", {
        userId: "user-a", date: "2027-04-01", name: "手入力", kind: "expense", amount: 87_077,
      });
    });
    const manual = row({ installment: 3, sourceDate: "2027-03-31", date: "2027-04-01" });
    expect((await user.query(preview, {
      loanKey: "loan-2", fileHash: "c".repeat(64), rows: [manual],
    })).rows[0]).toMatchObject({ status: "conflict", canAcknowledge: true });
    await expect(user.mutation(commit, {
      loanKey: "loan-2", fileHash: "c".repeat(64), fileName: "other.pdf", rows: [manual],
    })).rejects.toThrow("重複候補を確認");
    await expect(user.mutation(commit, {
      loanKey: "loan-2", fileHash: "c".repeat(64), fileName: "other.pdf", rows: [{ ...manual, acknowledgedDuplicate: true }],
    })).resolves.toMatchObject({ count: 1 });
  });

  it("cancels unchanged future rows, is idempotent, and leaves manually deleted rows alone", async () => {
    const { t, user } = await configuredTest();
    const result = await user.mutation(commit, {
      loanKey: "loan-1", fileHash: FILE_HASH, fileName: "statement.pdf", rows: [row(), row({ installment: 2, sourceDate: "2027-02-28", date: "2027-03-01" })],
    });
    await t.run(async (ctx) => {
      const rows = await ctx.db.query("transactions").withIndex("by_import_batch", (q) => q.eq("importBatchId", result.batchId)).collect();
      await ctx.db.delete(rows[0]._id);
    });
    expect(await user.query(details, { batchId: result.batchId })).toHaveLength(2);
    await expect(user.mutation(cancel, { batchId: result.batchId })).resolves.toBeNull();
    await expect(user.mutation(cancel, { batchId: result.batchId })).resolves.toBeNull();
    expect(await user.query(details, { batchId: result.batchId })).toMatchObject([
      { installment: 1, sourceDate: "2027-01-31", date: "2027-02-01", principal: 75_000, interest: 12_077, amount: 87_077 },
      { installment: 2, sourceDate: "2027-02-28", date: "2027-03-01", principal: 75_000, interest: 12_077, amount: 87_077 },
    ]);
  });

  it("refuses whole-batch cancellation after editing, actualization, or crossing the anchor", async () => {
    for (const change of ["edit", "actual", "anchor"] as const) {
      const { t, user } = await configuredTest();
      const result = await user.mutation(commit, {
        loanKey: `loan-${change}`, fileHash: ({ edit: "d", actual: "e", anchor: "f" }[change]).repeat(64), fileName: "statement.pdf", rows: [row()],
      });
      await t.run(async (ctx) => {
        const transaction = await ctx.db.query("transactions").withIndex("by_import_batch", (q) => q.eq("importBatchId", result.batchId)).unique();
        if (change === "edit") await ctx.db.patch(transaction!._id, { amount: 1 });
        if (change === "actual") await ctx.db.patch(transaction!._id, { actual: true });
        if (change === "anchor") {
          const settings = await ctx.db.query("settings").withIndex("by_user", (q) => q.eq("userId", "user-a")).unique();
          await ctx.db.patch(settings!._id, { anchorDate: "2027-02-01" });
        }
      });
      await expect(user.mutation(cancel, { batchId: result.batchId })).rejects.toThrow();
      expect(await user.query(details, { batchId: result.batchId })).toEqual([row()]);
    }
  });
});
