import { CHAT_STREAM_CONTENT_TYPE } from "@demetra/core";
import type { ChatErrorCode, ChatErrorResponse } from "@demetra/core";
import type { NextRequest } from "next/server";

import { answerStream } from "../_lib/chat/answer";
import { clientAddress, rateLimit } from "../_lib/chat/limits";
import type { ChatReference } from "../_lib/chat/reference";
import { getChatReference } from "../_lib/chat/reference";
import { parseChatRequest } from "../_lib/chat/schema";

/**
 * The longest time of one answer, in seconds. The answer itself stops before this time (see
 * `ANSWER_TIMEOUT_MS`).
 */
export const maxDuration = 60;

/** The answer to a request that the server does not start: a code, no interface text. */
function chatError(error: ChatErrorCode, status: number, headers?: HeadersInit): Response {
  const body: ChatErrorResponse = { error };
  return Response.json(body, { status, headers });
}

/**
 * `POST /api/chat`
 *
 * One answer of the assistant. The body is a `ChatRequest` of `@demetra/core`: the text turns
 * of the chat and the state of the dashboard. The server keeps no chat history.
 *
 * - Status 200: a stream of `ChatStreamEvent` (server-sent events) that ends with one `done`
 *   or one `error` event.
 * - Status 400 `invalid`: the body is not correct.
 * - Status 429 `rate_limited`: too many requests from this address.
 * - Status 503 `unavailable`: the server has no API key, or the reference data is not
 *   available.
 */
export async function POST(request: NextRequest) {
  const retryAfter = rateLimit(clientAddress(request.headers));
  if (retryAfter !== null) {
    return chatError("rate_limited", 429, { "Retry-After": String(retryAfter) });
  }

  const chat = await parseChatRequest(request);
  if (!chat) return chatError("invalid", 400);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "[api/chat] ANTHROPIC_API_KEY is not set, so the chat is not available. Set it in apps/web/.env.local.",
    );
    return chatError("unavailable", 503);
  }

  let reference: ChatReference;
  try {
    reference = await getChatReference();
  } catch (error) {
    console.error("[api/chat] The reference data request failed.", error);
    return chatError("unavailable", 503);
  }

  return new Response(answerStream(chat, reference, request.signal), {
    headers: {
      "Content-Type": CHAT_STREAM_CONTENT_TYPE,
      // Each answer is different: no cache in the browser or in the CDN.
      "Cache-Control": "no-store",
      // A proxy must send each event immediately.
      "X-Accel-Buffering": "no",
    },
  });
}
