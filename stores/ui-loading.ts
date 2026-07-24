"use client";

import { create } from "zustand";

interface UiLoadingState {
  navigationPending: boolean;
  actionCount: number;
  startNavigation: () => void;
  endNavigation: () => void;
  beginAction: () => void;
  endAction: () => void;
}

export const useUiLoading = create<UiLoadingState>((set) => ({
  navigationPending: false,
  actionCount: 0,
  startNavigation: () => set({ navigationPending: true }),
  endNavigation: () => set({ navigationPending: false }),
  beginAction: () => set((s) => ({ actionCount: s.actionCount + 1 })),
  endAction: () =>
    set((s) => ({ actionCount: Math.max(0, s.actionCount - 1) })),
}));

/** Clear stuck navigation overlay (e.g. after error / aborted nav). */
export function resetNavigationLoading() {
  useUiLoading.getState().endNavigation();
}

export function useIsBusy() {
  return useUiLoading(
    (s) => s.navigationPending || s.actionCount > 0
  );
}
