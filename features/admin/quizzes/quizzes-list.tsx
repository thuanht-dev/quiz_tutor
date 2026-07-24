"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, ErrorState } from "@/components/shared/states";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { deleteQuiz, listQuizzes, listSubjects } from "@/lib/repositories";
import { QUIZ_STATUS_LABELS } from "@/lib/constants";
import { formatDuration, relativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const STATUS_BADGE_CLASS: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
  archived: "bg-slate-200 text-slate-600",
};

export function QuizzesList() {
  const queryClient = useQueryClient();
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => listSubjects(),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["quizzes", { subject: subjectFilter, status: statusFilter }],
    queryFn: () =>
      listQuizzes({
        subject_id: subjectFilter === "all" ? undefined : subjectFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuiz(id),
    onMutate: () => toast.loading("Đang xoá quiz...", { id: "delete-quiz" }),
    onSuccess: () => {
      toast.success("Đã xoá quiz", { id: "delete-quiz" });
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
    },
    onError: (error: Error) =>
      toast.error(error.message || "Không thể xoá quiz", { id: "delete-quiz" }),
  });

  function handleDelete(id: string, title: string) {
    if (window.confirm(`Xoá quiz "${title}"? Hành động này không thể hoàn tác.`)) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <div>
      <PageHeader
        title="Quiz"
        description="Quản lý các bài quiz cho học sinh"
        actions={
          <Link
            href="/admin/quizzes/new"
            className={cn(buttonVariants({ variant: "default" }), "kid-btn gap-2 bg-emerald-500 hover:bg-emerald-600")}
          >
            <Plus className="size-5" />
            Tạo quiz mới
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <Select
          value={subjectFilter}
          onValueChange={(v) => setSubjectFilter(v ?? "all")}
          items={[
            { value: "all", label: "Tất cả môn học" },
            ...(subjects?.map((subject) => ({
              value: subject.id,
              label: subject.name,
            })) ?? []),
          ]}
        >
          <SelectTrigger className="h-10 min-w-40 rounded-xl">
            <SelectValue placeholder="Môn học" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả môn học</SelectItem>
            {subjects?.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? "all")}
          items={[
            { value: "all", label: "Tất cả trạng thái" },
            ...Object.entries(QUIZ_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        >
          <SelectTrigger className="h-10 min-w-40 rounded-xl">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {Object.entries(QUIZ_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState description="Không thể tải danh sách quiz" onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState
          icon={ClipboardList}
          title="Chưa có quiz nào"
          description="Tạo quiz đầu tiên để học sinh bắt đầu luyện tập"
          action={
            <Link
              href="/admin/quizzes/new"
              className={cn(buttonVariants(), "kid-btn bg-sky-500 hover:bg-sky-600")}
            >
              Tạo quiz mới
            </Link>
          }
        />
      ) : (
        <div className="kid-card overflow-hidden p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Môn học</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Số câu hỏi</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((quiz) => (
                <TableRow key={quiz.id}>
                  <TableCell>
                    <Link
                      href={`/admin/quizzes/${quiz.id}`}
                      className="font-bold text-sky-700 hover:underline"
                    >
                      {quiz.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {quiz.subject ? (
                      <Badge
                        className="text-white"
                        style={{ backgroundColor: quiz.subject.color }}
                      >
                        {quiz.subject.name}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("border-0", STATUS_BADGE_CLASS[quiz.status])}>
                      {QUIZ_STATUS_LABELS[quiz.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{quiz.question_count ?? 0}</TableCell>
                  <TableCell>
                    {quiz.time_limit_seconds
                      ? formatDuration(quiz.time_limit_seconds)
                      : "Không giới hạn"}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {relativeTime(quiz.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => handleDelete(quiz.id, quiz.title)}
                      disabled={deleteMutation.isPending}
                      aria-label="Xoá"
                    >
                      {deleteMutation.isPending &&
                      deleteMutation.variables === quiz.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
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
