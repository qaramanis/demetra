import "server-only";

import type { ReferenceData } from "@demetra/core";
import { getReferenceData } from "@demetra/db";

import { stableSystemPrompt } from "./prompt";

/**
 * The reference lists of the chat: the years, the prediction years, the crop classes and the
 * counties, and the stable part of the system prompt that contains them.
 *
 * They change only when the data pipeline loads data, so the module keeps them in memory. It
 * reads them again after `REFERENCE_MAX_AGE_MS`, the same time that the CDN keeps the answers
 * of the other routes. The system prompt then stays the same between requests, and the
 * prompt cache of the model can work.
 */

export interface ChatReference {
  /** The years of the real data, the newest first. */
  years: number[];
  /** The years after the real data that have a prediction of the model team, the newest first. */
  predictionYears: number[];
  cropNames: ReadonlyMap<number, string>;
  countyNames: ReadonlyMap<string, string>;
  /** The part of the system prompt that is the same in each request. */
  systemPrompt: string;
}

const REFERENCE_MAX_AGE_MS = 60 * 60 * 1000;

let cached: { loadedAt: number; value: Promise<ChatReference> } | null = null;

function makeReference(data: ReferenceData): ChatReference {
  return {
    years: data.years,
    predictionYears: data.predictionYears,
    cropNames: new Map(data.crops.map((crop) => [crop.code, crop.name])),
    countyNames: new Map(data.counties.map((county) => [county.fips, county.name])),
    systemPrompt: stableSystemPrompt(data),
  };
}

/** The reference lists. A failed read is not kept: the next request reads again. */
export function getChatReference(now = Date.now()): Promise<ChatReference> {
  if (!cached || now - cached.loadedAt > REFERENCE_MAX_AGE_MS) {
    const value = getReferenceData().then(makeReference);
    const entry = { loadedAt: now, value };
    cached = entry;
    value.catch(() => {
      if (cached === entry) cached = null;
    });
  }
  return cached.value;
}

/** The name of a crop class, or `null` when the data has no crop with this code. */
export function cropName(reference: ChatReference, code: number): string | null {
  return reference.cropNames.get(code) ?? null;
}
