"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Sparkles, TestTube2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PageHeader, ErrorState } from "@/components/shared/states";
import { getAISettings, testGeminiApiKey, updateAISettings } from "@/lib/repositories";
import type { AISettings } from "@/lib/ai/settings";

function AISettingsForm({ initial }: { initial: AISettings }) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [apiKey, setApiKey] = useState(initial.gemini_api_key ?? "");
  const [showKey, setShowKey] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (values: Partial<AISettings>) => updateAISettings(values),
    onMutate: () => toast.loading("Đang lưu cấu hình AI...", { id: "ai-save" }),
    onSuccess: (saved) => {
      toast.success("Đã lưu cấu hình AI", { id: "ai-save" });
      queryClient.setQueryData(["ai-settings"], saved);
      queryClient.invalidateQueries({ queryKey: ["ai-enabled"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể lưu cấu hình AI", {
        id: "ai-save",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: () => testGeminiApiKey(),
    onMutate: () =>
      toast.loading("Đang kiểm tra kết nối Gemini...", { id: "ai-test" }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(result.message, { id: "ai-test" });
      } else {
        toast.error(result.message, { id: "ai-test" });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Kiểm tra thất bại", { id: "ai-test" });
    },
  });

  function handleSave() {
    if (!apiKey.trim()) {
      toast.error("Vui lòng nhập API key trước khi lưu");
      return;
    }
    saveMutation.mutate({ enabled, gemini_api_key: apiKey.trim() });
  }

  function handleToggleEnabled(next: boolean) {
    setEnabled(next);
    // Lưu luôn để học sinh thấy nút AI ngay
    if (apiKey.trim()) {
      saveMutation.mutate({ enabled: next, gemini_api_key: apiKey.trim() });
    } else if (next) {
      toast.error("Nhập API key trước khi bật AI");
      setEnabled(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="kid-card space-y-5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-slate-800">
              Gia sư AI (Google Gemini)
            </p>
            <p className="text-sm text-slate-500">
              Giải thích đáp án bằng AI cho học sinh sau mỗi bài làm
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
          <div>
            <p className="font-bold text-slate-800">Bật tính năng AI</p>
            <p className="text-sm text-slate-500">
              Học sinh sẽ thấy nút &quot;Hỏi AI&quot; ở trang kết quả
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(value) => handleToggleEnabled(!!value)}
            disabled={saveMutation.isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gemini-key">Gemini API key</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="gemini-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                autoComplete="off"
                spellCheck={false}
                className="rounded-xl pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label={showKey ? "Ẩn key" : "Hiện key"}
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Lấy key miễn phí tại{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 underline-offset-2 hover:underline"
            >
              aistudio.google.com/apikey
            </a>
            . Key chỉ dùng server-side, không gửi cho học sinh.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="kid-btn gap-2 bg-indigo-500 hover:bg-indigo-600"
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Lưu cấu hình
          </Button>
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !apiKey.trim()}
            className="kid-btn gap-2"
          >
            {testMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <TestTube2 className="size-4" />
            )}
            Test kết nối
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
        <p className="font-bold">💡 Cách hoạt động</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>Mỗi câu hỏi trong trang kết quả có nút &quot;Hỏi AI&quot;.</li>
          <li>AI đọc câu hỏi + đáp án + lựa chọn của học sinh, sau đó giải thích ngắn gọn.</li>
          <li>Model mặc định: <code>gemini-1.5-flash</code> — nhanh, rẻ (gần như miễn phí).</li>
          <li>
            Tính năng này <strong>tốn quota API key của bạn</strong>. Theo dõi usage tại{" "}
            <a
              href="https://aistudio.google.com/usage"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              aistudio.google.com/usage
            </a>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}

export function AISettingsManager() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: () => getAISettings(),
    staleTime: 30_000,
  });

  return (
    <div>
      <PageHeader
        title="Cài đặt AI"
        description="Bật/tắt gia sư AI và cấu hình Gemini API key"
      />

      {isLoading ? (
        <div className="max-w-2xl space-y-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : isError || !data ? (
        <ErrorState
          description="Không thể tải cấu hình AI"
          onRetry={() => refetch()}
        />
      ) : (
        <AISettingsForm initial={data} />
      )}
    </div>
  );
}