// vite.config.ts の Cloudflare plugin を vitest が読むと Workers runner が落ちる。
export default {
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
};
