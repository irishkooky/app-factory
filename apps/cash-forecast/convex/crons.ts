import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 毎日 15:17 UTC ≒ JST 翌0:17。四半期開始日と観測日の取りこぼしを cron 側で拾う。
crons.daily(
  "forecast checkpoints",
  { hourUTC: 15, minuteUTC: 17 },
  internal.checkpoints.runDaily,
);

export default crons;
