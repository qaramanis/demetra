import "server-only";

/**
 * The settings of the chat that control its cost: the model, the length of an answer, the
 * number of model calls, and the number of requests from one address.
 */

/**
 * The model of the chat: Claude Haiku 5.5, for a low cost. It is the only model of the route.
 * Claude Haiku 5.5 has no server-side fallback, so a refusal stays a refusal (event `error`
 * with the code `refused`).
 */
export const CHAT_MODEL = "claude-haiku-5-5";

/**
 * Low effort: the model thinks less and uses fewer, grouped tool calls. Chat answers do not
 * need more.
 */
export const CHAT_EFFORT = "low";

/**
 * The largest number of output tokens of one model call. The thinking of the model counts
 * toward this limit, so it must not be too small for a short answer after some thinking.
 */
export const CHAT_MAX_TOKENS = 4000;

/**
 * The largest number of model calls for one answer: at most 6 rounds of tool calls, and one
 * call after them for the answer. A round can have more than one tool call.
 */
export const CHAT_MAX_TOOL_ROUNDS = 6;
export const CHAT_MAX_MODEL_CALLS = CHAT_MAX_TOOL_ROUNDS + 1;

/** The time limit of one model call, in milliseconds. */
export const MODEL_CALL_TIMEOUT_MS = 30_000;

/**
 * The time limit of a complete answer, in milliseconds. It is shorter than `maxDuration` of
 * the route, so the route can still send the `error` event.
 */
export const ANSWER_TIMEOUT_MS = 55_000;

/** The time limit of the request to the weather service, in milliseconds. */
export const WEATHER_TIMEOUT_MS = 8_000;

/**
 * The largest body of a request, in bytes. The text of 20 long turns has approximately
 * 160,000 characters; JSON escapes and characters of more than one byte make it larger.
 */
export const MAX_BODY_BYTES = 512 * 1024;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/** The largest number of requests from one address in each time window. */
const RATE_WINDOWS = [
  { ms: MINUTE_MS, max: 8 },
  { ms: HOUR_MS, max: 60 },
] as const;

/** Above this number of addresses, the limiter removes the addresses with no recent request. */
const MAX_ADDRESSES = 10_000;

/** The times of the accepted requests of each address in the last hour, the oldest first. */
const requestTimes = new Map<string, number[]>();

/**
 * The address of the client: the first address of `x-forwarded-for`, which the host sets. A
 * request with no address shares the limit of the key "unknown".
 */
export function clientAddress(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/**
 * Counts a request of an address. The result is `null` when the request is accepted, or the
 * number of seconds until the address can send a request again.
 *
 * The counts are in the memory of the server process. On a serverless host, each instance has
 * its own counts and a new instance starts with none, so the limit is not exact: it stops a
 * fast loop of requests, not a careful abuse. A refused request does not count.
 */
export function rateLimit(address: string, now = Date.now()): number | null {
  const times = (requestTimes.get(address) ?? []).filter((time) => now - time < HOUR_MS);

  for (const window of RATE_WINDOWS) {
    const inWindow = times.filter((time) => now - time < window.ms);
    if (inWindow.length >= window.max) {
      requestTimes.set(address, times);
      // The oldest request of the window leaves it first.
      return Math.max(1, Math.ceil((inWindow[0]! + window.ms - now) / 1000));
    }
  }

  times.push(now);
  requestTimes.set(address, times);
  if (requestTimes.size > MAX_ADDRESSES) removeOldAddresses(now);
  return null;
}

function removeOldAddresses(now: number): void {
  for (const [address, times] of requestTimes) {
    if (times.every((time) => now - time >= HOUR_MS)) requestTimes.delete(address);
  }
  // Too many addresses with recent requests: remove the addresses that came first.
  for (const address of requestTimes.keys()) {
    if (requestTimes.size <= MAX_ADDRESSES) break;
    requestTimes.delete(address);
  }
}
