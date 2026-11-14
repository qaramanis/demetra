import { cn } from "@/lib/utils";

/** The Field Shift mark: one field block that moves to a new position. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("size-6 text-foreground", className)}
    >
      <rect x="2" y="7" width="15" height="15" rx="3" fill="currentColor" opacity="0.22" />
      <rect x="7" y="2" width="15" height="15" rx="3" fill="currentColor" />
      <path
        d="M11 6.75h7M11 9.5h7M11 12.25h7"
        stroke="var(--background)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
