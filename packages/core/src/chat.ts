/**
 * The chat with the assistant: the contract between the browser and `POST /api/chat`.
 *
 * The browser keeps the chat, in the session storage. The server keeps nothing: each request
 * has the turns of the chat and the state of the dashboard. The answer is a stream of events.
 *
 * The server sends no interface text. It sends codes and ids, and the browser makes the text
 * from `apps/web/i18n/en.json`.
 */

/** The largest number of turns in one request. The browser sends the newest turns. */
export const CHAT_MAX_TURNS = 20;

/** The largest number of characters in one message of the user. */
export const CHAT_MAX_USER_CHARS = 1000;

/** The largest number of characters in one answer that the browser sends back to the server. */
export const CHAT_MAX_ASSISTANT_CHARS = 8000;

export type ChatRole = "user" | "assistant";

/** One message of the chat, as text. An answer has no data of its tools. */
export interface ChatTurn {
  role: ChatRole;
  text: string;
}

/**
 * The state of the dashboard when the user sends a message. With it, "this block" and "this
 * year" in a message have a meaning.
 */
export interface ChatContext {
  /** The year that the map shows. It can be a prediction year. `null` = not known yet. */
  year: number | null;
  /** The id of the block in the detail panel. `null` = no block is selected. */
  blockId: string | null;
  /** Code of the crop class in the crop filter. `null` = all crops. */
  cropCode: number | null;
  /** FIPS code of the county in the county filter. `null` = all counties. */
  countyFips: string | null;
}

/**
 * The body of `POST /api/chat`.
 *
 * - `turns` has 1 to `CHAT_MAX_TURNS` turns, the oldest first. The first turn and the last
 *   turn are turns of the user. Two turns of the same role can follow each other (for example
 *   after an answer that failed).
 * - The text of a turn is not empty and is not longer than the limit of its role.
 */
export interface ChatRequest {
  turns: ChatTurn[];
  context: ChatContext;
}

/** The tools that the assistant uses to read data. */
export const CHAT_TOOLS = [
  /** The crops, the county revenue, the soil and the climate of one block in one year. */
  "get_block",
  /** The crops of one block in each year, and the prediction of the model team. */
  "get_block_history",
  /** The crops that follow a crop in the next year, in the same blocks. */
  "get_rotation_stats",
  /** The area and the county revenue of one crop in one year. */
  "get_crop_stats",
  /** The weather forecast at a block or at a point. An external source. */
  "get_weather",
] as const;

export type ChatTool = (typeof CHAT_TOOLS)[number];

/**
 * One step of an answer: the assistant reads data with a tool. The browser shows a line for
 * each step. A step has only the values that its tool got.
 */
export interface ChatStep {
  tool: ChatTool;
  blockId?: string;
  cropCode?: number;
  countyFips?: string;
  year?: number;
}

/**
 * The reason that the server gives no answer.
 * - `invalid`: the request is not correct (status 400).
 * - `rate_limited`: too many requests from this address (status 429).
 * - `busy`: the model service has too many requests now.
 * - `refused`: the model declined the request.
 * - `unavailable`: all other failures, also a server that has no API key (status 503 when the
 *   stream did not start).
 */
export type ChatErrorCode = "invalid" | "rate_limited" | "busy" | "refused" | "unavailable";

/**
 * The answer to a request that the server does not start: a JSON body with a status that is
 * not 200. A started answer has the status 200 and is a stream of `ChatStreamEvent`.
 */
export interface ChatErrorResponse {
  error: ChatErrorCode;
}

/**
 * One event of the answer stream.
 * - `step`: the assistant starts to read data with a tool.
 * - `text`: the next part of the answer text (markdown).
 * - `done`: the answer is complete. `truncated` = the answer reached the length limit.
 * - `error`: the answer stopped. The text that came before stays incomplete.
 *
 * A stream ends with one `done` or one `error`.
 */
export type ChatStreamEvent =
  | ({ type: "step" } & ChatStep)
  | { type: "text"; text: string }
  | { type: "done"; truncated?: boolean }
  | { type: "error"; code: ChatErrorCode };

/** The media type of the answer stream. */
export const CHAT_STREAM_CONTENT_TYPE = "text/event-stream; charset=utf-8";

/**
 * One event as text for the stream: one `data:` line with JSON, then an empty line (the
 * format of server-sent events). JSON has no line breaks, so an event is always one line.
 */
export function encodeChatEvent(event: ChatStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * The complete events in the text that came from the stream, and the text after them. A
 * network read can end in the middle of an event: add the next read to `rest` and call the
 * function again. A line that is not a correct event is ignored.
 */
export function parseChatEvents(buffer: string): { events: ChatStreamEvent[]; rest: string } {
  const events: ChatStreamEvent[] = [];
  let rest = buffer;

  for (;;) {
    const end = rest.indexOf("\n\n");
    if (end === -1) break;
    const frame = rest.slice(0, end);
    rest = rest.slice(end + 2);

    for (const line of frame.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event: unknown = JSON.parse(line.slice("data: ".length));
        if (typeof event === "object" && event !== null && "type" in event) {
          events.push(event as ChatStreamEvent);
        }
      } catch {
        // Not JSON: ignore the line.
      }
    }
  }

  return { events, rest };
}
