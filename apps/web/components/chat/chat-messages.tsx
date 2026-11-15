"use client";

import { blockCenter, blockSquare } from "@demetra/core";
import type { ChatStep } from "@demetra/core";
import { Check, LoaderCircle, MapPin, TriangleAlert } from "lucide-react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { useMap } from "react-map-gl/maplibre";

import { Button } from "@/components/ui/button";
import {
  CHAT_BLOCK_FLIGHT_DELAY_MS,
  CHAT_BLOCK_FLIGHT_MS,
  CHAT_BLOCK_MAX_ZOOM,
  CHAT_BLOCK_MIN_ZOOM,
  CHAT_EXAMPLE_BLOCK_ID,
} from "@/config/chat";
import { MAP_ID } from "@/config/regions";
import { useCropIndex, useReferenceData } from "@/data/queries";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import {
  useAnswerStore,
  useChatStore,
  type AssistantMessage,
  type PendingAnswer,
} from "@/store/chat-store";

import { ChatMarkdown } from "./chat-markdown";
import { stepText } from "./step-text";
import { useChatActions } from "./use-chat";

/** The width from which the detail panel is next to the map, and not above it. */
const WIDE_QUERY = "(width >= 64rem)";

/** The start view: a heading, the subjects and four suggestions that send their text. */
function StartView() {
  const t = useT();
  const { send } = useChatActions();
  const block = useAppStore((state) => state.selected?.id) ?? CHAT_EXAMPLE_BLOCK_ID;
  const suggestions = [
    t("chat.suggestion.nextCrop", { block }),
    t("chat.suggestion.rotation"),
    t("chat.suggestion.compare"),
    t("chat.suggestion.weather", { block }),
  ];

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">{t("chat.startTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("chat.startText")}</p>
      </div>
      <ul aria-label={t("chat.suggestions")} className="flex flex-col gap-1.5">
        {suggestions.map((text) => (
          <li key={text}>
            <button
              type="button"
              onClick={() => send(text)}
              className="w-full rounded-lg border bg-card px-3 py-2 text-left text-[0.8rem] leading-snug transition-colors outline-none hover:border-ring/50 hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The steps of an answer: a spinner while the assistant reads the data, then a check mark. */
function Steps({ steps, active, animate }: { steps: ChatStep[]; active: boolean; animate: boolean }) {
  const t = useT();
  const cropIndex = useCropIndex();
  const counties = useReferenceData().data?.counties;
  const countyNames = useMemo(
    () => new Map((counties ?? []).map((county) => [county.fips, county.name])),
    [counties],
  );
  if (steps.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1">
      {steps.map((step, index) => {
        const spinning = active && index === steps.length - 1;
        return (
          <li
            key={index}
            className={cn(
              "flex items-start gap-2 text-xs leading-5",
              spinning ? "text-foreground" : "text-muted-foreground",
              animate && "animate-in duration-200 ease-out fade-in slide-in-from-bottom-1",
            )}
          >
            {spinning ? (
              <LoaderCircle aria-hidden="true" className="mt-0.75 size-3.5 shrink-0 animate-spin text-primary" />
            ) : (
              <Check aria-hidden="true" className="mt-0.75 size-3.5 shrink-0 text-primary-ink" />
            )}
            {stepText(step, cropIndex, countyNames, t)}
          </li>
        );
      })}
    </ul>
  );
}

/** One chip for each block in the steps of an answer. A click selects the block on the map. */
function BlockChips({ steps, onShown }: { steps: ChatStep[]; onShown: () => void }) {
  const t = useT();
  const map = useMap()[MAP_ID];
  const select = useAppStore((state) => state.select);
  const ids = [...new Set(steps.flatMap((step) => (step.blockId ? [step.blockId] : [])))];
  if (ids.length === 0) return null;

  const show = (id: string) => {
    const geometry = blockSquare(id);
    const center = blockCenter(id);
    if (!geometry || !center) return;
    select({ id, geometry });
    // The detail panel opens first. A change of the map size stops a flight of the map.
    setTimeout(() => {
      if (!map) return;
      const zoom = Math.min(Math.max(map.getZoom(), CHAT_BLOCK_MIN_ZOOM), CHAT_BLOCK_MAX_ZOOM);
      map.flyTo({ center, zoom, duration: CHAT_BLOCK_FLIGHT_MS });
    }, CHAT_BLOCK_FLIGHT_DELAY_MS);
    // Below `lg` the detail panel is below the chat window: close the window.
    if (!window.matchMedia(WIDE_QUERY).matches) onShown();
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) =>
        blockSquare(id) ? (
          <Button key={id} variant="outline" size="xs" onClick={() => show(id)}>
            <MapPin className="text-primary-ink" />
            {t("chat.showBlock", { block: id })}
          </Button>
        ) : null,
      )}
    </div>
  );
}

/** An answer that failed, or a message of the user that has no answer. */
function Failure({ text, canRetry }: { text: string; canRetry: boolean }) {
  const t = useT();
  const { retry } = useChatActions();
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border p-3 text-sm">
      <p className="flex gap-2">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
        {text}
      </p>
      {canRetry && (
        <Button variant="outline" size="sm" onClick={retry}>
          {t("chat.retry")}
        </Button>
      )}
    </div>
  );
}

/** The weather comes from Open-Meteo: its licence asks for this line. */
function WeatherCredit() {
  const t = useT();
  return (
    <p className="text-[0.7rem] text-muted-foreground">
      {t("chat.weatherCredit")}{" "}
      <a
        href="https://open-meteo.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary-ink underline underline-offset-2"
      >
        Open-Meteo.com
      </a>
    </p>
  );
}

/** An answer of the assistant: complete, or the answer that comes now (`pending`). */
function Answer({
  message,
  pending,
  last,
  onShown,
}: {
  message: AssistantMessage | null;
  pending: PendingAnswer | null;
  last: boolean;
  onShown: () => void;
}) {
  const t = useT();
  const steps = message?.steps ?? pending?.steps ?? [];
  const text = message?.text ?? pending?.text ?? "";
  const weather = steps.some((step) => step.tool === "get_weather");

  return (
    <div className="flex flex-col gap-2" aria-busy={pending !== null}>
      <span className="sr-only">{t("chat.assistant")}</span>
      <Steps steps={steps} active={pending?.last === "step"} animate={pending !== null} />
      {pending?.last === null && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin text-primary" />
          {t("chat.waiting")}
        </p>
      )}
      {text && <ChatMarkdown text={text} />}
      {message?.truncated && <p className="text-xs text-muted-foreground">{t("chat.truncated")}</p>}
      {message?.end === "stopped" && (
        <p className="text-xs text-muted-foreground">{t("chat.stopped")}</p>
      )}
      {message?.end === "failed" && (
        <Failure text={t(`chat.error.${message.failure ?? "unavailable"}`)} canRetry={last} />
      )}
      {message && message.end !== "failed" && <BlockChips steps={steps} onShown={onShown} />}
      {message && weather && <WeatherCredit />}
    </div>
  );
}

/** The messages of the chat, or the start view. The list stays at its end while text comes. */
export function ChatMessages({ open, onShown }: { open: boolean; onShown: () => void }) {
  const t = useT();
  const messages = useChatStore((state) => state.messages);
  const pending = useAnswerStore((state) => state.pending);
  const scrollRef = useRef<HTMLDivElement>(null);
  // `true` while the list shows its end. The list then follows the new text.
  const atEndRef = useRef(true);
  const countRef = useRef(messages.length);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    // A new message of the user, or a window that opens: go to the end.
    const added = messages.length > countRef.current;
    countRef.current = messages.length;
    if (added && messages.at(-1)?.role === "user") atEndRef.current = true;
    if (atEndRef.current) element.scrollTop = element.scrollHeight;
  }, [messages, pending, open]);

  if (messages.length === 0 && !pending) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <StartView />
      </div>
    );
  }

  const lastMessage = messages.at(-1);
  // After a refresh during an answer, the last message of the user has no answer.
  const unanswered = !pending && lastMessage?.role === "user";

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => {
        const element = event.currentTarget;
        atEndRef.current =
          element.scrollHeight - element.scrollTop - element.clientHeight < 32;
      }}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      <div className="flex flex-col gap-4 px-4 py-4">
        {messages.map((message, index) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-muted px-3 py-2 text-sm whitespace-pre-wrap break-words">
                <span className="sr-only">{t("chat.you")}: </span>
                {message.text}
              </p>
            </div>
          ) : (
            <Answer
              key={message.id}
              message={message}
              pending={null}
              last={index === messages.length - 1}
              onShown={onShown}
            />
          ),
        )}
        {pending && (
          <Answer key={pending.id} message={null} pending={pending} last onShown={onShown} />
        )}
        {unanswered && <Failure text={t("chat.interrupted")} canRetry />}
      </div>
    </div>
  );
}

/** A screen reader hears an answer when it is complete, not each part of its text. */
export function ChatAnnouncer() {
  const t = useT();
  const announcedId = useAnswerStore((state) => state.announcedId);
  const message = useChatStore((state) =>
    state.messages.find((item) => item.id === announcedId && item.role === "assistant"),
  ) as AssistantMessage | undefined;

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {message?.end === "done" && <ChatMarkdown text={message.text} />}
      {message?.end === "failed" && t(`chat.error.${message.failure ?? "unavailable"}`)}
    </div>
  );
}
