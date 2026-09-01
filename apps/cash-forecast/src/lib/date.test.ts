import { describe, expect, it } from "vitest";
import { usagePeriodLabel } from "./date";

describe("usagePeriodLabel", () => {
  it("支払日が締め日より後: 2026-09-27・締め18 → （8/19-9/18）", () => {
    expect(usagePeriodLabel("2026-09-27", 18)).toBe("（8/19-9/18）");
  });

  it("翌月分: 2026-10-27・締め18 → （9/19-10/18）", () => {
    expect(usagePeriodLabel("2026-10-27", 18)).toBe("（9/19-10/18）");
  });

  it("支払日が締め日以前: 2026-08-10・締め18 → （6/19-7/18）", () => {
    expect(usagePeriodLabel("2026-08-10", 18)).toBe("（6/19-7/18）");
  });

  it("月末クランプ: 締め31・支払2026-03-05 → （2/1-2/28）", () => {
    expect(usagePeriodLabel("2026-03-05", 31)).toBe("（2/1-2/28）");
  });

  it("年跨ぎ: 2026-01-27・締め18 → （12/19-1/18）", () => {
    expect(usagePeriodLabel("2026-01-27", 18)).toBe("（12/19-1/18）");
  });
});
