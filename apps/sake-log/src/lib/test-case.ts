// vitest は it() の無いファイルを失敗にする。node から直接走らせたときは中で assert 済みなので何もしない。
export function registerSuite(name: string): void {
  const register = (globalThis as { it?: (name: string, fn: () => void) => void }).it;
  if (typeof register === "function") register(name, () => {});
}
