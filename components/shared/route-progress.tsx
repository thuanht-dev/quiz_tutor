"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsBusy, useUiLoading } from "@/stores/ui-loading";

const NAV_TIMEOUT_MS = 8_000;

/** Top progress bar + soft overlay while navigating or running actions. */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const endNavigation = useUiLoading((s) => s.endNavigation);
  const startNavigation = useUiLoading((s) => s.startNavigation);
  const busy = useIsBusy();
  const navigationPending = useUiLoading((s) => s.navigationPending);
  const key = `${pathname}?${searchParams?.toString() ?? ""}`;
  const prevKey = useRef(key);

  useEffect(() => {
    if (prevKey.current !== key) {
      prevKey.current = key;
      endNavigation();
    }
  }, [key, endNavigation]);

  // Failsafe: never leave the UI stuck if URL never changes
  useEffect(() => {
    if (!navigationPending) return;
    const timer = window.setTimeout(() => {
      endNavigation();
    }, NAV_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [navigationPending, endNavigation]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (anchor.dataset.noProgress != null) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        const next = `${url.pathname}${url.search}`;
        const current = `${window.location.pathname}${window.location.search}`;
        if (next === current) return;
        startNavigation();
      } catch {
        // ignore invalid URLs
      }
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [startNavigation]);

  return (
    <>
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 origin-left bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 transition-transform duration-300",
          busy ? "scale-x-100 animate-pulse" : "scale-x-0"
        )}
        aria-hidden
      />
      {navigationPending ? (
        <div
          className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-sky-50/40"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-white/95 px-5 py-3 text-sm font-bold text-sky-700 shadow-lg shadow-sky-100 ring-1 ring-sky-100">
            <Loader2 className="size-5 animate-spin" />
            Đang tải...
          </div>
        </div>
      ) : null}
    </>
  );
}
