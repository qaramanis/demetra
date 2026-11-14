import type { MetricValues } from "@demetra/core";
import { create } from "zustand";

/** The block under the pointer. */
export interface HoveredBlock {
  id: string;
  /** Position of the pointer in the map, in pixels. */
  x: number;
  y: number;
  /** The metric values of the block. A field polygon of the user has no values on the map. */
  values: MetricValues | null;
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
