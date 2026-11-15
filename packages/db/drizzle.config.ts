import "./load-env.ts";
import { defineConfig } from "drizzle-kit";

// The data pipeline makes and loads the tables (`schema.sql`, `load_year.sh`, `load_climate.sh`
// and `load_predictions.sh`). Drizzle only reads them. Do not add `drizzle-kit generate`,
// `migrate` or `push`: they change the tables.
export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/schema.ts", "./src/relations.ts"],
  // `drizzle-kit pull` writes here the schema that the database has now. Compare it with
  // `src/schema.ts` and copy the changes. This folder is not committed.
  out: "./pulled",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ["public"],
  tablesFilter: [
    "blocks",
    "block_crops",
    "block_predictions",
    "crops",
    "counties",
    "climate_cells",
    "block_main_crop",
  ],
  // Keeps the PostGIS system tables (`spatial_ref_sys` and the geometry views) out.
  extensionsFilters: ["postgis"],
  introspect: { casing: "camel" },
  strict: true,
  verbose: true,
});
