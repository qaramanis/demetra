"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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
          className="pl-8"
        />
      </form>

      {open && (
        <div className="absolute top-full right-0 z-30 mt-1.5 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md">
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
