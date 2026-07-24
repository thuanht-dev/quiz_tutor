"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { USE_MOCK } from "@/lib/constants";

/** Keep Supabase auth cookies fresh without Edge middleware. */
export function AuthSessionRefresh() {
  useEffect(() => {
    if (USE_MOCK) return;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;

    const supabase = createClient();
    void supabase.auth.getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // Cookie sync handled by @supabase/ssr browser client
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
