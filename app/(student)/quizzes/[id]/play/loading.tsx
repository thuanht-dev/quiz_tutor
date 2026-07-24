import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-teal-700">
      <Loader2 className="size-12 animate-spin" />
      <p className="font-display text-xl font-bold">Đang chuẩn bị bài làm...</p>
      <p className="text-sm text-slate-500">Chờ một chút nhé!</p>
    </div>
  );
}
