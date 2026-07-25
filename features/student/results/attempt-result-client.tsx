"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ResultView } from "@/features/student/results/result-view";
import { ErrorState } from "@/components/shared/states";
import { getAttempt } from "@/lib/repositories";
import { useGuestSession } from "@/stores/guest-session";

export function AttemptResultClient({ attemptId }: { attemptId: string }) {
  const guestId = useGuestSession((s) => s.guestId);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["attempt-result", attemptId, guestId],
    queryFn: () => getAttempt(attemptId, guestId),
    enabled: !!guestId,
  });

  if (!guestId || isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-teal-700">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        description="Không thể tải kết quả bài làm"
        onRetry={() => refetch()}
      />
    );
  }

  if (!data || data.status === "in_progress") {
    return (
      <ErrorState description="Không tìm thấy kết quả bài làm của bạn" />
    );
  }

  return <ResultView attempt={data} />;
}
