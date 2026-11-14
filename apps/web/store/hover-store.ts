import type { BlockProperties } from "@demetra/core";
import { create } from "zustand";

/** The block under the pointer. */
export interface HoveredBlock {
  /** Position of the pointer in the map, in pixels. */
  x: number;
  y: number;
  /** The values of the block. `properties.id` is the id of the block. */
  properties: BlockProperties;
}

interface HoverState {
  hovered: HoveredBlock | null;
  setHovered: (hovered: HoveredBlock | null) => void;
}

/** A separate store, because the pointer changes this state many times each second. */
export const useHoverStore = create<HoverState>()((set) => ({
  hovered: null,
  setHovered: (hovered) => set({ hovered }),
}));
