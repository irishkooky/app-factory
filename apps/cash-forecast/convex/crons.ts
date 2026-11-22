import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 毎日 14:50 UTC = JST 23:50。JST の日付が四半期末の日だけ、その日の入力を反映した残高と予測を記録する。
crons.daily(
  "forecast snapshots",
  { hourUTC: 14, minuteUTC: 50 },
  internal.forecastSnapshots.recordQuarterEnd,
);

export default crons;
