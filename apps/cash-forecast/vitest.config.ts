import { defineConfig } from "vitest/config";

// vite.config.ts は Cloudflare Workers 向けの plugin を含んでおり、
// そのまま vitest に読み込ませると Workers runner の起動でエラーになる。
// テスト実行は素の Node 環境で行うため、専用の設定を分離する。
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
