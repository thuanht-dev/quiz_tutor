"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  GraduationCap,
  HelpCircle,
  Users,
} from "lucide-react";
import { PageHeader, EmptyState, ErrorState } from "@/components/shared/states";
import { StatCardsSkeleton, TableSkeleton } from "@/components/shared/skeletons";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardStats } from "@/lib/repositories";
import { formatDuration, relativeTime, scorePercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const STAT_CARDS = [
  {
    key: "student_count" as const,
    label: "Học sinh",
    icon: Users,
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

export function DashboardView() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  return (
    <div>
      <PageHeader
        title="Bảng điều khiển"
        description="Tổng quan hoạt động học tập của học sinh"
      />

      {isLoading ? (
        <StatCardsSkeleton />
      ) : isError ? (
        <ErrorState
          description="Không thể tải dữ liệu thống kê"
          onRetry={() => refetch()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {STAT_CARDS.map(({ key, label, icon: Icon, accent, bg }) => (
            <div
              key={key}
              className="kid-card flex items-center gap-4 p-5"
            >
              <div
                className={cn(
                  "flex size-14 items-center justify-center rounded-2xl text-white shadow-md",
                  accent
                )}
              >
                <Icon className="size-7" />
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
        <h2 className="mb-4 font-display text-xl font-bold text-slate-800">
          Bài làm gần đây
        </h2>

        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorState description="Không thể tải danh sách bài làm" onRetry={() => refetch()} />
        ) : !data?.recent_attempts.length ? (
          <EmptyState
            icon={GraduationCap}
            title="Chưa có bài làm nào"
            description="Bài làm của học sinh sẽ xuất hiện tại đây"
          />
        ) : (
          <div className="kid-card overflow-hidden p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Học sinh</TableHead>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Môn học</TableHead>
                  <TableHead>Điểm</TableHead>
                  <TableHead>Thời gian làm</TableHead>
                  <TableHead>Nộp bài</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent_attempts.map((attempt) => (
                  <TableRow key={attempt.id} className="cursor-default">
                    <TableCell>
                      <Link
                        href={`/admin/attempts/${attempt.id}`}
                        className="font-bold text-teal-700 hover:underline"
                      >
                        {attempt.student?.display_name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell>{attempt.quiz?.title ?? "—"}</TableCell>
                    <TableCell>
                      {attempt.quiz?.subject ? (
                        <Badge
                          className="text-white"
                          style={{
                            backgroundColor: attempt.quiz.subject.color,
                          }}
                        >
                          {attempt.quiz.subject.name}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-slate-700">
                      {attempt.score}/{attempt.max_score} (
                      {scorePercent(attempt.score, attempt.max_score)}%)
                    </TableCell>
                    <TableCell>{formatDuration(attempt.duration_seconds)}</TableCell>
                    <TableCell className="text-slate-500">
                      {relativeTime(attempt.submitted_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
