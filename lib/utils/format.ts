import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m <= 0) return `${s} giây`;
  return `${m} phút ${s.toString().padStart(2, "0")} giây`;
}

export function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function relativeTime(date: string | null | undefined) {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi });
}

export function scorePercent(score: number, max: number) {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}
