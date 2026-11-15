"use client";

import { MessageCircle, SquarePen, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useAnswerStore, useChatStore } from "@/store/chat-store";

import { ChatComposer } from "./chat-composer";
import { ChatAnnouncer, ChatMessages } from "./chat-messages";
import { useChatActions } from "./use-chat";

/**
 * The chat with the assistant, in the bottom right corner of the map. The button expands into
 * a small window, a dialog that is not modal.
 *
 * - The window grows from the button in 250 ms: a clip changes from the shape of the button to
 *   the window, with a fade. It closes into the button in 200 ms. With reduced motion, it only
 *   fades. `globals.css` has the sizes and the times (`[data-chat]`). The MapLibre controls
 *   move up and down with the window there.
 * - On a wide screen the chat moves left with the detail panel, with the time and the curve of
 *   the panel. Below `lg` the panel is above the map: the chat stays in the corner, above the
 *   panel (`z-35`) and below the filters drawer of a small screen (`z-40`).
 * - On open, the focus goes to the text field. On a touch screen it goes to the window: the
 *   keyboard does not open over the start view. On close, the focus goes back to the button.
 */
export function ChatWidget() {
  const t = useT();
  const open = useChatStore((state) => state.open);
  const setOpen = useChatStore((state) => state.setOpen);
  const empty = useChatStore((state) => state.messages.length === 0);
  const answering = useAnswerStore((state) => state.pending !== null);
  const panelOpen = useAppStore((state) => state.selected !== null);
  const { newChat } = useChatActions();
  const windowId = useId();
  const titleId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // The chat of the session storage loads after the first render: the first render in the
  // browser is then the same as the page of the server.
  useEffect(() => {
    void useChatStore.persist.rehydrate();
  }, []);

  const focusInside = () => {
    if (window.matchMedia("(pointer: coarse)").matches) windowRef.current?.focus();
    else textareaRef.current?.focus();
  };

  const openChat = () => {
    flushSync(() => setOpen(true));
    focusInside();
  };

  const closeChat = () => {
    flushSync(() => setOpen(false));
    buttonRef.current?.focus();
  };

  return (
    <div
      data-shifted={panelOpen || undefined}
      className={cn(
        "absolute right-(--chat-inset) bottom-(--chat-inset) z-35 size-(--chat-button-size)",
        // The same motion as the detail panel: 300 ms in, 200 ms out.
        "ease-drawer motion-safe:transition-[translate] motion-reduce:transition-none",
        panelOpen ? "duration-300 lg:-translate-x-[26rem]" : "duration-200",
      )}
    >
      <Button
        ref={buttonRef}
        variant="outline"
        aria-expanded={open}
        aria-controls={windowId}
        aria-label={t(answering ? "chat.openAnswering" : "chat.open")}
        title={t("chat.open")}
        // The window covers the button while it is open.
        inert={open}
        onClick={openChat}
        className={cn(
          "absolute inset-0 size-full rounded-full bg-card text-primary-ink shadow-md hover:bg-muted hover:text-primary-ink [&_svg:not([class*='size-'])]:size-5",
          open && "opacity-0",
        )}
      >
        <MessageCircle />
        {answering && (
          <span
            aria-hidden="true"
            className="absolute top-0.5 right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-card"
          />
        )}
      </Button>

      <div
        ref={windowRef}
        id={windowId}
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        inert={!open}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
          event.stopPropagation();
          closeChat();
        }}
        className={cn(
          "absolute right-0 bottom-0 h-(--chat-window-height) w-(--chat-window-width) flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg outline-none",
          "transition-[clip-path,opacity,display] transition-discrete ease-out motion-reduce:transition-[opacity,display]",
          "[clip-path:var(--chat-clip-open)]",
          open
            ? "flex duration-(--chat-open-duration) starting:opacity-0 motion-safe:starting:[clip-path:var(--chat-clip-button)]"
            : "hidden opacity-0 duration-(--chat-close-duration) motion-safe:[clip-path:var(--chat-clip-button)]",
        )}
      >
        <header className="flex shrink-0 items-center gap-2 border-b py-2 pr-2 pl-4">
          <MessageCircle aria-hidden="true" className="size-4 shrink-0 text-primary-ink" />
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-sm font-semibold">
            {t("chat.title")}
          </h2>
          <Button
            variant="ghost"
            size="xs"
            disabled={empty && !answering}
            onClick={() => {
              newChat();
              focusInside();
            }}
          >
            <SquarePen />
            {t("chat.newChat")}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("chat.close")}
            title={t("chat.close")}
            onClick={closeChat}
          >
            <X />
          </Button>
        </header>
        <ChatMessages open={open} onShown={closeChat} />
        <ChatComposer textareaRef={textareaRef} />
      </div>

      <ChatAnnouncer />
    </div>
  );
}
