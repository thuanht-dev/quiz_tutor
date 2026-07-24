"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME, USE_MOCK } from "@/lib/constants";
import { signInAction } from "@/lib/auth/actions";
import { loginSchema, type LoginValues } from "@/lib/validations/schemas";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setLoading(true);
    try {
      const result = await signInAction(values.username, values.password);
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Đăng nhập thành công!");
      router.replace(result.role === "admin" ? "/admin" : "/");
      router.refresh();
    } catch {
      toast.error("Không thể đăng nhập");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100 lg:grid-cols-2"
      >
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-sky-400 via-cyan-400 to-emerald-300 p-10 text-white lg:block">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -left-10 top-10 size-40 rounded-full bg-white/40 blur-2xl" />
            <div className="absolute bottom-0 right-0 size-56 rounded-full bg-amber-200/50 blur-2xl" />
          </div>
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <p className="font-display text-4xl font-bold">{APP_NAME}</p>
              <p className="mt-3 max-w-xs text-lg text-white/90">
                Học vui mỗi ngày với bài trắc nghiệm đầy màu sắc!
              </p>
            </div>
            <p className="text-sm text-white/80">
              Dành cho gia sư & học sinh tiểu học
            </p>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="mb-8 lg:hidden">
            <p className="font-display text-3xl font-bold text-sky-600">
              {APP_NAME}
            </p>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Đăng nhập
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Nhập tên đăng nhập và mật khẩu để bắt đầu
          </p>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                className="h-12 rounded-2xl text-base"
                autoComplete="username"
                {...form.register("username")}
              />
              {form.formState.errors.username ? (
                <p className="text-sm text-rose-500">
                  {form.formState.errors.username.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                className="h-12 rounded-2xl text-base"
                autoComplete="current-password"
                {...form.register("password")}
              />
              {form.formState.errors.password ? (
                <p className="text-sm text-rose-500">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="kid-btn w-full bg-sky-500 hover:bg-sky-600"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Vào học thôi!"}
            </Button>
          </form>

          {USE_MOCK ? (
            <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-bold">Tài khoản demo (mock)</p>
              <p className="mt-1">Admin: admin / admin123</p>
              <p>Học sinh: minh / minh123</p>
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
