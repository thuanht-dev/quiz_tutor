"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Radio } from "lucide-react";
import { PageHeader, EmptyState, ErrorState } from "@/components/shared/states";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listAttempts, listQuizzes } from "@/lib/repositories";
import { formatDuration, relativeTime, scorePercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { Attempt } from "@/types/database";

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

type StatusFilter = "all" | Attempt["status"];

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "in_progress", label: "Đang làm" },
  { value: "submitted", label: "Đã nộp" },
  { value: "expired", label: "Hết giờ" },
];

function attemptName(attempt: {
  guest_name?: string | null;
  student?: { display_name?: string } | null;
}) {
  return attempt.guest_name || attempt.student?.display_name || "—";
}

function isStaleInProgress(attempt: Attempt) {
  if (attempt.status !== "in_progress") return false;
  const ageMs = Date.now() - new Date(attempt.started_at).getTime();
  return ageMs > 2 * 60 * 60 * 1000;
}

function elapsedSince(startedAt: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  );
  return formatDuration(seconds);
}

export function AttemptsList() {
  const [nameFilter, setNameFilter] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [quizFilter, setQuizFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedName(nameFilter.trim()), 300);
    return () => window.clearTimeout(t);
  }, [nameFilter]);

  const { data: quizzes } = useQuery({
    queryKey: ["quizzes", { subject: "all", status: "all" }],
    queryFn: () => listQuizzes(),
    staleTime: 60_000,
  });

  // Single fetch — filter status on client to avoid double polling
  const { data: allAttempts, isLoading, isError, refetch, dataUpdatedAt } =
    useQuery({
      queryKey: ["attempts", { quizFilter, name: debouncedName }],
      queryFn: () =>
        listAttempts({
          guest_name: debouncedName || undefined,
          quiz_id: quizFilter === "all" ? undefined : quizFilter,
          status: "all",
        }),
      refetchInterval: (query) => {
        if (typeof document !== "undefined" && document.hidden) return false;
        const rows = query.state.data ?? [];
        const hasLive = rows.some((a) => a.status === "in_progress");
        return hasLive ? 20_000 : false;
      },
      staleTime: 10_000,
    });

  const summaryCounts = useMemo(() => {
    const rows = allAttempts ?? [];
    return {
      all: rows.length,
      in_progress: rows.filter((a) => a.status === "in_progress").length,
      submitted: rows.filter((a) => a.status === "submitted").length,
      expired: rows.filter((a) => a.status === "expired").length,
    };
  }, [allAttempts]);

  const data = useMemo(() => {
    const rows = allAttempts ?? [];
    if (statusFilter === "all") return rows;
    return rows.filter((a) => a.status === statusFilter);
  }, [allAttempts, statusFilter]);

  return (
    <div>
      <PageHeader
        title="Bài làm"
        description="Theo dõi học sinh đang làm bài và kết quả đã nộp"
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {(
          [
            { key: "in_progress" as const, label: "Đang làm", live: true },
            { key: "submitted" as const, label: "Đã nộp", live: false },
            { key: "expired" as const, label: "Hết giờ", live: false },
            { key: "all" as const, label: "Tổng cộng", live: false },
          ] as const
        ).map(({ key, label, live }) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={cn(
              "kid-card p-4 text-left transition",
              statusFilter === key
                ? "ring-2 ring-teal-400"
                : "hover:bg-teal-50/60"
            )}
          >
            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
              {live && summaryCounts.in_progress > 0 ? (
                <Radio className="size-3.5 animate-pulse text-sky-600" />
              ) : null}
              {label}
            </p>
            <p
              className={cn(
                "mt-1 text-2xl font-bold",
                key === "in_progress" ? "text-sky-700" : "text-slate-800"
              )}
            >
              {summaryCounts[key]}
            </p>
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          className="h-10 w-full max-w-xs rounded-xl"
          placeholder="Lọc theo tên học sinh..."
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
        />

        <Select
          value={quizFilter}
          onValueChange={(v) => setQuizFilter(v ?? "all")}
          items={[
            { value: "all", label: "Tất cả quiz" },
            ...(quizzes?.map((quiz) => ({
              value: quiz.id,
              label: quiz.title,
            })) ?? []),
          ]}
        >
          <SelectTrigger className="h-10 min-w-40 rounded-xl">
            <SelectValue placeholder="Quiz" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả quiz</SelectItem>
            {quizzes?.map((quiz) => (
              <SelectItem key={quiz.id} value={quiz.id}>
                {quiz.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter((v as StatusFilter) ?? "all")}
          items={STATUS_TABS.map((t) => ({ value: t.value, label: t.label }))}
        >
          <SelectTrigger className="h-10 min-w-36 rounded-xl">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_TABS.map((tab) => (
              <SelectItem key={tab.value} value={tab.value}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="flex items-center text-xs text-slate-400">
          Tự cập nhật · {relativeTime(new Date(dataUpdatedAt).toISOString())}
        </p>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState
          description="Không thể tải danh sách bài làm"
          onRetry={() => refetch()}
        />
      ) : !data?.length ? (
        <EmptyState
          icon={GraduationCap}
          title={
            statusFilter === "in_progress"
              ? "Không có ai đang làm bài"
              : "Chưa có bài làm nào"
          }
          description={
            statusFilter === "in_progress"
              ? "Khi học sinh bắt đầu quiz, sẽ hiện tại đây"
              : "Bài làm của học sinh sẽ xuất hiện tại đây"
          }
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
                <TableHead>Kết quả</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thời điểm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((attempt) => {
                const live = attempt.status === "in_progress";
                const stale = isStaleInProgress(attempt);
                return (
                  <TableRow
                    key={attempt.id}
                    className={cn(live && !stale && "bg-sky-50/70")}
                  >
                    <TableCell>
                      <Link
                        href={`/admin/attempts/${attempt.id}`}
                        className="font-bold text-teal-700 hover:underline"
                      >
                        {attemptName(attempt)}
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
                      {live ? (
                        <span className="font-normal text-slate-400">
                          Chưa nộp
                        </span>
                      ) : (
                        <>
                          {attempt.score}/{attempt.max_score} (
                          {scorePercent(attempt.score, attempt.max_score)}%)
                          {attempt.is_retry_wrong ? (
                            <span className="ml-1 text-xs font-normal text-amber-600">
                              (câu sai)
                            </span>
                          ) : null}
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      {live ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <Badge
                          className={cn(
                            "border-0",
                            attempt.passed
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          )}
                        >
                          {attempt.passed ? "Đạt" : "Chưa đạt"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {live
                        ? elapsedSince(attempt.started_at)
                        : formatDuration(attempt.duration_seconds)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "border-0",
                          STATUS_CLASS[attempt.status],
                          live && !stale && "animate-pulse"
                        )}
                      >
                        {stale
                          ? "Chưa nộp (có thể bỏ dở)"
                          : (STATUS_LABELS[attempt.status] ?? attempt.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {live
                        ? `Bắt đầu ${relativeTime(attempt.started_at)}`
                        : relativeTime(attempt.submitted_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
