export function registerSuite(name: string): void {
  const register = (globalThis as { it?: (name: string, fn: () => void) => void }).it;
  if (typeof register === "function") register(name, () => {});
}
