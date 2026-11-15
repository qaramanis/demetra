/**
 * The example block of the chat suggestions when no block is selected: a real block in Colusa
 * County with a crop history of all the years and a prediction of the model.
 */
export const CHAT_EXAMPLE_BLOCK_ID = "144_1075";

/** The key of the chat in the session storage of the tab. */
export const CHAT_STORAGE_KEY = "demetra-chat";

/**
 * The zoom of the map after "Show on map". A block of 990 m then has approximately 70 px. A
 * map that is nearer stays at its zoom, up to the maximum.
 */
export const CHAT_BLOCK_MIN_ZOOM = 13;
export const CHAT_BLOCK_MAX_ZOOM = 15;

/** The time of the flight of the map to a block. */
export const CHAT_BLOCK_FLIGHT_MS = 1200;

/**
 * The map moves to a block after this time. The detail panel then has its place, and
 * `KeepSelectionVisible` has done its check (350 ms): a later change of the map size or a pan
 * does not stop the flight.
 */
export const CHAT_BLOCK_FLIGHT_DELAY_MS = 400;

/** The character counter of the text field shows when fewer characters than this are left. */
export const CHAT_COUNTER_FROM_REMAINING = 100;
