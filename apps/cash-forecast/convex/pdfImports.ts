import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

const MAX_ROWS = 360;
const MAX_AMOUNT = 1_000_000_000;
const MAX_FILE_NAME_LENGTH = 255;
const MAX_LOAN_KEY_LENGTH = 100;

const rowValidator = v.object({
  installment: v.number(),
  sourceDate: v.string(),
  date: v.string(),
  name: v.string(),
  principal: v.number(),
  interest: v.number(),
  amount: v.number(),
  page: v.number(),
  acknowledgedDuplicate: v.optional(v.boolean()),
});

type ImportRow = {
  installment: number;
  sourceDate: string;
  date: string;
  name: string;
  principal: number;
  interest: number;
  amount: number;
  page: number;
  acknowledgedDuplicate?: boolean;
};

type PreviewStatus = "new" | "past" | "duplicate" | "conflict";

function isExactDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function validateLoanKey(loanKey: string): string {
  const trimmed = loanKey.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_LOAN_KEY_LENGTH) {
    throw new ConvexError(`融資識別子は1文字以上${MAX_LOAN_KEY_LENGTH}文字以内で入力してください`);
  }
  return trimmed;
}

function validateHash(fileHash: string): string {
  if (!/^[0-9a-f]{64}$/i.test(fileHash)) {
    throw new ConvexError("PDFのハッシュ値が正しくありません");
  }
  return fileHash.toLowerCase();
}

function validateRows(rows: ImportRow[]): ImportRow[] {
  if (rows.length < 1 || rows.length > MAX_ROWS) {
    throw new ConvexError(`取込明細は1件以上${MAX_ROWS}件以下にしてください`);
  }

  const seen = new Set<string>();
  return rows.map((row) => {
    if (!Number.isInteger(row.installment) || row.installment < 1 || row.installment > 10_000) {
      throw new ConvexError("回数は1以上10000以下の整数にしてください");
    }
    if (!Number.isInteger(row.page) || row.page < 1 || row.page > 10) {
      throw new ConvexError("ページ番号は1以上10以下の整数にしてください");
    }
    if (!isExactDate(row.sourceDate) || !isExactDate(row.date)) {
      throw new ConvexError("取込明細に実在しない日付が含まれています");
    }
    const name = row.name.trim();
    if (name.length < 1 || name.length > 100) {
      throw new ConvexError("名前は1文字以上100文字以内で入力してください");
    }
    for (const amount of [row.principal, row.interest, row.amount]) {
      if (!Number.isInteger(amount) || amount < 0 || amount > MAX_AMOUNT) {
        throw new ConvexError("金額は0円以上10億円以下の整数で入力してください");
      }
    }
    if (row.principal + row.interest !== row.amount) {
      throw new ConvexError(`${row.installment}回目の元金と利息の合計が支払額と一致しません`);
    }
    const key = row.sourceDate;
    if (seen.has(key)) {
      throw new ConvexError(`同じ記載日(${row.sourceDate})の明細が重複しています`);
    }
    seen.add(key);
    return { ...row, name };
  });
}

async function getSettings(ctx: QueryCtx | MutationCtx, userId: string) {
  const settings = await ctx.db
    .query("settings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (!settings) throw new ConvexError("先に残高の初期設定を行ってください");
  return settings;
}

function importedRowMatches(existing: Doc<"transactions">, row: ImportRow): boolean {
  const source = existing.pdfSource;
  return (
    source !== undefined &&
    source.sourceDate === row.sourceDate &&
    existing.date === row.date &&
    existing.name === row.name &&
    existing.amount === row.amount &&
    source.principal === row.principal &&
    source.interest === row.interest
  );
}

function cancellationReason(
  anchorDate: string,
  transactions: Doc<"transactions">[],
): string | undefined {
  for (const transaction of transactions) {
    if (transaction.actual === true) return "実績化された明細があるため取り消せません";
    if (transaction.date <= anchorDate) return "基準日以前になった明細があるため取り消せません";
    const source = transaction.pdfSource;
    if (
      !source ||
      transaction.kind !== "expense" ||
      transaction.date !== source.originalDate ||
      transaction.name !== source.originalName ||
      transaction.amount !== source.originalAmount
    ) {
      return "取込後に編集された明細があるため取り消せません";
    }
  }
  return undefined;
}

async function inspectRow(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  anchorDate: string,
  row: ImportRow,
  importedRows: Doc<"transactions">[],
  rules: Doc<"rules">[],
  ruleTransactions: Doc<"transactions">[],
): Promise<{ status: PreviewStatus; message?: string; mayAcknowledge?: boolean }> {
  const imported = importedRows.find((transaction) => transaction.pdfSource?.sourceDate === row.sourceDate);
  if (imported) {
    if (importedRowMatches(imported, row)) {
      return {
        status: "duplicate",
        message: `登録済み（${imported.date}・${imported.amount.toLocaleString("ja-JP")}円）です`,
      };
    }
    return {
      status: "conflict",
      message: `登録済み明細（${imported.date}・${imported.amount.toLocaleString("ja-JP")}円）と内容が異なります。既存取引を修正または取り消してから再取込してください`,
    };
  }

  const sameDay = await ctx.db
    .query("transactions")
    .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", row.date))
    .collect();
  const manual = sameDay.find(
    (transaction) =>
      transaction.kind === "expense" && transaction.amount === row.amount && !transaction.pdfSource,
  );
  if (manual) {
    return {
      status: "conflict",
      message: `同じ日付・金額の手入力支出「${manual.name}」（${manual.date}・${manual.amount.toLocaleString("ja-JP")}円）があります`,
      mayAcknowledge: true,
    };
  }

  const month = row.date.slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const matchingRule = rules.find(
    (rule) => {
      const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
      const day = Math.min(rule.dayOfMonth, lastDay);
      const ruleDate = `${month}-${String(day).padStart(2, "0")}`;
      const isSettled = ruleTransactions.some(
        (transaction) =>
          transaction.ruleId === rule._id &&
          transaction.ruleMonth === month &&
          transaction.addon !== true,
      );
      return (
        rule.kind === "expense" &&
        (rule.name.includes("公庫") || rule.name.trim() === row.name) &&
        ruleDate > anchorDate &&
        (rule.endDate === undefined || ruleDate <= rule.endDate) &&
        !isSettled
      );
    },
  );
  if (matchingRule) {
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const ruleDate = `${month}-${String(Math.min(matchingRule.dayOfMonth, lastDay)).padStart(2, "0")}`;
    return {
      status: "conflict",
      message: `同月に繰り返し予定「${matchingRule.name}」（${ruleDate}・${matchingRule.amount.toLocaleString("ja-JP")}円）があります`,
      mayAcknowledge: true,
    };
  }

  return { status: "new" };
}

async function loadComparisonData(ctx: QueryCtx | MutationCtx, userId: string, loanKey: string) {
  const [importedRows, rules, ruleTransactions] = await Promise.all([
    ctx.db
      .query("transactions")
      .withIndex("by_user_pdf_source", (q) =>
        q.eq("userId", userId).eq("pdfSource.loanKey", loanKey),
      )
      .collect(),
    ctx.db.query("rules").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    ctx.db
      .query("transactions")
      .withIndex("by_user_rule", (q) => q.eq("userId", userId))
      .collect(),
  ]);
  return { importedRows, rules, ruleTransactions };
}

export const preview = query({
  args: { loanKey: v.string(), fileHash: v.string(), rows: v.array(rowValidator) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("ログインが必要です");
    const loanKey = validateLoanKey(args.loanKey);
    const fileHash = validateHash(args.fileHash);
    const rows = validateRows(args.rows);
    const settings = await getSettings(ctx, identity.subject);
    const comparison = await loadComparisonData(ctx, identity.subject, loanKey);
    const alreadyImported = Boolean(
      await ctx.db
        .query("pdfImportBatches")
        .withIndex("by_user_hash_status", (q) =>
          q.eq("userId", identity.subject).eq("fileHash", fileHash).eq("status", "active"),
        )
        .first(),
    );

    const results = [];
    for (const row of rows) {
      if (row.date <= settings.anchorDate) {
        results.push({
          installment: row.installment,
          status: "past" as const,
          message: `基準日(${settings.anchorDate})以前の明細です`,
          canAcknowledge: false,
        });
        continue;
      }
      const inspected = await inspectRow(
        ctx,
        identity.subject,
        settings.anchorDate,
        row,
        comparison.importedRows,
        comparison.rules,
        comparison.ruleTransactions,
      );
      results.push({
        installment: row.installment,
        status: inspected.status,
        message: inspected.message,
        canAcknowledge: inspected.status === "conflict" && inspected.mayAcknowledge === true,
      });
    }
    return { alreadyImported, rows: results };
  },
});

export const commit = mutation({
  args: {
    loanKey: v.string(),
    fileHash: v.string(),
    fileName: v.string(),
    rows: v.array(rowValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("ログインが必要です");
    const loanKey = validateLoanKey(args.loanKey);
    const fileHash = validateHash(args.fileHash);
    const fileName = args.fileName.trim();
    if (fileName.length < 1 || fileName.length > MAX_FILE_NAME_LENGTH) {
      throw new ConvexError(`ファイル名は1文字以上${MAX_FILE_NAME_LENGTH}文字以内にしてください`);
    }
    const rows = validateRows(args.rows);
    const settings = await getSettings(ctx, identity.subject);
    if (rows.some((row) => row.date <= settings.anchorDate)) {
      throw new ConvexError(`基準日(${settings.anchorDate})以前の明細は登録できません`);
    }
    const existingBatch = await ctx.db
      .query("pdfImportBatches")
      .withIndex("by_user_hash_status", (q) =>
        q.eq("userId", identity.subject).eq("fileHash", fileHash).eq("status", "active"),
      )
      .first();
    if (existingBatch) throw new ConvexError("このPDFはすでに取り込まれています");

    const comparison = await loadComparisonData(ctx, identity.subject, loanKey);

    for (const row of rows) {
      const inspected = await inspectRow(
        ctx,
        identity.subject,
        settings.anchorDate,
        row,
        comparison.importedRows,
        comparison.rules,
        comparison.ruleTransactions,
      );
      if (inspected.status === "duplicate") {
        throw new ConvexError(`${row.sourceDate}の明細はすでに登録されています`);
      }
      if (inspected.status === "conflict" && !inspected.mayAcknowledge) {
        throw new ConvexError(inspected.message ?? `${row.sourceDate}の明細が登録済み明細と競合しています`);
      }
      if (inspected.status === "conflict" && row.acknowledgedDuplicate !== true) {
        throw new ConvexError(`${row.sourceDate}の重複候補を確認してください`);
      }
    }

    const batchId = await ctx.db.insert("pdfImportBatches", {
      userId: identity.subject,
      fileHash,
      fileName,
      loanKey,
      createdAt: Date.now(),
      count: rows.length,
      status: "active",
      rows,
    });
    for (const row of rows) {
      await ctx.db.insert("transactions", {
        userId: identity.subject,
        date: row.date,
        name: row.name,
        kind: "expense",
        amount: row.amount,
        importBatchId: batchId,
        pdfSource: {
          loanKey,
          sourceDate: row.sourceDate,
          principal: row.principal,
          interest: row.interest,
          installment: row.installment,
          page: row.page,
          originalDate: row.date,
          originalName: row.name,
          originalAmount: row.amount,
        },
      });
    }
    return { batchId, count: rows.length };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const batches = await ctx.db
      .query("pdfImportBatches")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(20);
    if (batches.length === 0) return [];
    const settings = await getSettings(ctx, identity.subject);
    const result = [];
    for (const batch of batches) {
      const { rows: _rows, ...batchSummary } = batch;
      const transactions = await ctx.db
        .query("transactions")
        .withIndex("by_import_batch", (q) => q.eq("importBatchId", batch._id))
        .collect();
      const reason = batch.status === "active" ? cancellationReason(settings.anchorDate, transactions) : "取り消し済みです";
      result.push({
        ...batchSummary,
        cancellable: batch.status === "active" && reason === undefined,
        cancellationReason: reason,
      });
    }
    return result;
  },
});

export const details = query({
  args: { batchId: v.id("pdfImportBatches") },
  handler: async (ctx, { batchId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("ログインが必要です");
    const batch = await ctx.db.get(batchId);
    if (!batch || batch.userId !== identity.subject) throw new ConvexError("権限がありません");
    return batch.rows;
  },
});

export const cancel = mutation({
  args: { batchId: v.id("pdfImportBatches") },
  handler: async (ctx, { batchId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("ログインが必要です");
    const batch = await ctx.db.get(batchId);
    if (!batch || batch.userId !== identity.subject) throw new ConvexError("権限がありません");
    if (batch.status === "cancelled") return null;
    const settings = await getSettings(ctx, identity.subject);
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_import_batch", (q) => q.eq("importBatchId", batchId))
      .collect();
    const reason = cancellationReason(settings.anchorDate, transactions);
    if (reason) throw new ConvexError(reason);
    for (const transaction of transactions) await ctx.db.delete(transaction._id);
    await ctx.db.patch(batchId, { status: "cancelled" });
    return null;
  },
});
