/**
 * Static crop parameters.
 *
 * Area units are stremmata: 1 stremma = 0.1 ha = 1,000 m².
 */

export const CROP_IDS = ["cotton", "maize", "barley", "chickpea", "hay"] as const;

export type CropId = (typeof CROP_IDS)[number];

export interface CropConfig {
  id: CropId;
  /** Ybase: baseline yield, kg per stremma. */
  yBase: number;
  /** Wreq: water requirement of one growing season, mm. */
  wReq: number;
  /** Tcrit: critical temperature, °C. */
  tCrit: number;
  /** Price, € per kg. */
  price: number;
  /** Cfixed: fixed cost, € per stremma. */
  cFixed: number;
  /** CfertBase: baseline fertiliser cost, € per stremma. */
  cFertBase: number;
  /** Nitrogen fixation as a fraction (0.25 = 25 %). 0 for a crop that does not fix nitrogen. */
  nFixation: number;
  /**
   * ky: sensitivity of the yield to drought. `null` = no value yet.
   * A value must be in `KY_RANGE`.
   */
  ky: number | null;
}

/** Valid range of `ky`. */
export const KY_RANGE = [0.85, 1.25] as const;

export const CROPS: Record<CropId, CropConfig> = {
  cotton: {
    id: "cotton",
    yBase: 380,
    wReq: 550,
    tCrit: 35,
    price: 0.55,
    cFixed: 95,
    cFertBase: 40,
    nFixation: 0,
    ky: null, // TODO: set ky for cotton (valid range 0.85–1.25).
  },
  maize: {
    id: "maize",
    yBase: 1250,
    wReq: 600,
    tCrit: 34,
    price: 0.21,
    cFixed: 110,
    cFertBase: 55,
    nFixation: 0,
    ky: 1.2,
  },
  barley: {
    id: "barley",
    yBase: 420,
    wReq: 280,
    tCrit: 30,
    price: 0.22,
    cFixed: 40,
    cFertBase: 20,
    nFixation: 0,
    ky: 0.85,
  },
  chickpea: {
    id: "chickpea",
    yBase: 180,
    wReq: 250,
    tCrit: 32,
    price: 0.95,
    cFixed: 50,
    cFertBase: 12,
    nFixation: 0.25,
    ky: null, // TODO: set ky for chickpea (valid range 0.85–1.25).
  },
  hay: {
    id: "hay",
    yBase: 350,
    wReq: 240,
    tCrit: 29,
    price: 0.24,
    cFixed: 38,
    cFertBase: 10,
    nFixation: 0.3,
    ky: null, // TODO: set ky for hay (valid range 0.85–1.25).
  },
};
