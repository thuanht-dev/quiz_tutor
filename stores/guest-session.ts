"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const GUEST_STORAGE_KEY = "tq_guest_session";

interface GuestSessionState {
  guestId: string | null;
  displayName: string | null;
  hydrated: boolean;
  setGuest: (displayName: string) => void;
  clearGuest: () => void;
  setHydrated: (value: boolean) => void;
}

function ensureGuestId(existing: string | null) {
  return existing || crypto.randomUUID();
}

export const useGuestSession = create<GuestSessionState>()(
  persist(
    (set, get) => ({
      guestId: null,
      displayName: null,
      hydrated: false,
      setGuest: (displayName) => {
        const name = displayName.trim();
        if (!name) return;
        set({
          displayName: name.slice(0, 64),
          guestId: ensureGuestId(get().guestId),
        });
      },
      clearGuest: () => set({ displayName: null }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: GUEST_STORAGE_KEY,
      partialize: (s) => ({
        guestId: s.guestId,
        displayName: s.displayName,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
