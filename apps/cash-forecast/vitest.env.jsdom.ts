// `vp test`（vite-plus 同梱の vitest）は環境名 "jsdom" を同梱側の node_modules から解決しようとし、
// アプリに入れた jsdom を見つけられない。パス指定の環境はプロジェクト直下から読み込まれるため、
// アプリ側の vitest が持つ組み込み jsdom 環境をここから再エクスポートして使う
// （vitest.config.ts の "dom" プロジェクトが参照する）。
import { builtinEnvironments } from 'vitest/environments'

export default builtinEnvironments.jsdom
