"use client";

import { motion } from "framer-motion";
import { Inbox, AlertTriangle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-teal-200 bg-teal-50/60 px-6 py-14 text-center",
        className
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-white text-teal-500 shadow-sm">
        <Icon className="size-7" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        {description ? (
          <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {action}
    </motion.div>
  );
}

export function ErrorState({
  title = "Có lỗi xảy ra",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-6 py-14 text-center">
      <AlertTriangle className="size-10 text-rose-500" />
      <div>
        <h3 className="text-lg font-bold text-rose-700">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-rose-600/80">{description}</p>
        ) : null}
      </div>
      {onRetry ? (
        <Button onClick={onRetry} variant="outline" size="lg">
          Thử lại
        </Button>
      ) : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-500 sm:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
