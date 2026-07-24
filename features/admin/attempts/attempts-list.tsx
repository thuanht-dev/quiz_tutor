"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { PageHeader, EmptyState, ErrorState } from "@/components/shared/states";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Badge } from "@/components/ui/badge";
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
import { listAttempts, listQuizzes, listStudents } from "@/lib/repositories";
import { formatDuration, relativeTime, scorePercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  submitted: "Đã nộp",
  expired: "Hết giờ",
  in_progress: "Đang làm",
};

const STATUS_CLASS: Record<string, string> = {
  submitted: "bg-emerald-100 text-emerald-700",
  expired: "bg-amber-100 text-amber-700",
  in_progress: "bg-sky-100 text-sky-700",
};

export function AttemptsList() {
  const [studentFilter, setStudentFilter] = useState("all");
  const [quizFilter, setQuizFilter] = useState("all");

  const { data: students } = useQuery({
    queryKey: ["students"],
    queryFn: () => listStudents(),
  });
  const { data: quizzes } = useQuery({
    queryKey: ["quizzes", { subject: "all", status: "all" }],
    queryFn: () => listQuizzes(),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["attempts", { studentFilter, quizFilter }],
    queryFn: () =>
      listAttempts({
        student_id: studentFilter === "all" ? undefined : studentFilter,
        quiz_id: quizFilter === "all" ? undefined : quizFilter,
      }),
  });

  return (
    <div>
      <PageHeader title="Bài làm" description="Xem lại kết quả bài làm của học sinh" />

      <div className="mb-5 flex flex-wrap gap-3">
        <Select value={studentFilter} onValueChange={(v) => setStudentFilter(v ?? "all")}>
          <SelectTrigger className="h-10 min-w-40 rounded-xl">
            <SelectValue placeholder="Học sinh" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả học sinh</SelectItem>
            {students?.map((student) => (
              <SelectItem key={student.id} value={student.id}>
                {student.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={quizFilter} onValueChange={(v) => setQuizFilter(v ?? "all")}>
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
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState description="Không thể tải danh sách bài làm" onRetry={() => refetch()} />
      ) : !data?.length ? (
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
                <TableHead>Kết quả</TableHead>
                <TableHead>Thời gian làm</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Nộp bài</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell>
                    <Link
                      href={`/admin/attempts/${attempt.id}`}
                      className="font-bold text-sky-700 hover:underline"
                    >
                      {attempt.student?.display_name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell>{attempt.quiz?.title ?? "—"}</TableCell>
                  <TableCell>
                    {attempt.quiz?.subject ? (
                      <Badge
                        className="text-white"
                        style={{ backgroundColor: attempt.quiz.subject.color }}
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
                    {attempt.is_retry_wrong ? (
                      <span className="ml-1 text-xs font-normal text-amber-600">
                        (câu sai)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>{formatDuration(attempt.duration_seconds)}</TableCell>
                  <TableCell>
                    <Badge className={cn("border-0", STATUS_CLASS[attempt.status])}>
                      {STATUS_LABELS[attempt.status] ?? attempt.status}
                    </Badge>
                  </TableCell>
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
  );
}
