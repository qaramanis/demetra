import "server-only";

import {
  CHAT_MAX_ASSISTANT_CHARS,
  CHAT_MAX_TURNS,
  CHAT_MAX_USER_CHARS,
} from "@demetra/core";
import type { ChatRequest } from "@demetra/core";
import { z } from "zod";

import { parseBlockId, parseCountyFips, parseCropCode, parseYear } from "../request";
import { MAX_BODY_BYTES } from "./limits";

/**
 * The check of the body of `POST /api/chat` against the contract in `chat.ts` of
 * `@demetra/core`. The body comes from the browser, so the route must not trust it.
 */

/**
 * A number that the parser of the same value in `_lib/request.ts` accepts. The context thus
 * has the same formats as the parameters of the other routes.
 */
const parsedNumber = (parse: (text: string | null) => number | null) =>
  z.number().refine((value) => parse(String(value)) === value);

/** A text that the parser of the same value in `_lib/request.ts` accepts. */
const parsedText = (parse: (text: string | null) => string | null) =>
  z.string().refine((value) => parse(value) === value);

const turnSchema = z
  .object({ role: z.enum(["user", "assistant"]), text: z.string() })
  .refine(
    (turn) =>
      turn.text.trim().length > 0 &&
      turn.text.length <= (turn.role === "user" ? CHAT_MAX_USER_CHARS : CHAT_MAX_ASSISTANT_CHARS),
  );

const requestSchema = z.object({
  turns: z
    .array(turnSchema)
    .min(1)
    .max(CHAT_MAX_TURNS)
    // The first turn and the last turn are turns of the user.
    .refine((turns) => turns[0]?.role === "user" && turns.at(-1)?.role === "user"),
  context: z.object({
    year: parsedNumber(parseYear).nullable(),
    blockId: parsedText(parseBlockId).nullable(),
    cropCode: parsedNumber(parseCropCode).nullable(),
    countyFips: parsedText(parseCountyFips).nullable(),
  }),
});

/**
 * The text of the body, or `null` when the body is larger than `MAX_BODY_BYTES`. The read
 * stops at the limit, so a very large body does not go into the memory.
 */
async function readBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_BODY_BYTES) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** The body of the request as a `ChatRequest`, or `null` when it is not correct. */
export async function parseChatRequest(request: Request): Promise<ChatRequest | null> {
  let text: string | null;
  try {
    text = await readBody(request);
  } catch {
    // The browser stopped the request while the server read the body.
    return null;
  }
  if (text === null) return null;

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }

  const result = requestSchema.safeParse(body);
  return result.success ? result.data : null;
}
