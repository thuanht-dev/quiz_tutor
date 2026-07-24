"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, X } from "lucide-react";
import { PageHeader, ErrorState } from "@/components/shared/states";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Badge } from "@/components/ui/badge";
import { getAttempt } from "@/lib/repositories";
import { formatDuration, relativeTime, scorePercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  submitted: "Đã nộp",
  expired: "Hết giờ",
  in_progress: "Đang làm",
};

export function AttemptDetail({ attemptId }: { attemptId: string }) {
  const { data: attempt, isLoading, isError, refetch } = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => getAttempt(attemptId),
  });

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/admin/attempts"
          className="inline-flex items-center gap-1 text-sm font-bold text-teal-600 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Quay lại danh sách bài làm
        </Link>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError || !attempt ? (
        <ErrorState description="Không tìm thấy bài làm" onRetry={() => refetch()} />
      ) : (
        <>
          <PageHeader
            title={attempt.quiz?.title ?? "Bài làm"}
            description={`Học sinh: ${attempt.student?.display_name ?? "—"}`}
          />

          <div className="mb-6 grid gap-4 sm:grid-cols-5">
            <div className="kid-card p-4 text-center">
              <p className="text-2xl font-bold text-teal-600">
                {attempt.score}/{attempt.max_score}
              </p>
              <p className="text-sm text-slate-500">Điểm số</p>
            </div>
            <div className="kid-card p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {scorePercent(attempt.score, attempt.max_score)}%
              </p>
              <p className="text-sm text-slate-500">Tỉ lệ đúng</p>
            </div>
            <div className="kid-card p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {attempt.correct_count}/{attempt.total_questions}
              </p>
              <p className="text-sm text-slate-500">Câu đúng</p>
            </div>
            <div className="kid-card p-4 text-center">
              <p className="text-2xl font-bold text-slate-700">
                {formatDuration(attempt.duration_seconds)}
              </p>
              <p className="text-sm text-slate-500">Thời gian làm bài</p>
            </div>
            <div className="kid-card p-4 text-center">
              <p
                className={cn(
                  "text-2xl font-bold",
                  attempt.passed ? "text-emerald-600" : "text-rose-600"
                )}
              >
                {attempt.passed ? "ĐẠT" : "CHƯA"}
              </p>
              <p className="text-sm text-slate-500">
                Yêu cầu ≥ {attempt.quiz?.pass_percent ?? 85}%
              </p>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Badge className="border-0 bg-teal-100 text-teal-700">
              {STATUS_LABELS[attempt.status] ?? attempt.status}
            </Badge>
            {attempt.is_retry_wrong ? (
              <Badge className="border-0 bg-amber-100 text-amber-800">
                Làm lại câu sai
              </Badge>
            ) : null}
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
            <span className="text-sm text-slate-500">
              Nộp bài {relativeTime(attempt.submitted_at)}
            </span>
          </div>

          <h2 className="mb-4 font-display text-xl font-bold text-slate-800">
            Chi tiết từng câu hỏi
          </h2>

          <div className="space-y-4">
            {attempt.answers?.map((answer, index) => (
              <div key={answer.id} className="kid-card p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-800">
                    Câu {index + 1}: {answer.question?.content ?? "—"}
                  </p>
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-white",
                      answer.is_correct ? "bg-emerald-500" : "bg-rose-500"
                    )}
                  >
                    {answer.is_correct ? (
                      <Check className="size-4" />
                    ) : (
                      <X className="size-4" />
                    )}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {answer.question?.options?.map((option) => {
                    const isSelected = option.id === answer.selected_option_id;
                    const isCorrect = option.is_correct;
                    return (
                      <div
                        key={option.id}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-sm",
                          isCorrect
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                            : isSelected
                              ? "border-rose-300 bg-rose-50 text-rose-800"
                              : "border-teal-100 bg-white text-slate-600"
                        )}
                      >
                        <span className="font-bold">{option.label}.</span>{" "}
                        {option.content}
                        {isSelected ? (
                          <span className="ml-2 text-xs font-bold">
                            (Học sinh chọn)
                          </span>
                        ) : null}
                        {isCorrect ? (
                          <span className="ml-2 text-xs font-bold">
                            (Đáp án đúng)
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {answer.question?.explanation ? (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Giải thích: {answer.question.explanation}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
