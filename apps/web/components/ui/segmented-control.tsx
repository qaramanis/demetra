"use client";

import type { ReactNode } from "react";
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

/** A group of buttons in which one button is always selected. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  disabled,
  stretch,
  className,
}: SegmentedControlProps<T>) {
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
        "inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5",
        stretch && "flex w-full",
        className,
      )}
    >
      {options.map((option) => (
        <Toggle
          key={option.value}
          value={option.value}
          aria-label={option.ariaLabel}
          className={cn(
            "inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none select-none",
            "hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
            "aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm",
            "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0",
            stretch && "flex-1",
          )}
        >
          {option.label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
