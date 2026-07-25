"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { HomeView } from "@/features/student/home/home-view";
import { ErrorState } from "@/components/shared/states";
import { listStudentHomeData } from "@/lib/repositories";
import { useGuestSession } from "@/stores/guest-session";

export function StudentHomeClient() {
  const guestId = useGuestSession((s) => s.guestId);
  const displayName = useGuestSession((s) => s.displayName);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["student-home", guestId],
    queryFn: () => listStudentHomeData(guestId!),
    enabled: !!guestId,
  });

  if (!guestId || !displayName) return null;

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-teal-700">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        description="Không thể tải danh sách quiz"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <HomeView
      displayName={displayName}
      quizzes={data.quizzes}
      recent={data.recent}
    />
  );
}
