"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/constants";
import { useGuestSession } from "@/stores/guest-session";

const nameSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Nhập tên của bạn")
    .max(64, "Tên tối đa 64 ký tự"),
});

type NameValues = z.infer<typeof nameSchema>;

export function GuestNameGate({ children }: { children: React.ReactNode }) {
  const guestId = useGuestSession((s) => s.guestId);
  const displayName = useGuestSession((s) => s.displayName);
  const hydrated = useGuestSession((s) => s.hydrated);
  const setGuest = useGuestSession((s) => s.setGuest);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (hydrated) setReady(true);
  }, [hydrated]);

  const form = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { displayName: displayName ?? "" },
  });

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-teal-700">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (displayName && guestId) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="kid-card w-full space-y-6 p-6 sm:p-8"
      >
        <div>
          <p className="font-display text-2xl font-bold text-teal-700">
            {APP_NAME}
          </p>
          <h1 className="mt-2 font-display text-xl font-bold text-slate-800">
            Xin chào!
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Nhập tên để bắt đầu làm bài. Không cần tài khoản đăng nhập.
          </p>
        </div>

        <form
          onSubmit={form.handleSubmit((values) => {
            setGuest(values.displayName);
          })}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="guest-name">Tên của bạn</Label>
            <Input
              id="guest-name"
              className="h-12 rounded-2xl text-base"
              placeholder="Ví dụ: Minh"
              autoFocus
              {...form.register("displayName")}
            />
            {form.formState.errors.displayName ? (
              <p className="text-sm text-rose-500">
                {form.formState.errors.displayName.message}
              </p>
            ) : null}
          </div>
          <Button
            type="submit"
            className="kid-btn w-full bg-teal-600 text-white hover:bg-teal-700"
          >
            Vào học
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
