import { cn } from "@/lib/utils";

/**
 * The Demetra mark: a sharp ear of wheat. The gaps between the kernels show the stalk.
 * The drawing is 28 units wide and 60 units high. The favicon in `app/icon.svg` has a
 * simpler drawing for small sizes.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="16 0 32 64"
      fill="currentColor"
      aria-hidden="true"
      className={cn("h-7 w-3.5 text-foreground", className)}
    >
      <path d="M32 2 37 14.5 32 19.5 27 14.5ZM18 9.75 30.5 22.25V29L22.5 21ZM46 9.75 33.5 22.25V29L41.5 21ZM18 20.75 30.5 33.25V40L22.5 32ZM46 20.75 33.5 33.25V40L41.5 32ZM18 31.75 32 45.75 46 31.75 41.5 43 33.5 51V58.25L32 62 30.5 58.25V51L22.5 43Z" />
    </svg>
  );
}
