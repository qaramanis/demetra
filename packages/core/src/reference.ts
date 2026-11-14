/** A crop class of the Cropland Data Layer (CDL). */
export interface Crop {
  /** CDL class code, for example 75. */
  code: number;
  /** CDL class name, for example "Almonds". */
  name: string;
  /** The official CDL color, for example "#00a582". Some crop classes have the same color. */
  color: string;
}

export interface County {
  /** FIPS code: 2 digits for the state and 3 digits for the county, for example "06019". */
  fips: string;
  name: string;
}

/** The values that the filters offer. */
export interface ReferenceData {
  /** The years that have data, the newest first. */
  years: number[];
  /** The crop classes that occur in the data, in the order of their names. */
  crops: Crop[];
  /** The counties, in the order of their names. */
  counties: County[];
}

/** CDL class "Fallow/Idle Cropland". Fallow land has no revenue. */
export const FALLOW_CROP_CODE = 61;

/**
 * Grain classes: barley, durum wheat, spring wheat, winter wheat, oats and triticale. Their
 * revenue is not reliable: the county data is for grain only, but most of the area is cut
 * for hay or silage.
 */
export const UNRELIABLE_REVENUE_CROP_CODES: readonly number[] = [21, 22, 23, 24, 28, 205];
