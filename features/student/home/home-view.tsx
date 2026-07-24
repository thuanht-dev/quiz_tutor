"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  History,
  ListChecks,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import { PendingLink } from "@/components/shared/pending-link";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/shared/states";
import { cn } from "@/lib/utils";
import { formatDuration, relativeTime, scorePercent } from "@/lib/utils/format";
import type { Attempt, Profile, StudentQuizCard } from "@/types/database";

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const bigint = Number.parseInt(full, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function QuizCard({ quiz, index }: { quiz: StudentQuizCard; index: number }) {
  const color = quiz.subject?.color ?? "#0EA5E9";
  const percent =
    quiz.completed && quiz.best_max_score
      ? scorePercent(quiz.best_score ?? 0, quiz.best_max_score)
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 260, damping: 22 }}
      whileHover={{ y: -4 }}
      className="kid-card flex flex-col gap-4 border-2 p-5"
      style={{ borderColor: hexToRgba(color, 0.3) }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
          style={{ backgroundColor: hexToRgba(color, 0.15), color }}
        >
          <Sparkles className="size-3.5" />
          {quiz.subject?.name ?? "Môn học"}
        </span>
        {quiz.completed ? (
          <Badge
            className={cn(
              "gap-1",
              quiz.best_passed
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-800"
            )}
          >
            <CheckCircle2 className="size-3.5" />
            {quiz.best_passed ? "Đạt" : "Chưa đạt"}
          </Badge>
        ) : null}
      </div>

      <div>
        <h3 className="font-display text-lg font-bold text-slate-800">
          {quiz.title}
        </h3>
        {quiz.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
            {quiz.description}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <span className="inline-flex items-center gap-1">
          <ListChecks className="size-4" /> {quiz.question_count ?? 0} câu
        </span>
        {quiz.time_limit_seconds ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" /> {formatDuration(quiz.time_limit_seconds)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-slate-400">
            <Clock className="size-4" /> Không giới hạn
          </span>
        )}
      </div>

      {percent !== null ? (
        <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-amber-700">
          <Trophy className="size-4 shrink-0" />
          <span className="text-sm font-bold">
            Điểm cao nhất: {percent}% (cần ≥ {quiz.pass_percent ?? 85}%)
          </span>
          {quiz.attempt_count > 1 ? (
            <span className="ml-auto shrink-0 text-xs text-amber-600/80">
              Đã làm {quiz.attempt_count} lần
            </span>
          ) : null}
        </div>
      ) : null}

      <PendingLink
        href={`/quizzes/${quiz.id}/play`}
        className="kid-btn mt-auto inline-flex items-center justify-center gap-2 text-white shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
        style={{ backgroundColor: color }}
      >
        {quiz.completed ? (
          <>
            <RotateCcw className="size-4" /> Làm lại
          </>
        ) : (
          <>
            <PlayCircle className="size-4" /> Làm bài
          </>
        )}
      </PendingLink>
    </motion.div>
  );
}

function RecentAttemptRow({ attempt, index }: { attempt: Attempt; index: number }) {
  const percent = scorePercent(attempt.score, attempt.max_score);
  const color = attempt.quiz?.subject?.color ?? "#0EA5E9";
  const tone =
    percent >= 80
      ? "text-emerald-600 bg-emerald-50"
      : percent >= 50
        ? "text-amber-600 bg-amber-50"
        : "text-rose-600 bg-rose-50";

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/attempts/${attempt.id}`}
        className="kid-card flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5"
      >
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {attempt.quiz?.subject?.name?.[0] ?? "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-slate-800">
            {attempt.quiz?.title ?? "Bài trắc nghiệm"}
          </p>
          <p className="text-xs text-slate-500">
            {relativeTime(attempt.submitted_at)} · {formatDuration(attempt.duration_seconds)}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-3 py-1 text-sm font-bold", tone)}>
          {percent}%
        </span>
        <ChevronRight className="size-5 shrink-0 text-slate-300" />
      </Link>
    </motion.div>
  );
}

export function HomeView({
  profile,
  quizzes,
  recent,
}: {
  profile: Profile;
  quizzes: StudentQuizCard[];
  recent: Attempt[];
}) {
  return (
    <div className="space-y-8">
      <PageHeader
        title={`Chào ${profile.display_name}! 👋`}
        description="Chọn một bài trắc nghiệm để bắt đầu luyện tập nhé!"
      />

      {quizzes.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Chưa có bài trắc nghiệm nào"
          description="Gia sư sẽ sớm thêm bài mới, quay lại sau nhé!"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz, i) => (
            <QuizCard key={quiz.id} quiz={quiz} index={i} />
          ))}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-slate-800">
          <History className="size-5 text-teal-500" /> Điểm gần đây
        </h2>
        {recent.length === 0 ? (
          <EmptyState
            className="py-8"
            title="Chưa có kết quả nào"
            description="Làm bài đầu tiên để xem điểm ở đây nhé!"
          />
        ) : (
          <div className="space-y-3">
            {recent.map((attempt, i) => (
              <RecentAttemptRow key={attempt.id} attempt={attempt} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
