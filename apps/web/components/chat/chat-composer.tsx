"use client";

import { CHAT_MAX_USER_CHARS } from "@demetra/core";
import { ArrowUp, Square } from "lucide-react";
import { useId, useState, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import { CHAT_COUNTER_FROM_REMAINING } from "@/config/chat";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { useAnswerStore } from "@/store/chat-store";

import { useChatActions } from "./use-chat";

/** The height of the text field follows its text, up to 5 lines (CSS `max-h`). */
function fitHeight(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

/**
 * The text field and the Send button. Enter sends, Shift+Enter makes a new line. During an
 * answer, the Send button is a Stop button. It is the same element, so it keeps the focus.
 * Below the field: the limits of the data.
 */
export function ChatComposer({ textareaRef }: { textareaRef: RefObject<HTMLTextAreaElement | null> }) {
  const t = useT();
  const hintId = useId();
  const [draft, setDraft] = useState("");
  const answering = useAnswerStore((state) => state.pending !== null);
  const { send, stop } = useChatActions();
  const remaining = CHAT_MAX_USER_CHARS - draft.length;

  const submit = () => {
    if (answering || !send(draft)) return;
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  return (
    <form
      className="flex flex-col gap-2 border-t p-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex items-end gap-2 rounded-xl border border-input bg-background py-1.5 pr-1.5 pl-3 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        <textarea
          ref={textareaRef}
          rows={1}
          value={draft}
          maxLength={CHAT_MAX_USER_CHARS}
          onChange={(event) => {
            setDraft(event.target.value);
            fitHeight(event.target);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            submit();
          }}
          placeholder={t("chat.inputPlaceholder")}
          aria-label={t("chat.inputLabel")}
          aria-describedby={hintId}
          // Below `md` the text is 16 px: with a smaller text, Safari on iOS zooms the page.
          className="max-h-[6.75rem] min-w-0 flex-1 resize-none bg-transparent py-1 text-base leading-5 outline-none placeholder:text-muted-foreground md:text-sm"
        />
        <Button
          type={answering ? "button" : "submit"}
          variant={answering ? "outline" : "default"}
          size="icon-sm"
          onClick={answering ? stop : undefined}
          disabled={!answering && !draft.trim()}
          focusableWhenDisabled
          aria-label={t(answering ? "chat.stop" : "chat.send")}
          title={t(answering ? "chat.stop" : "chat.send")}
          className="rounded-lg data-disabled:opacity-50"
        >
          {answering ? <Square className="size-3 fill-current" /> : <ArrowUp />}
        </Button>
      </div>
      <span id={hintId} className="sr-only">
        {t("chat.inputHint")}
      </span>
      <div className="flex items-start gap-3 text-[0.7rem] leading-snug text-muted-foreground">
        <p className="min-w-0 flex-1">{t("chat.limits")}</p>
        <span
          className={cn(
            "shrink-0 tabular-nums",
            remaining > CHAT_COUNTER_FROM_REMAINING && "hidden",
          )}
        >
          {t("chat.charCount", { count: draft.length, max: CHAT_MAX_USER_CHARS })}
        </span>
      </div>
    </form>
  );
}
