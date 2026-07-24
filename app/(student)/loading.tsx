import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-teal-700">
      <Loader2 className="size-10 animate-spin" />
      <p className="font-display text-lg font-bold">Đang tải...</p>
    </div>
  );
}
