import type { ChatStep } from "@demetra/core";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { CHAT_STORAGE_KEY } from "@/config/chat";
import type { ChatAnswerEvent, ChatFailure } from "@/data/chat";

export interface UserMessage {
  id: string;
  role: "user";
  text: string;
}

/**
 * An answer of the assistant.
 * - `done`: the answer is complete. `truncated` = it reached the length limit.
 * - `stopped`: the user stopped it. `text` has the part that came.
 * - `failed`: the answer did not come, or it stopped with an error.
 */
export interface AssistantMessage {
  id: string;
  role: "assistant";
  steps: ChatStep[];
  text: string;
  end: "done" | "stopped" | "failed";
  truncated?: boolean;
  failure?: ChatFailure;
}

export type ChatMessage = UserMessage | AssistantMessage;

interface ChatState {
  /** `true` = the chat window is open. */
  open: boolean;
  /** The messages, the oldest first. */
  messages: ChatMessage[];
  setOpen: (open: boolean) => void;
  setMessages: (messages: ChatMessage[]) => void;
}

/**
 * The chat. It stays in the session storage: it stays after a refresh of the page, and goes
 * away when the tab closes. The storage keeps the open state and the complete messages only:
 * not an answer that stopped or failed, and not the draft. The store does not read the storage
 * by itself (`skipHydration`): the chat component reads it after its first render, so the page
 * of the server and the first render in the browser are the same.
 */
export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      open: false,
      messages: [],
      setOpen: (open) => set({ open }),
      setMessages: (messages) => set({ messages }),
    }),
    {
      name: CHAT_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
      partialize: (state) => ({
        open: state.open,
        messages: state.messages.filter(
          (message) => message.role === "user" || message.end === "done",
        ),
      }),
      merge: (stored, current) => {
        const value = (stored ?? {}) as Partial<ChatState>;
        return {
          ...current,
          open: value.open === true,
          messages: Array.isArray(value.messages) ? value.messages : [],
        };
      },
    },
  ),
);

/** The answer that comes now. */
export interface PendingAnswer {
  id: string;
  steps: ChatStep[];
  text: string;
  /** The type of the last event. `null` = no event came yet. */
  last: "step" | "text" | null;
}

interface AnswerState {
  pending: PendingAnswer | null;
  /** The newest answer that completed in this page. A screen reader hears it. */
  announcedId: string | null;
  start: (id: string) => void;
  apply: (id: string, events: ChatAnswerEvent[]) => void;
  finish: (announcedId: string | null) => void;
  reset: () => void;
}

/**
 * A separate store, because the text of an answer comes many times each second, and the
 * session storage keeps only complete answers.
 */
export const useAnswerStore = create<AnswerState>()((set) => ({
  pending: null,
  announcedId: null,
  start: (id) => set({ pending: { id, steps: [], text: "", last: null } }),
  apply: (id, events) =>
    set((state) => {
      if (state.pending?.id !== id || events.length === 0) return state;
      const steps = [...state.pending.steps];
      let { text, last } = state.pending;
      for (const event of events) {
        if (event.type === "step") {
          steps.push(event);
          last = "step";
        } else {
          text += event.text;
          last = "text";
        }
      }
      return { pending: { id, steps, text, last } };
    }),
  finish: (announcedId) => set({ pending: null, announcedId }),
  reset: () => set({ pending: null, announcedId: null }),
}));
