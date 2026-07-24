import { create } from "zustand";

type AnswersMap = Record<string, string | null>;

interface QuizSessionState {
  attemptId: string | null;
  quizId: string | null;
  currentIndex: number;
  answers: AnswersMap;
  remainingSeconds: number | null;
  soundEnabled: boolean;
  setSession: (payload: {
    attemptId: string;
    quizId: string;
    remainingSeconds: number | null;
  }) => void;
  setCurrentIndex: (index: number) => void;
  setAnswer: (questionId: string, optionId: string) => void;
  tick: () => void;
  toggleSound: () => void;
  reset: () => void;
}

export const useQuizSession = create<QuizSessionState>((set) => ({
  attemptId: null,
  quizId: null,
  currentIndex: 0,
  answers: {},
  remainingSeconds: null,
  soundEnabled: true,
  setSession: ({ attemptId, quizId, remainingSeconds }) =>
    set({
      attemptId,
      quizId,
      remainingSeconds,
      currentIndex: 0,
      answers: {},
    }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  setAnswer: (questionId, optionId) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: optionId },
    })),
  tick: () =>
    set((state) => {
      if (state.remainingSeconds === null) return state;
      return {
        remainingSeconds: Math.max(0, state.remainingSeconds - 1),
      };
    }),
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  reset: () =>
    set({
      attemptId: null,
      quizId: null,
      currentIndex: 0,
      answers: {},
      remainingSeconds: null,
    }),
}));
