import { defineConfig } from "vitest/config";

// vite.config.ts は Cloudflare Workers 向けの plugin を含んでおり、
// そのまま vitest に読み込ませると Workers runner の起動でエラーになる。
// テスト実行は素の Node 環境で行うため、専用の設定を分離する。
//
// - unit: 純粋関数のテスト（*.test.ts）。Node 環境
// - dom:  React コンポーネントのテスト（*.test.tsx）。jsdom 環境（vitest.env.jsdom.ts 参照）
export default defineConfig({
  test: {
    projects: [
      { test: { name: "unit", environment: "node", include: ["src/**/*.test.ts"] } },
      { test: { name: "dom", environment: "./vitest.env.jsdom.ts", include: ["src/**/*.test.tsx"] } },
    ],
  },
});
