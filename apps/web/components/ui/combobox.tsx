"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { cn } from "cn"
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react"

import {
  dropdownChevronClassName,
  dropdownMotionClassName,
  dropdownTriggerClassName,
} from "./select"

/**
 * A select with a search field in its list, as Select2: the field shows the value, and the
 * list opens below it with the search field at the top and the focus in it. Typing narrows
 * the list; the arrow keys, Enter and Escape work as in a select. Base UI clears the search
 * when the list closes.
 *
 * Use it for a long list. For a short list, use the select (`./select.tsx`), which has the
 * same field and the same motion.
 *
 * As in Select2, the first match is highlighted while the user types, so Enter selects it.
 */
function Combobox<Value, Multiple extends boolean | undefined = false, Item = Value>(
  props: ComboboxPrimitive.Root.Props<Value, Multiple, Item>
) {
  return <ComboboxPrimitive.Root autoHighlight {...props} />
}

function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn(dropdownTriggerClassName, "h-8", className)}
      {...props}
    >
      {children}
      <ChevronDownIcon className={dropdownChevronClassName} />
    </ComboboxPrimitive.Trigger>
  )
}

/** The value in the field. The content is in one line, and is cut when it is too long. */
function ComboboxValue({
  className,
  ...props
}: ComboboxPrimitive.Value.Props & { className?: string }) {
  return (
    <span
      data-slot="combobox-value"
      className={cn("flex min-w-0 flex-1 items-center gap-1.5 truncate text-left", className)}
    >
      <ComboboxPrimitive.Value {...props} />
    </span>
  )
}

function ComboboxContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "start",
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<ComboboxPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "flex max-h-[min(22rem,var(--available-height))] w-(--anchor-width) min-w-36 flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none",
            dropdownMotionClassName,
            className
          )}
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

/**
 * The search field at the top of the list. Below the `md` width, the text is 16 px: with a
 * smaller text, Safari on iOS zooms the page into the field.
 */
function ComboboxSearch({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b px-2.5">
      <SearchIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <ComboboxPrimitive.Input
        data-slot="combobox-search"
        className={cn(
          "h-9 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm",
          className
        )}
        {...props}
      />
    </div>
  )
}

/** The text when no item agrees with the search. It shows only then. */
function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "px-3 py-6 text-center text-sm text-muted-foreground empty:p-0",
        className
      )}
      {...props}
    />
  )
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        "min-h-0 flex-1 scroll-py-1 overflow-y-auto overscroll-contain p-1 empty:p-0",
        className
      )}
      {...props}
    />
  )
}

/** One item. The selected item has a check in the accent colour. */
function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:font-medium [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center text-primary-ink" />
        }
      >
        <CheckIcon className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

export {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxSearch,
  ComboboxTrigger,
  ComboboxValue,
}
