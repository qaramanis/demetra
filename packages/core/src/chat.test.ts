import { describe, expect, it } from "vitest";

import { encodeChatEvent, parseChatEvents } from "./chat.ts";
import type { ChatStreamEvent } from "./chat.ts";

const EVENTS: ChatStreamEvent[] = [
  { type: "step", tool: "get_block", blockId: "143_1149", year: 2022 },
  { type: "text", text: "Line one.\n\nLine two with a \"quote\"." },
  { type: "done" },
];

describe("chat stream", () => {
  it("writes each event as one data line and an empty line", () => {
    const text = encodeChatEvent(EVENTS[1]!);
    expect(text.startsWith("data: ")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(true);
    // The line breaks of the answer text are inside the JSON, not in the stream.
    expect(text.slice(0, -2)).not.toContain("\n");
  });

  it("reads the events that it wrote", () => {
    const { events, rest } = parseChatEvents(EVENTS.map(encodeChatEvent).join(""));
    expect(events).toEqual(EVENTS);
    expect(rest).toBe("");
  });

  it("keeps an incomplete event for the next read", () => {
    const text = EVENTS.map(encodeChatEvent).join("");
    const cut = text.length - 9;

    const first = parseChatEvents(text.slice(0, cut));
    expect(first.events).toEqual(EVENTS.slice(0, 2));

    const second = parseChatEvents(first.rest + text.slice(cut));
    expect(second.events).toEqual(EVENTS.slice(2));
    expect(second.rest).toBe("");
  });

  it("ignores a line that is not an event", () => {
    const { events } = parseChatEvents(`: comment\n\ndata: not json\n\n${encodeChatEvent(EVENTS[2]!)}`);
    expect(events).toEqual([EVENTS[2]]);
  });
});
