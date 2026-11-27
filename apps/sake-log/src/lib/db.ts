import { buildNewRecord, validateStoredRecord } from "./db-record.ts";
import type { SakeLabelInfo, SakeRecord } from "./types.ts";
import type { AnalysisFields } from "./analysis-state.ts";

const DB_NAME = "sake-log-v1";
const STORE = "entries";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB を開けませんでした"));
  });
}

function runTxn<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const txn = db.transaction(STORE, mode);
        const store = txn.objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB の操作に失敗しました"));
        txn.oncomplete = () => db.close();
        txn.onerror = () =>
          reject(txn.error ?? new Error("IndexedDB のトランザクションに失敗しました"));
      }),
  );
}

export async function listSakeRecords(): Promise<SakeRecord[]> {
  const rows = await runTxn<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
  const records: SakeRecord[] = [];
  for (const key of rows) {
    const raw = await runTxn<unknown>("readonly", (store) => store.get(key));
    const entry = validateStoredRecord(raw);
    if (entry) records.push(entry);
  }
  records.sort((a, b) => b.createdAt - a.createdAt);
  return records;
}

export async function getSakeRecord(id: string): Promise<SakeRecord | null> {
  const raw = await runTxn<unknown>("readonly", (store) => store.get(id));
  return validateStoredRecord(raw);
}

export async function putSakeRecord(record: SakeRecord): Promise<void> {
  const valid = validateStoredRecord(record);
  if (!valid) throw new Error("保存できない記録です");
  await runTxn<IDBValidKey>("readwrite", (store) => store.put(valid));
}

export async function createSakeRecord(input: {
  rating: number;
  memo: string;
  label?: SakeLabelInfo;
  image: Blob;
  thumb: Blob;
  imageMime: string;
  thumbMime: string;
}): Promise<SakeRecord> {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const record = buildNewRecord({ ...input, id });
  await putSakeRecord(record);
  return record;
}

export async function updateSakeRecord(
  id: string,
  patch: Partial<Pick<SakeRecord, "rating" | "memo" | "label"> & AnalysisFields>,
): Promise<SakeRecord> {
  const current = await getSakeRecord(id);
  if (!current) throw new Error("記録が見つかりません");
  const next: SakeRecord = {
    ...current,
    ...patch,
    label: patch.label ?? current.label,
    updatedAt: Date.now(),
  };
  await putSakeRecord(next);
  return next;
}

export async function deleteSakeRecord(id: string): Promise<void> {
  await runTxn<undefined>("readwrite", (store) => store.delete(id));
}
