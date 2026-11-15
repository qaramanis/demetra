import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageStream } from "@anthropic-ai/sdk/lib/BetaMessageStream";
import { encodeChatEvent } from "@demetra/core";
import type { ChatErrorCode, ChatRequest, ChatStreamEvent } from "@demetra/core";

import {
  ANSWER_TIMEOUT_MS,
  CHAT_EFFORT,
  CHAT_MAX_MODEL_CALLS,
  CHAT_MAX_TOKENS,
  CHAT_MODEL,
  MODEL_CALL_TIMEOUT_MS,
} from "./limits";
import { dashboardState } from "./prompt";
import type { ChatReference } from "./reference";
import { chatTools } from "./tools";

/**
 * One answer of the chat: the model calls with the tools, as a stream of `ChatStreamEvent`
 * in the format of server-sent events.
 *
 * The tool runner of the SDK sends the requests to the model and runs the tools. The route
 * sends a `step` event when a tool starts, a `text` event for each part of the answer text,
 * then one `done` or one `error` event. The server sends codes and ids, never interface text.
 */

interface TokenCounts {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

function addUsage(total: TokenCounts, usage: Anthropic.Beta.Messages.BetaUsage): void {
  total.input += usage.input_tokens;
  total.output += usage.output_tokens;
  total.cacheRead += usage.cache_read_input_tokens ?? 0;
  total.cacheWrite += usage.cache_creation_input_tokens ?? 0;
}

/** The error code for the browser. The most specific error classes come first. */
function errorCode(error: unknown): ChatErrorCode {
  if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.OverloadedError) {
    return "busy";
  }
  // An error event in the middle of a stream has no HTTP status. Its type tells the cause.
  if (
    error instanceof Anthropic.APIError &&
    (error.type === "rate_limit_error" || error.type === "overloaded_error")
  ) {
    return "busy";
  }
  return "unavailable";
}

/**
 * Makes the answer and sends its events. It does not throw: a failure gives an `error`
 * event, and its cause goes to the server log.
 *
 * `stop` is aborted when the browser stops the request. The model call then stops too, so it
 * uses no more tokens.
 */
async function runAnswer(
  chat: ChatRequest,
  reference: ChatReference,
  send: (event: ChatStreamEvent) => void,
  stop: AbortSignal,
): Promise<void> {
  const startedAt = Date.now();
  const deadline = AbortSignal.timeout(ANSWER_TIMEOUT_MS);
  const signal = AbortSignal.any([stop, deadline]);

  const tokens: TokenCounts = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let calls = 0;
  let toolCalls = 0;
  let end = "none";
  // The stream of the model call that runs now, and whether its usage is counted.
  let current: BetaMessageStream | null = null;
  let counted = false;

  try {
    const client = new Anthropic({ timeout: MODEL_CALL_TIMEOUT_MS });
    const runner = client.beta.messages.toolRunner(
      {
        model: CHAT_MODEL,
        max_tokens: CHAT_MAX_TOKENS,
        thinking: { type: "adaptive" },
        output_config: { effort: CHAT_EFFORT },
        // The stable part of the system prompt has its own cache breakpoint, so the cache
        // keeps the tools and that part between requests. The top-level breakpoint caches the
        // conversation for the next model call of the same answer.
        cache_control: { type: "ephemeral" },
        system: [
          { type: "text", text: reference.systemPrompt, cache_control: { type: "ephemeral" } },
          { type: "text", text: dashboardState(chat.context, reference, new Date()) },
        ],
        // Only the text of the earlier turns: no thinking blocks and no tool blocks.
        messages: chat.turns.map((turn) => ({ role: turn.role, content: turn.text })),
        tools: chatTools({
          reference,
          onStep: (step) => {
            toolCalls += 1;
            send({ type: "step", ...step });
          },
        }),
        max_iterations: CHAT_MAX_MODEL_CALLS,
        // Send the full conversation in each call. It is short, and the API then keeps no
        // copy of the chat between the calls (no message thread).
        thread: false,
        stream: true,
      },
      { signal },
    );

    let stopReason: Anthropic.Beta.Messages.BetaStopReason | null = null;
    let textSent = false;

    for await (const messageStream of runner) {
      calls += 1;
      current = messageStream;
      counted = false;
      // The text of a later call starts a new paragraph.
      let newParagraph = textSent;

      for await (const event of messageStream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          if (event.delta.text === "") continue;
          send({ type: "text", text: newParagraph ? `\n\n${event.delta.text}` : event.delta.text });
          newParagraph = false;
          textSent = true;
        }
      }

      const message = await messageStream.finalMessage();
      addUsage(tokens, message.usage);
      counted = true;
      stopReason = message.stop_reason;

      // A refusal can stop a tool call in the middle, and so can the token limit: the runner
      // must not run the tools of this call.
      if (stopReason === "refusal" || stopReason === "max_tokens") break;
      // The last permitted call asks for tools: no call can come after them.
      if (stopReason === "tool_use" && calls >= CHAT_MAX_MODEL_CALLS) break;
    }

    end = stopReason ?? "none";
    if (stopReason === "refusal") {
      send({ type: "error", code: "refused" });
    } else if (
      stopReason === "max_tokens" ||
      stopReason === "model_context_window_exceeded" ||
      stopReason === "tool_use"
    ) {
      if (stopReason === "tool_use") end = "tool_limit";
      send({ type: "done", truncated: true });
    } else {
      send({ type: "done" });
    }
  } catch (error) {
    // The usage of a call that stopped early: the part that its stream received.
    const partial = current && !counted ? current.currentMessage : undefined;
    if (partial) addUsage(tokens, partial.usage);

    if (stop.aborted) {
      // The browser stopped the request. The stream is closed: no event.
      end = "aborted";
    } else if (deadline.aborted) {
      end = "timeout";
      console.error(`[api/chat] The answer took more than ${ANSWER_TIMEOUT_MS} ms.`);
      send({ type: "error", code: "unavailable" });
    } else {
      end = "error";
      console.error("[api/chat] The model request failed.", error);
      send({ type: "error", code: errorCode(error) });
    }
  } finally {
    // One line for each answer, with no text of the messages.
    console.info(
      `[api/chat] model=${CHAT_MODEL} calls=${calls} tools=${toolCalls} ` +
        `input=${tokens.input} output=${tokens.output} ` +
        `cacheRead=${tokens.cacheRead} cacheWrite=${tokens.cacheWrite} ` +
        `end=${end} ms=${Date.now() - startedAt}`,
    );
  }
}

/** The answer to a correct request, as the body of the response. */
export function answerStream(
  chat: ChatRequest,
  reference: ChatReference,
  requestSignal: AbortSignal,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const stop = new AbortController();
  const onAbort = () => stop.abort();
  let open = true;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: ChatStreamEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(encodeChatEvent(event)));
        } catch {
          open = false;
        }
      };

      if (requestSignal.aborted) stop.abort();
      else requestSignal.addEventListener("abort", onAbort, { once: true });

      // The answer runs after `start` returns, so the events go to the browser as they come.
      void runAnswer(chat, reference, send, stop.signal).finally(() => {
        requestSignal.removeEventListener("abort", onAbort);
        if (!open) return;
        open = false;
        try {
          controller.close();
        } catch {
          // The stream is already closed.
        }
      });
    },
    // The browser closed the connection.
    cancel() {
      open = false;
      stop.abort();
    },
  });
}
