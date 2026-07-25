"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  GraduationCap,
  HelpCircle,
  Loader2,
  Radio,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, ErrorState } from "@/components/shared/states";
import { StatCardsSkeleton, TableSkeleton } from "@/components/shared/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteAttempt, getDashboardStats } from "@/lib/repositories";
import { formatDuration, relativeTime, scorePercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

function attemptName(attempt: {
  guest_name?: string | null;
  student?: { display_name?: string } | null;
}) {
  return attempt.guest_name || attempt.student?.display_name || "—";
}

const STATUS_LABELS: Record<string, string> = {
  submitted: "Đã nộp",
  expired: "Hết giờ",
  in_progress: "Đang làm",
};

const STATUS_CLASS: Record<string, string> = {
  submitted: "bg-emerald-100 text-emerald-700",
  expired: "bg-amber-100 text-amber-700",
  in_progress: "bg-sky-100 text-sky-800",
};

export function DashboardView() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
    refetchInterval: 15_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAttempt(id),
    onMutate: () => toast.loading("Đang xoá bản ghi...", { id: "delete-attempt" }),
    onSuccess: () => {
      toast.success("Đã xoá bản ghi", { id: "delete-attempt" });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["attempts"] });
      queryClient.invalidateQueries({ queryKey: ["attempts-summary"] });
    },
    onError: (error: Error) =>
      toast.error(error.message || "Không thể xoá", { id: "delete-attempt" }),
  });

  function handleDelete(id: string, name: string) {
    if (
      window.confirm(
        `Xoá bản ghi của "${name}"?\n\nHành động này không thể hoàn tác.`
      )
    ) {
      deleteMutation.mutate(id);
    }
  }

  const cards = [
    {
      key: "in_progress_count" as const,
      label: "Đang làm",
      icon: Radio,
      accent: "bg-sky-500",
      bg: "bg-sky-50",
    },
    {
      key: "attempt_count" as const,
      label: "Đã nộp / hết giờ",
      icon: GraduationCap,
      accent: "bg-teal-500",
      bg: "bg-teal-50",
    },
    {
      key: "quiz_count" as const,
      label: "Quiz",
      icon: ClipboardList,
      accent: "bg-emerald-500",
      bg: "bg-emerald-50",
    },
    {
      key: "question_count" as const,
      label: "Câu hỏi",
      icon: HelpCircle,
      accent: "bg-amber-500",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Bảng điều khiển"
        description="Theo dõi học sinh đang làm bài và kết quả gần đây"
      />

      {isLoading ? (
        <StatCardsSkeleton />
      ) : isError ? (
        <ErrorState
          description="Không thể tải dữ liệu thống kê"
          onRetry={() => refetch()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ key, label, icon: Icon, accent, bg }) => (
            <div key={key} className="kid-card flex items-center gap-4 p-5">
              <div
                className={cn(
                  "flex size-14 items-center justify-center rounded-2xl text-white shadow-md",
                  accent
                )}
              >
                <Icon
                  className={cn(
                    "size-7",
                    key === "in_progress_count" &&
                      (data?.in_progress_count ?? 0) > 0 &&
                      "animate-pulse"
                  )}
                />
              </div>
              <div className={cn("flex-1 rounded-2xl px-3 py-2", bg)}>
                <p className="text-2xl font-bold text-slate-800">
                  {data?.[key] ?? 0}
                </p>
                <p className="text-sm font-medium text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-slate-800">
            Hoạt động gần đây
          </h2>
          <Link
            href="/admin/attempts"
            className="text-sm font-bold text-teal-600 hover:underline"
          >
            Xem tất cả
          </Link>
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorState
            description="Không thể tải danh sách bài làm"
            onRetry={() => refetch()}
          />
        ) : !data?.recent_attempts.length ? (
          <EmptyState
            icon={GraduationCap}
            title="Chưa có bài làm nào"
            description="Khi học sinh bắt đầu hoặc nộp bài, sẽ hiện tại đây"
          />
        ) : (
          <div className="kid-card overflow-hidden p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Học sinh</TableHead>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Điểm</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Thời điểm</TableHead>
                  <TableHead className="w-12 text-right"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent_attempts.map((attempt) => {
                  const live = attempt.status === "in_progress";
                  const name = attemptName(attempt);
                  return (
                    <TableRow
                      key={attempt.id}
                      className={cn(live && "bg-sky-50/70")}
                    >
                      <TableCell>
                        <Link
                          href={`/admin/attempts/${attempt.id}`}
                          className="font-bold text-teal-700 hover:underline"
                        >
                          {name}
                        </Link>
                      </TableCell>
                      <TableCell>{attempt.quiz?.title ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "border-0",
                            STATUS_CLASS[attempt.status],
                            live && "animate-pulse"
                          )}
                        >
                          {STATUS_LABELS[attempt.status] ?? attempt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-slate-700">
                        {live
                          ? "—"
                          : `${attempt.score}/${attempt.max_score} (${scorePercent(attempt.score, attempt.max_score)}%)`}
                      </TableCell>
                      <TableCell>
                        {live
                          ? "—"
                          : formatDuration(attempt.duration_seconds)}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {live
                          ? `Bắt đầu ${relativeTime(attempt.started_at)}`
                          : relativeTime(attempt.submitted_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-slate-400 hover:text-rose-600"
                          aria-label={`Xoá bản ghi của ${name}`}
                          disabled={
                            deleteMutation.isPending &&
                            deleteMutation.variables === attempt.id
                          }
                          onClick={() => handleDelete(attempt.id, name)}
                        >
                          {deleteMutation.isPending &&
                          deleteMutation.variables === attempt.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
