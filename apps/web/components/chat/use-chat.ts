"use client";

import { CHAT_MAX_ASSISTANT_CHARS, CHAT_MAX_TURNS, CHAT_MAX_USER_CHARS } from "@demetra/core";
import type { ChatContext, ChatTurn } from "@demetra/core";
import { useCallback, useMemo } from "react";

import { streamChat } from "@/data/chat";
import { useMapYear } from "@/data/queries";
import { useAppStore } from "@/store/app-store";
import { useAnswerStore, useChatStore, type ChatMessage } from "@/store/chat-store";

/** The answer that runs now. Only one answer runs at a time. */
let running: { id: string; controller: AbortController } | null = null;

/**
 * The newest turns of the chat for the request: the messages of the user and the complete
 * answers. The first turn is a turn of the user.
 */
function chatTurns(messages: ChatMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const message of messages) {
    if (message.role === "user") turns.push({ role: "user", text: message.text });
    else if (message.end === "done" && message.text.trim()) {
      turns.push({ role: "assistant", text: message.text.slice(0, CHAT_MAX_ASSISTANT_CHARS) });
    }
  }
  const newest = turns.slice(-CHAT_MAX_TURNS);
  const first = newest.findIndex((turn) => turn.role === "user");
  return first === -1 ? [] : newest.slice(first);
}

async function runAnswer(messages: ChatMessage[], context: ChatContext) {
  const turns = chatTurns(messages);
  if (turns.length === 0) return;
  const id = crypto.randomUUID();
  const controller = new AbortController();
  running = { id, controller };
  useAnswerStore.getState().start(id);

  const end = await streamChat({ turns, context }, controller.signal, (events) =>
    useAnswerStore.getState().apply(id, events),
  );
  // "New chat" removed this answer.
  if (running?.id !== id) return;
  running = null;

  const pending = useAnswerStore.getState().pending;
  const chat = useChatStore.getState();
  chat.setMessages([
    ...chat.messages,
    {
      id,
      role: "assistant",
      steps: pending?.steps ?? [],
      text: pending?.text ?? "",
      end: end.type === "done" ? "done" : end.type === "stopped" ? "stopped" : "failed",
      ...(end.type === "done" && end.truncated ? { truncated: true } : {}),
      ...(end.type === "failed" ? { failure: end.failure } : {}),
    },
  ]);
  useAnswerStore.getState().finish(end.type === "stopped" ? null : id);
}

/**
 * The actions of the chat. A request starts in an event handler: `send` and `retry`. The
 * context of a request is the state of the dashboard at that time.
 */
export function useChatActions() {
  const year = useMapYear()?.year ?? null;

  const context = useCallback((): ChatContext => {
    const { selected, cropCode, countyFips } = useAppStore.getState();
    return { year, blockId: selected?.id ?? null, cropCode, countyFips };
  }, [year]);

  return useMemo(
    () => ({
      /** Sends a message. The result is `false` when the message is empty or an answer runs. */
      send: (text: string) => {
        const clean = text.trim().slice(0, CHAT_MAX_USER_CHARS);
        if (!clean || running) return false;
        const messages: ChatMessage[] = [
          ...useChatStore.getState().messages,
          { id: crypto.randomUUID(), role: "user", text: clean },
        ];
        useChatStore.getState().setMessages(messages);
        void runAnswer(messages, context());
        return true;
      },
      /** Removes the answer after the last message of the user, and asks again. */
      retry: () => {
        if (running) return;
        const messages = useChatStore.getState().messages;
        const last = messages.findLastIndex((message) => message.role === "user");
        if (last === -1) return;
        const kept = messages.slice(0, last + 1);
        useChatStore.getState().setMessages(kept);
        void runAnswer(kept, context());
      },
      /** Stops the answer. The text that came stays. */
      stop: () => running?.controller.abort(),
      /** Stops the answer and deletes the chat. */
      newChat: () => {
        const current = running;
        running = null;
        current?.controller.abort();
        useAnswerStore.getState().reset();
        useChatStore.getState().setMessages([]);
      },
    }),
    [context],
  );
}
