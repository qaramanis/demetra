// From `drizzle-kit pull`. The relations are for `db.query` and for Drizzle Studio.
//
// drizzle-kit loads this file. Do not import "server-only" here.
import { relations } from "drizzle-orm/relations";

import { blockCrops, blocks, counties, crops } from "./schema.ts";

export const blockCropsRelations = relations(blockCrops, ({ one }) => ({
  block: one(blocks, {
    fields: [blockCrops.blockId],
    references: [blocks.blockId],
  }),
  county: one(counties, {
    fields: [blockCrops.countyFips],
    references: [counties.countyFips],
  }),
  crop: one(crops, {
    fields: [blockCrops.cdlCode],
    references: [crops.cdlCode],
  }),
}));

export const blocksRelations = relations(blocks, ({ many }) => ({
  blockCrops: many(blockCrops),
}));

export const countiesRelations = relations(counties, ({ many }) => ({
  blockCrops: many(blockCrops),
}));

export const cropsRelations = relations(crops, ({ many }) => ({
  blockCrops: many(blockCrops),
}));
