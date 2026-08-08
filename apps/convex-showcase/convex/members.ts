import { query } from "./_generated/server";

export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query("members").collect(),
});
