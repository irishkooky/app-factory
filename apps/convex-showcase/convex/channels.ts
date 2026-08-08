import { query } from "./_generated/server";

export const listWithStats = query({
  args: {},
  handler: async (ctx) => {
    const channels = await ctx.db.query("channels").collect();

    return Promise.all(
      channels.map(async (channel) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
          .collect();
        const messageCount = messages.length;

        const latest = await ctx.db
          .query("messages")
          .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
          .order("desc")
          .first();

        let lastMessage: {
          body: string;
          authorName: string;
          at: number;
        } | null = null;

        if (latest !== null) {
          const author = await ctx.db.get(latest.authorId);
          lastMessage = {
            body: latest.body,
            authorName: author?.name ?? "？？？",
            at: latest._creationTime,
          };
        }

        return {
          _id: channel._id,
          name: channel.name,
          description: channel.description,
          emoji: channel.emoji,
          messageCount,
          lastMessage,
        };
      }),
    );
  },
});
