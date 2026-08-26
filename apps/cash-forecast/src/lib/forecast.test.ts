import { describe, expect, it } from "vitest";
import type { Doc } from "../../convex/_generated/dataModel";
import { addMonthsToDateClamped, todayJST } from "./date";
import { addonDisplayName, buildForecast } from "./forecast";

// Convex の生成型に依存させず、テストに必要な最小限のフィールドだけを埋めたダミーを作る。
let ruleSeq = 0;
function makeRule(overrides: Partial<Doc<"rules">> & Pick<Doc<"rules">, "name" | "kind" | "amount" | "dayOfMonth">): Doc<"rules"> {
  ruleSeq += 1;
  return {
    _id: `rule_${ruleSeq}` as Doc<"rules">["_id"],
    _creationTime: 0,
    userId: "user_1",
    endDate: undefined,
    ...overrides,
  };
}

let txSeq = 0;
function makeTx(
  overrides: Partial<Doc<"transactions">> & Pick<Doc<"transactions">, "date" | "name" | "kind" | "amount">,
): Doc<"transactions"> {
  txSeq += 1;
  return {
    _id: `tx_${txSeq}` as Doc<"transactions">["_id"],
    _creationTime: txSeq, // 作成順を安定させる（アドオンの並び順テストに使う）
    userId: "user_1",
    ruleId: undefined,
    ruleMonth: undefined,
    addon: undefined,
    ...overrides,
  };
}

describe("date utils", () => {
  it("addMonthsToDateClamped clamps 1/31 + 1month to 2/28", () => {
    expect(addMonthsToDateClamped("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("addMonthsToDateClamped clamps to 2/29 on a leap year", () => {
    expect(addMonthsToDateClamped("2024-01-31", 1)).toBe("2024-02-29");
  });

  it("todayJST returns YYYY-MM-DD format", () => {
    expect(todayJST()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("buildForecast", () => {
  it("基本: アンカー + 実取引2件 + ルール1件で残高が正しく積み上がる", () => {
    const rows = buildForecast({
      anchorDate: "2026-07-12",
      anchorBalance: 100_000,
      threshold: 0,
      rules: [makeRule({ name: "給与", kind: "income", amount: 300_000, dayOfMonth: 25 })],
      transactions: [
        makeTx({ date: "2026-07-15", name: "家賃", kind: "expense", amount: 80_000 }),
        makeTx({ date: "2026-07-20", name: "ボーナス", kind: "income", amount: 50_000 }),
      ],
      horizonEnd: "2026-08-11",
    });

    expect(rows.map((r) => r.date)).toEqual(["2026-07-15", "2026-07-20", "2026-07-25"]);
    // 100,000 - 80,000 = 20,000
    expect(rows[0].balance).toBe(20_000);
    // 20,000 + 50,000 = 70,000
    expect(rows[1].balance).toBe(70_000);
    // 70,000 + 300,000 = 370,000
    expect(rows[2].balance).toBe(370_000);
  });

  it("dayOfMonth=31 は2月に28日または29日、4月に30日へクランプされる", () => {
    const rows = buildForecast({
      anchorDate: "2026-01-01",
      anchorBalance: 0,
      threshold: 0,
      rules: [makeRule({ name: "積立", kind: "expense", amount: 1000, dayOfMonth: 31 })],
      transactions: [],
      horizonEnd: "2026-04-30",
    });

    const dates = rows.map((r) => r.date);
    expect(dates).toContain("2026-02-28");
    expect(dates).not.toContain("2026-02-29");
    expect(dates).toContain("2026-04-30");
  });

  it("dayOfMonth=31 はうるう年の2月に29日へクランプされる", () => {
    const rows = buildForecast({
      anchorDate: "2024-01-01",
      anchorBalance: 0,
      threshold: 0,
      rules: [makeRule({ name: "積立", kind: "expense", amount: 1000, dayOfMonth: 31 })],
      transactions: [],
      horizonEnd: "2024-02-29",
    });

    expect(rows.map((r) => r.date)).toContain("2024-02-29");
  });

  it("上書き: (ruleId, 対象月) の transaction がある月は仮想行が出ず、上書き行が使われる", () => {
    const rule = makeRule({ name: "家賃", kind: "expense", amount: 80_000, dayOfMonth: 27 });
    const rows = buildForecast({
      anchorDate: "2026-07-01",
      anchorBalance: 0,
      threshold: 0,
      rules: [rule],
      transactions: [
        makeTx({
          date: "2026-08-27",
          name: "家賃(確定)",
          kind: "expense",
          amount: 82_000,
          ruleId: rule._id,
          ruleMonth: "2026-08",
        }),
      ],
      horizonEnd: "2026-09-30",
    });

    const augustRows = rows.filter((r) => r.date.startsWith("2026-08"));
    expect(augustRows).toHaveLength(1);
    expect(augustRows[0].isVirtual).toBe(false);
    expect(augustRows[0].amount).toBe(82_000);

    const septemberRows = rows.filter((r) => r.date.startsWith("2026-09"));
    expect(septemberRows).toHaveLength(1);
    expect(septemberRows[0].isVirtual).toBe(true);
  });

  it("endDate を過ぎた月は仮想行が生成されない（当日の月までは生成）", () => {
    const rows = buildForecast({
      anchorDate: "2026-01-01",
      anchorBalance: 0,
      threshold: 0,
      rules: [
        makeRule({
          name: "サブスク",
          kind: "expense",
          amount: 1000,
          dayOfMonth: 10,
          endDate: "2026-03-10",
        }),
      ],
      transactions: [],
      horizonEnd: "2026-05-31",
    });

    expect(rows.map((r) => r.date)).toEqual(["2026-01-10", "2026-02-10", "2026-03-10"]);
  });

  it("date <= anchorDate の transaction は算入されない", () => {
    const rows = buildForecast({
      anchorDate: "2026-07-12",
      anchorBalance: 1000,
      threshold: 0,
      rules: [],
      transactions: [
        makeTx({ date: "2026-07-12", name: "算入されない", kind: "expense", amount: 500 }),
        makeTx({ date: "2026-07-11", name: "算入されない2", kind: "expense", amount: 500 }),
        makeTx({ date: "2026-07-13", name: "算入される", kind: "income", amount: 200 }),
      ],
      horizonEnd: "2026-08-12",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("算入される");
    expect(rows[0].balance).toBe(1200);
  });

  it("belowThreshold は balance < threshold の行にだけ立つ", () => {
    const rows = buildForecast({
      anchorDate: "2026-07-01",
      anchorBalance: 1000,
      threshold: 500,
      rules: [],
      transactions: [
        makeTx({ date: "2026-07-05", name: "支出1", kind: "expense", amount: 600 }), // 400
        makeTx({ date: "2026-07-10", name: "収入1", kind: "income", amount: 200 }), // 600
      ],
      horizonEnd: "2026-08-01",
    });

    expect(rows[0].balance).toBe(400);
    expect(rows[0].belowThreshold).toBe(true);
    expect(rows[1].balance).toBe(600);
    expect(rows[1].belowThreshold).toBe(false);
  });

  it("同日ソート: income が expense より先に来て、残高もその順で計算される", () => {
    const rows = buildForecast({
      anchorDate: "2026-07-01",
      anchorBalance: 0,
      threshold: 0,
      rules: [],
      transactions: [
        makeTx({ date: "2026-07-10", name: "支出", kind: "expense", amount: 300 }),
        makeTx({ date: "2026-07-10", name: "収入", kind: "income", amount: 1000 }),
      ],
      horizonEnd: "2026-08-01",
    });

    expect(rows.map((r) => r.kind)).toEqual(["income", "expense"]);
    expect(rows[0].balance).toBe(1000);
    expect(rows[1].balance).toBe(700);
  });
});

describe("buildForecast: アドオン", () => {
  it("アドオン合算: expenseルール + expenseアドオン → 仮想行に合算され残高が総額分減る", () => {
    const rule = makeRule({ name: "AMEX", kind: "expense", amount: 130_000, dayOfMonth: 10 });
    const rows = buildForecast({
      anchorDate: "2026-11-01",
      anchorBalance: 0,
      threshold: 0,
      rules: [rule],
      transactions: [
        makeTx({
          date: "2026-11-10",
          name: "ピーリング",
          kind: "expense",
          amount: 100_000,
          ruleId: rule._id,
          ruleMonth: "2026-11",
          addon: true,
        }),
      ],
      horizonEnd: "2026-11-30",
    });

    const novemberRows = rows.filter((r) => r.date.startsWith("2026-11"));
    expect(novemberRows).toHaveLength(1);
    const row = novemberRows[0];
    expect(row.isVirtual).toBe(true);
    expect(row.kind).toBe("expense");
    expect(row.amount).toBe(230_000);
    expect(row.baseAmount).toBe(130_000);
    expect(row.addons).toHaveLength(1);
    expect(row.addons?.[0].name).toBe("ピーリング");
    expect(row.balance).toBe(-230_000);
  });

  it("アドオンincome（返金相当）: expenseルール + incomeアドオンで打ち消し合う", () => {
    const rule = makeRule({ name: "AMEX", kind: "expense", amount: 130_000, dayOfMonth: 10 });
    const rows = buildForecast({
      anchorDate: "2026-11-01",
      anchorBalance: 0,
      threshold: 0,
      rules: [rule],
      transactions: [
        makeTx({
          date: "2026-11-10",
          name: "返金",
          kind: "income",
          amount: 30_000,
          ruleId: rule._id,
          ruleMonth: "2026-11",
          addon: true,
        }),
      ],
      horizonEnd: "2026-11-30",
    });

    const row = rows.find((r) => r.date === "2026-11-10");
    expect(row).toBeDefined();
    expect(row?.amount).toBe(100_000);
    expect(row?.kind).toBe("expense");
  });

  it("吸収: 上書き行がある月のアドオンは残高に入らず、上書き行のaddonsに付く", () => {
    const rule = makeRule({ name: "AMEX", kind: "expense", amount: 130_000, dayOfMonth: 10 });
    const rows = buildForecast({
      anchorDate: "2026-11-01",
      anchorBalance: 0,
      threshold: 0,
      rules: [rule],
      transactions: [
        makeTx({
          date: "2026-11-10",
          name: "AMEX(確定)",
          kind: "expense",
          amount: 230_000,
          ruleId: rule._id,
          ruleMonth: "2026-11",
        }),
        makeTx({
          date: "2026-11-10",
          name: "ピーリング",
          kind: "expense",
          amount: 100_000,
          ruleId: rule._id,
          ruleMonth: "2026-11",
          addon: true,
        }),
      ],
      horizonEnd: "2026-11-30",
    });

    const novemberRows = rows.filter((r) => r.date.startsWith("2026-11"));
    expect(novemberRows).toHaveLength(1);
    expect(novemberRows[0].isVirtual).toBe(false);
    expect(novemberRows[0].amount).toBe(230_000);
    expect(novemberRows[0].addons).toHaveLength(1);
    expect(novemberRows[0].addons?.[0].name).toBe("ピーリング");
    expect(novemberRows[0].balance).toBe(-230_000);
  });

  it("上書き判定がアドオンに汚染されない: アドオンだけの月は仮想行(合算)が出て、他月の上書き判定に影響しない", () => {
    const rule = makeRule({ name: "AMEX", kind: "expense", amount: 130_000, dayOfMonth: 10 });
    const rows = buildForecast({
      anchorDate: "2026-10-01",
      anchorBalance: 0,
      threshold: 0,
      rules: [rule],
      transactions: [
        // 11月: アドオンのみ（上書きなし）→ 仮想行が合算されて出るはず
        makeTx({
          date: "2026-11-10",
          name: "ピーリング",
          kind: "expense",
          amount: 100_000,
          ruleId: rule._id,
          ruleMonth: "2026-11",
          addon: true,
        }),
        // 12月: 上書きのみ
        makeTx({
          date: "2026-12-10",
          name: "AMEX(確定)",
          kind: "expense",
          amount: 140_000,
          ruleId: rule._id,
          ruleMonth: "2026-12",
        }),
      ],
      horizonEnd: "2026-12-31",
    });

    const novemberRow = rows.find((r) => r.date === "2026-11-10");
    expect(novemberRow?.isVirtual).toBe(true);
    expect(novemberRow?.amount).toBe(230_000);

    const decemberRow = rows.find((r) => r.date === "2026-12-10");
    expect(decemberRow?.isVirtual).toBe(false);
    expect(decemberRow?.amount).toBe(140_000);
  });

  it("孤児アドオン: rulesに無いruleIdを持ち上書きも無いアドオンは通常行として残高に入る", () => {
    const rows = buildForecast({
      anchorDate: "2026-10-01",
      anchorBalance: 0,
      threshold: 0,
      rules: [], // ルールは既に削除されている想定
      transactions: [
        makeTx({
          date: "2026-11-10",
          name: "ピーリング(孤児)",
          kind: "expense",
          amount: 100_000,
          ruleId: "rule_deleted" as Doc<"rules">["_id"],
          ruleMonth: "2026-11",
          addon: true,
        }),
      ],
      horizonEnd: "2026-11-30",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].isVirtual).toBe(false);
    expect(rows[0].amount).toBe(100_000);
    expect(rows[0].addons).toBeUndefined();
    expect(rows[0].balance).toBe(-100_000);
  });

  it("複数アドオン（同月2件）が両方合算される", () => {
    const rule = makeRule({ name: "AMEX", kind: "expense", amount: 130_000, dayOfMonth: 10 });
    const rows = buildForecast({
      anchorDate: "2026-10-01",
      anchorBalance: 0,
      threshold: 0,
      rules: [rule],
      transactions: [
        makeTx({
          date: "2026-11-10",
          name: "ピーリング",
          kind: "expense",
          amount: 100_000,
          ruleId: rule._id,
          ruleMonth: "2026-11",
          addon: true,
        }),
        makeTx({
          date: "2026-11-10",
          name: "外食",
          kind: "expense",
          amount: 20_000,
          ruleId: rule._id,
          ruleMonth: "2026-11",
          addon: true,
        }),
      ],
      horizonEnd: "2026-11-30",
    });

    const row = rows.find((r) => r.date === "2026-11-10");
    expect(row?.amount).toBe(250_000);
    expect(row?.addons).toHaveLength(2);
    expect(row?.addons?.map((a) => a.name)).toEqual(["ピーリング", "外食"]);
  });
});

describe("buildForecast: historyTransactions（実績化済みの確定判定）", () => {
  it("historyTransactionsに含まれる上書き行(addonなし)の月は、仮想行が生成されない", () => {
    const rule = makeRule({ name: "AMEX", kind: "expense", amount: 130_000, dayOfMonth: 27 });
    const rows = buildForecast({
      anchorDate: "2026-08-20",
      anchorBalance: 0,
      threshold: 0,
      rules: [rule],
      transactions: [],
      historyTransactions: [
        makeTx({
          date: "2026-08-05",
          name: "AMEX(確定・実績化済み)",
          kind: "expense",
          amount: 140_000,
          ruleId: rule._id,
          ruleMonth: "2026-08",
        }),
      ],
      horizonEnd: "2026-09-30",
    });

    // 8月分(dayOfMonth=27) は anchorDate=8/20 より後だが、既に実績化済みなので仮想行は復活しない
    const augustRows = rows.filter((r) => r.date.startsWith("2026-08"));
    expect(augustRows).toHaveLength(0);

    const septemberRows = rows.filter((r) => r.date.startsWith("2026-09"));
    expect(septemberRows).toHaveLength(1);
    expect(septemberRows[0].isVirtual).toBe(true);
  });

  it("historyTransactionsに含まれるのがaddon:trueの行だけなら、仮想行は生成される（アドオンは確定を意味しない）", () => {
    const rule = makeRule({ name: "AMEX", kind: "expense", amount: 130_000, dayOfMonth: 27 });
    const rows = buildForecast({
      anchorDate: "2026-08-20",
      anchorBalance: 0,
      threshold: 0,
      rules: [rule],
      transactions: [],
      historyTransactions: [
        makeTx({
          date: "2026-08-05",
          name: "ピーリング",
          kind: "expense",
          amount: 10_000,
          ruleId: rule._id,
          ruleMonth: "2026-08",
          addon: true,
        }),
      ],
      horizonEnd: "2026-08-31",
    });

    const augustRows = rows.filter((r) => r.date.startsWith("2026-08"));
    expect(augustRows).toHaveLength(1);
    expect(augustRows[0].isVirtual).toBe(true);
    // historyTransactions側のaddon(10,000)がaddonsByKeyに混入していないこと＝
    // 仮想行の金額はルールのベース額のままであることを確認する。
    expect(augustRows[0].amount).toBe(130_000);
    expect(augustRows[0].balance).toBe(-130_000);
    expect(augustRows[0].addons).toBeUndefined();
  });

  it("historyTransactionsのaddon:true行はaddonsByKeyに混入せず、実際に生成される仮想行の金額に影響しない", () => {
    const rule = makeRule({ name: "AMEX", kind: "expense", amount: 130_000, dayOfMonth: 27 });
    const rows = buildForecast({
      anchorDate: "2026-08-20",
      anchorBalance: 0,
      threshold: 0,
      rules: [rule],
      transactions: [],
      historyTransactions: [
        // ruleMonth を、実際に仮想行が生成される9月分と同じキーにする。
        // これがaddonsByKeyに混じると9月の仮想行の金額が999,999分跳ね上がってしまう。
        makeTx({
          date: "2026-08-05",
          name: "過去に付いたアドオン",
          kind: "expense",
          amount: 999_999,
          ruleId: rule._id,
          ruleMonth: "2026-09",
          addon: true,
        }),
      ],
      horizonEnd: "2026-09-30",
    });

    const septemberRow = rows.find((r) => r.date === "2026-09-27");
    expect(septemberRow).toBeDefined();
    expect(septemberRow?.isVirtual).toBe(true);
    expect(septemberRow?.amount).toBe(130_000);
    expect(septemberRow?.addons).toBeUndefined();
  });

  it("ルールが存在しても対象月が実績化済みなら仮想行は出ず、基準日より後のアドオンは単独行として金額が残高に反映される", () => {
    const rule = makeRule({ name: "AMEX", kind: "expense", amount: 130_000, dayOfMonth: 27 });
    const rows = buildForecast({
      anchorDate: "2026-08-20",
      anchorBalance: 0,
      threshold: 0,
      rules: [rule],
      transactions: [
        // 確定行は既に履歴側に実績化されているので、ここにあるのはアドオンだけ（合算先が無い）。
        makeTx({
          date: "2026-08-25",
          name: "ピーリング",
          kind: "expense",
          amount: 10_000,
          ruleId: rule._id,
          ruleMonth: "2026-08",
          addon: true,
        }),
      ],
      historyTransactions: [
        makeTx({
          date: "2026-08-05",
          name: "AMEX(確定・実績化済み)",
          kind: "expense",
          amount: 140_000,
          ruleId: rule._id,
          ruleMonth: "2026-08",
        }),
      ],
      horizonEnd: "2026-09-30",
    });

    // 8月分の仮想行は復活しない（実績化済み）。代わりに、合算先を失ったアドオンが
    // 金額を黙って落とさないよう単独行として出て、残高にも反映される。
    const augustRows = rows.filter((r) => r.date.startsWith("2026-08"));
    expect(augustRows).toHaveLength(1);
    expect(augustRows[0].isVirtual).toBe(false);
    expect(augustRows[0].amount).toBe(10_000);
    expect(augustRows[0].balance).toBe(-10_000);

    const septemberRow = rows.find((r) => r.date === "2026-09-27");
    expect(septemberRow?.isVirtual).toBe(true);
    expect(septemberRow?.amount).toBe(130_000);
    expect(septemberRow?.balance).toBe(-140_000);
  });

  it("ルールが削除済みで対象月が実績化済みでも、従来どおり孤児アドオン行として出る（デグレしていないこと）", () => {
    const deletedRuleId = "rule_deleted" as Doc<"rules">["_id"];
    const rows = buildForecast({
      anchorDate: "2026-08-20",
      anchorBalance: 0,
      threshold: 0,
      rules: [], // ルールは既に削除されている想定
      transactions: [
        makeTx({
          date: "2026-08-25",
          name: "ピーリング(孤児)",
          kind: "expense",
          amount: 10_000,
          ruleId: deletedRuleId,
          ruleMonth: "2026-08",
          addon: true,
        }),
      ],
      historyTransactions: [
        makeTx({
          date: "2026-08-05",
          name: "AMEX(確定・実績化済み)",
          kind: "expense",
          amount: 140_000,
          ruleId: deletedRuleId,
          ruleMonth: "2026-08",
        }),
      ],
      horizonEnd: "2026-08-31",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].isVirtual).toBe(false);
    expect(rows[0].amount).toBe(10_000);
    expect(rows[0].balance).toBe(-10_000);
  });

  it("historyTransactionsを渡さなくても従来どおり動く（後方互換）", () => {
    const rule = makeRule({ name: "家賃", kind: "expense", amount: 80_000, dayOfMonth: 27 });
    const rows = buildForecast({
      anchorDate: "2026-07-01",
      anchorBalance: 0,
      threshold: 0,
      rules: [rule],
      transactions: [],
      horizonEnd: "2026-07-31",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].isVirtual).toBe(true);
    expect(rows[0].date).toBe("2026-07-27");
  });

  it("historyTransactionsの金額は残高計算に混入しない", () => {
    const rule = makeRule({ name: "給与", kind: "income", amount: 300_000, dayOfMonth: 25 });
    const baseInput = {
      anchorDate: "2026-07-01",
      anchorBalance: 100_000,
      threshold: 0,
      rules: [rule],
      transactions: [makeTx({ date: "2026-07-15", name: "家賃", kind: "expense", amount: 80_000 })],
      horizonEnd: "2026-08-01",
    };

    const withoutHistory = buildForecast(baseInput);
    const withHistory = buildForecast({
      ...baseInput,
      // ruleId・ruleMonthともに実際の行生成とは無関係な組み合わせにする。
      // overriddenKeysに追加されても既存のどの行にもマッチしないので、
      // amountがどこかに混入していれば行やbalanceに差分として現れるはず。
      historyTransactions: [
        makeTx({
          date: "2026-06-01",
          name: "無関係な実績行",
          kind: "expense",
          amount: 999_999_999,
          ruleId: "rule_unrelated" as Doc<"rules">["_id"],
          ruleMonth: "2099-01",
        }),
      ],
    });

    expect(withHistory).toEqual(withoutHistory);
  });
});

describe("addonDisplayName", () => {
  it("空文字のときは既定ラベル「上乗せ」を返す", () => {
    expect(addonDisplayName("")).toBe("上乗せ");
  });

  it("空白のみのときも既定ラベル「上乗せ」を返す", () => {
    expect(addonDisplayName("   ")).toBe("上乗せ");
  });

  it("通常の文字列はtrimして返す", () => {
    expect(addonDisplayName("  ピーリング  ")).toBe("ピーリング");
  });
});

describe("buildForecast: 名前なしアドオン", () => {
  it("名前が空文字のアドオンを持つ仮想行は、addons[0].nameが「上乗せ」・rawNameが空文字になる", () => {
    const rule = makeRule({ name: "AMEX", kind: "expense", amount: 130_000, dayOfMonth: 10 });
    const rows = buildForecast({
      anchorDate: "2026-11-01",
      anchorBalance: 0,
      threshold: 0,
      rules: [rule],
      transactions: [
        makeTx({
          date: "2026-11-10",
          name: "",
          kind: "expense",
          amount: 5_000,
          ruleId: rule._id,
          ruleMonth: "2026-11",
          addon: true,
        }),
      ],
      horizonEnd: "2026-11-30",
    });

    const row = rows.find((r) => r.date === "2026-11-10");
    expect(row?.addons).toHaveLength(1);
    expect(row?.addons?.[0].name).toBe("上乗せ");
    expect(row?.addons?.[0].rawName).toBe("");
  });
});
