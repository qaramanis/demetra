import "server-only";

import { DATA_BOUNDS } from "@/config/regions";

import { WEATHER_TIMEOUT_MS } from "./limits";

/**
 * The weather forecast of Open-Meteo (https://open-meteo.com/en/docs) for one point.
 *
 * Terms (https://open-meteo.com/en/terms, read on 2026-11-15):
 * - The free API is for non-commercial use only. Its limits are less than 10,000 calls in a
 *   day, 5,000 in an hour and 600 in a minute, for each address. A shared host can reach them
 *   sooner.
 * - The data has the licence CC BY 4.0. Each place that shows the data must have a link to
 *   https://open-meteo.com/ ("Weather data by Open-Meteo.com").
 * - The service logs the addresses and the coordinates of the requests for 90 days.
 *
 * The request has only the coordinates, rounded to 0.01 degrees (approximately 1 km). The
 * forecast models have cells of some km, so the rounding does not change the forecast.
 */

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

const FORECAST_DAYS = 7;

/** "In or near California": the area of the data, with a margin of 0.5 degrees. */
const MARGIN_DEGREES = 0.5;

const CURRENT_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "precipitation",
  "weather_code",
  "wind_speed_10m",
  "wind_gusts_10m",
] as const;

const DAILY_VARIABLES = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "et0_fao_evapotranspiration",
  "wind_speed_10m_max",
] as const;

/** The WMO weather codes of Open-Meteo, in short words. */
const WEATHER_CODES: ReadonlyMap<number, string> = new Map([
  [0, "clear sky"],
  [1, "mainly clear"],
  [2, "partly cloudy"],
  [3, "overcast"],
  [45, "fog"],
  [48, "rime fog"],
  [51, "light drizzle"],
  [53, "drizzle"],
  [55, "dense drizzle"],
  [56, "light freezing drizzle"],
  [57, "freezing drizzle"],
  [61, "light rain"],
  [63, "rain"],
  [65, "heavy rain"],
  [66, "light freezing rain"],
  [67, "freezing rain"],
  [71, "light snow"],
  [73, "snow"],
  [75, "heavy snow"],
  [77, "snow grains"],
  [80, "light rain showers"],
  [81, "rain showers"],
  [82, "violent rain showers"],
  [85, "light snow showers"],
  [86, "snow showers"],
  [95, "thunderstorm"],
  [96, "thunderstorm with light hail"],
  [99, "thunderstorm with hail"],
]);

/** The answer of Open-Meteo, only the fields that the module reads. */
interface OpenMeteoForecast {
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone?: string;
  current?: Partial<Record<(typeof CURRENT_VARIABLES)[number] | "time", number | string>>;
  daily?: Partial<Record<(typeof DAILY_VARIABLES)[number] | "time", (number | string | null)[]>>;
}

/** `true` when the point is in or near California. */
export function isNearCalifornia(lon: number, lat: number): boolean {
  const [west, south, east, north] = DATA_BOUNDS;
  return (
    lon >= west - MARGIN_DEGREES &&
    lon <= east + MARGIN_DEGREES &&
    lat >= south - MARGIN_DEGREES &&
    lat <= north + MARGIN_DEGREES
  );
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

function weatherText(code: unknown): string | null {
  return typeof code === "number" ? (WEATHER_CODES.get(code) ?? `WMO code ${code}`) : null;
}

/** The value of a daily variable on day `day`, or `null`. */
function dailyValue(
  daily: NonNullable<OpenMeteoForecast["daily"]>,
  name: (typeof DAILY_VARIABLES)[number],
  day: number,
): number | null {
  const value = daily[name]?.[day];
  return typeof value === "number" ? value : null;
}

/**
 * The forecast for a point, as a small object for the model: the conditions now and one row
 * for each of the next 7 days. Metric units: °C, mm, km/h. A failure of the service throws.
 */
export async function getForecast(
  lon: number,
  lat: number,
  signal?: AbortSignal | null,
): Promise<object> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("latitude", String(round2(lat)));
  url.searchParams.set("longitude", String(round2(lon)));
  url.searchParams.set("current", CURRENT_VARIABLES.join(","));
  url.searchParams.set("daily", DAILY_VARIABLES.join(","));
  url.searchParams.set("forecast_days", String(FORECAST_DAYS));
  // The days and the times of the answer are in the time zone of the point.
  url.searchParams.set("timezone", "auto");

  const timeout = AbortSignal.timeout(WEATHER_TIMEOUT_MS);
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`The weather service answered with status ${response.status}.`);
  }
  const forecast = (await response.json()) as OpenMeteoForecast;

  const current = forecast.current ?? {};
  const daily = forecast.daily ?? {};
  const days = (daily.time ?? []).map((date, day) => ({
    date,
    weather: weatherText(daily.weather_code?.[day]),
    tMaxC: dailyValue(daily, "temperature_2m_max", day),
    tMinC: dailyValue(daily, "temperature_2m_min", day),
    rainMm: dailyValue(daily, "precipitation_sum", day),
    rainProbabilityPct: dailyValue(daily, "precipitation_probability_max", day),
    et0Mm: dailyValue(daily, "et0_fao_evapotranspiration", day),
    windMaxKmh: dailyValue(daily, "wind_speed_10m_max", day),
  }));

  return {
    source: "Open-Meteo forecast (open-meteo.com, CC BY 4.0). A forecast, not a measurement.",
    point: { lat: forecast.latitude, lon: forecast.longitude, elevationM: forecast.elevation },
    timezone: forecast.timezone,
    now: {
      time: current.time,
      weather: weatherText(current.weather_code),
      temperatureC: current.temperature_2m,
      humidityPct: current.relative_humidity_2m,
      rainMm: current.precipitation,
      windKmh: current.wind_speed_10m,
      gustsKmh: current.wind_gusts_10m,
    },
    days,
    notes: "et0Mm = reference evapotranspiration (FAO-56) of the day.",
  };
}
