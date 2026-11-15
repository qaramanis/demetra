"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, MapPin, Search } from "lucide-react";
import { useMap } from "react-map-gl/maplibre";

import { Input } from "@/components/ui/input";
import { useT } from "@/i18n";
import { MIN_QUERY_LENGTH, searchPlaces, type PlaceResult } from "@/lib/nominatim";
import { cn } from "@/lib/utils";

/**
 * Place search. The search starts when the user presses Enter, not while the user types:
 * the Nominatim usage policy does not permit autocomplete.
 */
export function LocationSearch({ className }: { className?: string }) {
  const t = useT();
  const { fieldMap } = useMap();
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hintId = useId();

  const search = useQuery({
    queryKey: ["places", submitted],
    queryFn: ({ signal }) => searchPlaces(submitted, signal),
    enabled: submitted.length >= MIN_QUERY_LENGTH,
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const query = text.trim();
    if (query.length < MIN_QUERY_LENGTH) return;
    setSubmitted(query);
    setOpen(true);
  };

  const goTo = (place: PlaceResult) => {
    if (place.bbox) {
      const [west, south, east, north] = place.bbox;
      fieldMap?.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        { padding: 48, maxZoom: 14, duration: 1200 },
      );
    } else {
      fieldMap?.flyTo({ center: place.center, zoom: 12, duration: 1200 });
    }
    setOpen(false);
  };

  const places = search.data ?? [];

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <form role="search" onSubmit={onSubmit}>
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          enterKeyHint="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onFocus={() => {
            if (submitted) setOpen(true);
          }}
          placeholder={t("search.placeholder")}
          aria-label={t("search.label")}
          aria-describedby={hintId}
          // The space for the key is there only while the key shows. On a narrow screen the
          // placeholder then has the full width.
          className="peer pl-8 pointer-fine:focus:not-placeholder-shown:pr-14"
        />
        {/* The search starts only on Enter. While the field has focus and text, the key shows
            at the right end. A touch keyboard has its own search key, so the key does not show
            for touch. */}
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-1.5 hidden -translate-y-1/2 rounded-sm border bg-muted px-1.5 font-sans text-[0.7rem] leading-4 font-medium text-muted-foreground pointer-fine:peer-[:focus:not(:placeholder-shown)]:block"
        >
          {t("search.enterKey")}
        </kbd>
        <span id={hintId} className="sr-only">
          {t("search.hint")}
        </span>
      </form>

      {open && (
        // The results have the width of the field and grow down from it.
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 origin-top animate-in overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md duration-150 ease-out fade-in zoom-in-95">
          {search.isFetching ? (
            <p className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              {t("search.loading")}
            </p>
          ) : search.isError ? (
            <p role="alert" className="px-3 py-3 text-sm text-destructive">
              {t("search.error")}
            </p>
          ) : places.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              {t("search.empty", { query: submitted })}
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto p-1">
              {places.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => goTo(place)}
                    className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left outline-none hover:bg-accent focus-visible:bg-accent"
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{place.name}</span>
                      {place.context && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {place.context}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t px-3 py-1.5 text-[0.7rem] text-muted-foreground">
            {t("search.attribution")}
          </p>
        </div>
      )}
    </div>
  );
}
