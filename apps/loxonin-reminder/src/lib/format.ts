/** 分数を「3時間30分」「45分」「4時間」のような日本語表記に整形する */
export function formatDuration(minutes: number): string {
  const totalMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}時間${mins}分`;
  }
  if (hours > 0) {
    return `${hours}時間`;
  }
  return `${mins}分`;
}

/** epoch ms を端末ローカル時刻の「HH:MM」に整形する */
export function formatTime(epochMs: number): string {
  const date = new Date(epochMs);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** epoch ms を端末ローカル時刻の「M/D HH:MM」に整形する */
export function formatDateTime(epochMs: number): string {
  const date = new Date(epochMs);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day} ${formatTime(epochMs)}`;
}

/** epoch ms を端末ローカル時刻の「YYYY-MM-DDTHH:mm」に整形する(datetime-local 入力用) */
export function toDatetimeLocalValue(epochMs: number): string {
  const date = new Date(epochMs);
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
