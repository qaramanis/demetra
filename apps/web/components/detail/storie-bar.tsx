import { rampGradient, rampPosition } from "@/lib/color-scale";

/**
 * The colors of the soil layer as a thin bar, with a marker at the position of a Storie
 * index. `null` = no marker.
 */
export function StorieBar({ value }: { value: number | null }) {
  return (
    <span aria-hidden="true" className="relative block h-1.5 w-full">
      <span
        className="absolute inset-0 rounded-full ring-1 ring-foreground/10"
        style={{ background: rampGradient("soil") }}
      />
      {/* A dark dot with a light ring is visible on each color of the ramp. */}
      {value !== null && (
        <span
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-foreground shadow-sm"
          style={{ left: `${rampPosition("soil", value) * 100}%` }}
        />
      )}
    </span>
  );
}
