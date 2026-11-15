import { parseChatEvents } from "@demetra/core";
import type { ChatErrorCode, ChatRequest, ChatStep, ChatStreamEvent } from "@demetra/core";

/**
 * The request to `POST /api/chat` and the reader of the answer stream. The server sends codes
 * and ids only: the interface makes the text.
 */

/** The reason that an answer fails: a code of the server, or `network` for the connection. */
export type ChatFailure = ChatErrorCode | "network";

/** One event of an answer that is not its end. */
export type ChatAnswerEvent = Extract<ChatStreamEvent, { type: "step" | "text" }>;

/** The end of an answer. */
export type ChatEnd =
  | { type: "done"; truncated: boolean }
  | { type: "failed"; failure: ChatFailure }
  | { type: "stopped" };

const ERROR_CODES: Record<ChatErrorCode, true> = {
  invalid: true,
  rate_limited: true,
  busy: true,
  refused: true,
  unavailable: true,
};

function isErrorCode(value: unknown): value is ChatErrorCode {
  return typeof value === "string" && Object.hasOwn(ERROR_CODES, value);
}

/** The step with only the values of the correct type. */
function cleanStep(event: Record<string, unknown>): ChatAnswerEvent | null {
  if (typeof event.tool !== "string") return null;
  const step: ChatStep = { tool: event.tool as ChatStep["tool"] };
  if (typeof event.blockId === "string") step.blockId = event.blockId;
  if (typeof event.cropCode === "number") step.cropCode = event.cropCode;
  if (typeof event.countyFips === "string") step.countyFips = event.countyFips;
  if (typeof event.year === "number") step.year = event.year;
  return { type: "step", ...step };
}

/** The reason of an answer that did not start. */
async function failureOf(response: Response): Promise<ChatFailure> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "error" in body && isErrorCode(body.error)) {
      return body.error;
    }
  } catch {
    // The body is not JSON.
  }
  if (response.status === 429) return "rate_limited";
  if (response.status === 400) return "invalid";
  return "unavailable";
}

/**
 * Sends the chat and reads the answer. `onEvents` gets the steps and the text parts of each
 * network read. The result is the end of the answer: `done`, `failed`, or `stopped` when the
 * signal aborts the request.
 */
export async function streamChat(
  request: ChatRequest,
  signal: AbortSignal,
  onEvents: (events: ChatAnswerEvent[]) => void,
): Promise<ChatEnd> {
  const failed = (failure: ChatFailure): ChatEnd =>
    signal.aborted ? { type: "stopped" } : { type: "failed", failure };

  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(request),
      signal,
    });
  } catch {
    return failed("network");
  }

  if (response.status !== 200 || !response.body) return failed(await failureOf(response));

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let rest = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const parsed = parseChatEvents(rest + decoder.decode(value, { stream: true }));
      rest = parsed.rest;

      const events: ChatAnswerEvent[] = [];
      for (const event of parsed.events) {
        if (event.type === "done" || event.type === "error") {
          onEvents(events);
          void reader.cancel().catch(() => undefined);
          return event.type === "done"
            ? { type: "done", truncated: event.truncated === true }
            : failed(isErrorCode(event.code) ? event.code : "unavailable");
        }
        if (event.type === "step") {
          const step = cleanStep(event as unknown as Record<string, unknown>);
          if (step) events.push(step);
        } else if (event.type === "text" && typeof event.text === "string") {
          events.push(event);
        }
      }
      if (events.length > 0) onEvents(events);
    }
  } catch {
    return failed("network");
  }
  // The stream ended without `done` or `error`: the connection broke.
  return failed("network");
}
