"use client";

import type { CSSProperties, ReactNode } from "react";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Necessary when the label is an icon. */
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  ariaLabel: string;
  disabled?: boolean;
  /** `true` = the control fills the width of its container. */
  stretch?: boolean;
  className?: string;
}

/**
 * A group of buttons in which one button is always selected. On the grey track, the selected
 * button is a white pill with a small shadow, and its text and icon have the accent colour.
 *
 * With `stretch`, all buttons have the same width. One pill then slides to the selected
 * button, so that the eye can follow the change.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  disabled,
  stretch,
  className,
}: SegmentedControlProps<T>) {
  const count = options.length;
  const index = options.findIndex((option) => option.value === value);
  // The pill has the width of one button: the width of the group, less the padding
  // (2 × 0.125rem) and the gaps (0.125rem each), divided by the number of buttons. A
  // translation of 100 % of its own width plus one gap moves it to the next button.
  const indicatorStyle: CSSProperties | null =
    stretch && index >= 0
      ? {
          width: `calc((100% - 0.25rem - ${count - 1} * 0.125rem) / ${count})`,
          transform: `translateX(calc(${index} * (100% + 0.125rem)))`,
        }
      : null;

  return (
    <ToggleGroup
      aria-label={ariaLabel}
      value={[value]}
      disabled={disabled}
      onValueChange={(next) => {
        // An empty list means that the user pressed the selected button. Keep the selection.
        const selected = next[0] as T | undefined;
        if (selected !== undefined) onChange(selected);
      }}
      className={cn(
        "relative inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5",
        stretch && "flex w-full",
        className,
      )}
    >
      {indicatorStyle && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0.5 left-0.5 rounded-md bg-card shadow-sm transition-transform duration-250 ease-in-out motion-reduce:transition-none"
          style={indicatorStyle}
        />
      )}
      {options.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          aria-label={option.ariaLabel}
          className={cn(
            // `relative`: the buttons are above the sliding pill.
            "relative inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none select-none",
            "not-aria-pressed:hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:text-primary-ink",
            // Without the sliding pill, each selected button has its own pill.
            !indicatorStyle && "aria-pressed:bg-card aria-pressed:shadow-sm",
            "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0",
            stretch && "min-w-0 flex-1",
          )}
        >
          {option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
