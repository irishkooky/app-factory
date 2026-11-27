import { transitionAnalysis } from "./analysis-state.ts";
import { blobToBase64 } from "./blob.ts";
import { getSakeRecord, updateSakeRecord } from "./db.ts";
import { analyzeSakeLabel } from "../server/analyze-label";

const inflight = new Set<string>();
const listeners = new Set<() => void>();

export function subscribeSakeChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  for (const listener of listeners) listener();
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** 保存直後に呼ぶ。画面遷移を待たずに IndexedDB へ結果を書く */
export async function startLabelAnalysis(id: string): Promise<void> {
  if (inflight.has(id)) return;
  inflight.add(id);
  try {
    const current = await getSakeRecord(id);
    if (!current) return;
    const begun = transitionAnalysis(current, { type: "begin" });
    await updateSakeRecord(id, begun);
    emit();
    const imageBase64 = await blobToBase64(current.image);
    const label = await analyzeSakeLabel({
      data: { imageBase64, mimeType: current.imageMime },
    });
    const done = transitionAnalysis(begun, { type: "succeed" });
    await updateSakeRecord(id, { ...done, label });
  } catch (err) {
    const latest = await getSakeRecord(id);
    if (latest) {
      await updateSakeRecord(
        id,
        transitionAnalysis(latest, { type: "fail", message: errorMessage(err) }),
      );
    }
  } finally {
    inflight.delete(id);
    emit();
  }
}
