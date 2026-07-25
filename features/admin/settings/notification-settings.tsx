"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getNotificationSettings,
  sendTestNotification,
  updateNotificationSettings,
} from "@/lib/repositories";
import type { NotificationSettings } from "@/types/database";

function SettingRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <div>
        <p className="font-bold text-slate-800">{label}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(value) => onChange(!!value)}
        disabled={disabled}
      />
    </div>
  );
}

function SettingsForm({ initial }: { initial: NotificationSettings }) {
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(initial.enabled);
  const [notifyOnStart, setNotifyOnStart] = useState(initial.notify_on_start);
  const [notifyOnSubmit, setNotifyOnSubmit] = useState(
    initial.notify_on_submit
  );
  const [recipientsText, setRecipientsText] = useState(
    initial.recipients.join("\n")
  );

  const saveMutation = useMutation({
    mutationFn: (values: NotificationSettings) =>
      updateNotificationSettings(values),
    onMutate: () => toast.loading("Đang lưu cấu hình...", { id: "settings" }),
    onSuccess: (saved) => {
      toast.success("Đã lưu cấu hình thông báo", { id: "settings" });
      queryClient.setQueryData(["notification-settings"], saved);
      setRecipientsText(saved.recipients.join("\n"));
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể lưu cấu hình", {
        id: "settings",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: () => sendTestNotification(),
    onMutate: () => toast.loading("Đang gửi email thử...", { id: "test-mail" }),
    onSuccess: () => {
      toast.success("Đã gửi email thử — kiểm tra hộp thư", { id: "test-mail" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gửi email thử thất bại", {
        id: "test-mail",
      });
    },
  });

  function handleSave() {
    const recipients = recipientsText
      .split(/[\n,;]+/)
      .map((r) => r.trim())
      .filter(Boolean);

    const invalid = recipients.filter(
      (r) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r)
    );
    if (invalid.length) {
      toast.error(`Email không hợp lệ: ${invalid.join(", ")}`);
      return;
    }
    if (enabled && !recipients.length) {
      toast.error("Cần ít nhất 1 email người nhận khi bật thông báo");
      return;
    }

    saveMutation.mutate({
      enabled,
      recipients,
      notify_on_start: notifyOnStart,
      notify_on_submit: notifyOnSubmit,
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="kid-card space-y-4 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                <Mail className="size-5" />
              </div>
              <p className="font-display text-lg font-bold text-slate-800">
                Email thông báo
              </p>
            </div>

            <SettingRow
              label="Bật thông báo email"
              description="Tắt sẽ ngừng gửi mọi email thông báo"
              checked={enabled}
              onChange={setEnabled}
            />
            <SettingRow
              label="Khi học sinh bắt đầu làm bài"
              description="Gửi email lúc học sinh vào làm quiz"
              checked={notifyOnStart}
              onChange={setNotifyOnStart}
              disabled={!enabled}
            />
            <SettingRow
              label="Khi học sinh nộp bài"
              description="Gửi email kèm điểm số và kết quả đạt/chưa đạt"
              checked={notifyOnSubmit}
              onChange={setNotifyOnSubmit}
              disabled={!enabled}
            />

            <div className="space-y-2">
              <Label htmlFor="recipients">Người nhận</Label>
              <Textarea
                id="recipients"
                rows={4}
                className="rounded-xl"
                placeholder={"me@gmail.com\nphuhuynh@gmail.com"}
                value={recipientsText}
                onChange={(e) => setRecipientsText(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Mỗi dòng một email (hoặc ngăn cách bằng dấu phẩy).
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="kid-btn gap-2 bg-teal-500 hover:bg-teal-600"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Lưu cấu hình
              </Button>
              <Button
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
                className="kid-btn gap-2"
              >
                {testMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Gửi email thử
              </Button>
            </div>
          </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-bold">Lưu ý cấu hình SMTP</p>
        <p className="mt-1">
          Máy chủ gửi mail dùng biến môi trường <code>SMTP_HOST</code>,{" "}
          <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>
          , <code>SMTP_FROM</code> trong <code>.env.local</code>. Với Gmail,
          dùng App Password (không dùng mật khẩu thường) và{" "}
          <code>SMTP_HOST=smtp.gmail.com</code>, <code>SMTP_PORT=465</code>.
        </p>
      </div>
    </div>
  );
}

export function NotificationSettingsManager() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: () => getNotificationSettings(),
    staleTime: 30_000,
  });

  return (
    <div>
      <PageHeader
        title="Cài đặt thông báo"
        description="Gửi email cho gia sư/phụ huynh khi học sinh làm bài"
      />

      {isLoading ? (
        <div className="max-w-2xl space-y-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : isError || !data ? (
        <ErrorState
          description="Không thể tải cấu hình thông báo"
          onRetry={() => refetch()}
        />
      ) : (
        <SettingsForm initial={data} />
      )}
    </div>
  );
}
