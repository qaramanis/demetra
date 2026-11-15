"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"
import { cn } from "cn"

function ScrollArea({
  className,
  children,
  ...props
}: ScrollAreaPrimitive.Root.Props) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      {/* The content fades out at an edge that has more content behind it, so the user sees
          that the area scrolls. Base UI gives the distance to each edge. The fade becomes
          shorter near the edge and is gone at the edge. */}
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] mask-linear-[to_bottom,transparent_0,black_min(1.5rem,var(--scroll-area-overflow-y-start,0px)),black_calc(100%_-_min(1.5rem,var(--scroll-area-overflow-y-end,0px))),transparent_100%] mask-no-repeat transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
        // The scroll bar shows while the pointer is on the area or while the area scrolls,
        // as an overlay scroll bar on macOS. While the area scrolls, it shows at once.
        "pointer-events-none opacity-0 transition-opacity duration-200 data-hovering:pointer-events-auto data-hovering:opacity-100 data-scrolling:pointer-events-auto data-scrolling:opacity-100 data-scrolling:duration-0",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-foreground/15 transition-colors hover:bg-foreground/25"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
