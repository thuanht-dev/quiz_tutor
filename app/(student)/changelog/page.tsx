import { Metadata } from "next";
import { Sparkles, CheckCircle2, Calendar } from "lucide-react";
import { CHANGELOG } from "@/lib/constants/changelog";

export const metadata: Metadata = {
  title: "Tính năng mới",
};

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-500">
            <Sparkles className="size-6 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-800">
            Tính năng mới
          </h1>
        </div>
        <p className="text-slate-600">
          Theo dõi các cập nhật và cải tiến mới nhất của hệ thống.
        </p>
      </div>

      <div className="space-y-6">
        {CHANGELOG.map((item, idx) => (
          <div
            key={item.version}
            className="kid-card space-y-4 p-6"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-sm font-bold text-teal-700">
                <Sparkles className="size-3.5" />
                v{item.version}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                <Calendar className="size-3.5" />
                {item.date}
              </span>
              {idx === 0 ? (
                <span className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2.5 py-0.5 text-xs font-bold text-white">
                  MỚI NHẤT
                </span>
              ) : null}
            </div>

            <ul className="space-y-2.5">
              {item.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-700">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {CHANGELOG.length === 0 ? (
        <div className="kid-card p-8 text-center">
          <Sparkles className="mx-auto size-12 text-slate-300" />
          <p className="mt-3 text-slate-500">
            Chưa có thông tin về các tính năng mới.
          </p>
        </div>
      ) : null}
    </div>
  );
}
