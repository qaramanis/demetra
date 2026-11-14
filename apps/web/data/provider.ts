import type { FieldDataProvider } from "@demetra/core";
import { MockFieldDataProvider } from "@demetra/provider-mock";

/**
 * The source of all field data in the dashboard.
 *
 * To use a different provider, change this file only. The components use the
 * `FieldDataProvider` interface and do not know which provider is active.
 */
export const provider: FieldDataProvider = new MockFieldDataProvider();
