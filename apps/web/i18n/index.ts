import en from "./en.json";

/**
 * All text of the interface is in `en.json`.
 *
 * To add a language: add a JSON file with the same keys, then make `useT` read the active
 * language from the store. The components do not change.
 */
export type MessageKey = keyof typeof en;

export type MessageValues = Record<string, string | number>;

const messages: Record<MessageKey, string> = en;

export function translate(key: MessageKey, values?: MessageValues): string {
  const template = messages[key];
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

export type Translate = typeof translate;

/** The translation function for components. */
export function useT(): Translate {
  return translate;
}
