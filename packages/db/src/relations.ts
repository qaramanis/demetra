// From `drizzle-kit pull`. The relations are for `db.query` and for Drizzle Studio.
//
// drizzle-kit loads this file. Do not import "server-only" here.
import { relations } from "drizzle-orm/relations";

import { blockCrops, blockPredictions, blocks, counties, crops } from "./schema.ts";

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

// A prediction has three relations to `crops`: the predicted crop and the two next crops.
export const blockPredictionsRelations = relations(blockPredictions, ({ one }) => ({
  block: one(blocks, {
    fields: [blockPredictions.blockId],
    references: [blocks.blockId],
  }),
  crop: one(crops, {
    fields: [blockPredictions.cdlCode],
    references: [crops.cdlCode],
    relationName: "predictedCrop",
  }),
  crop2: one(crops, {
    fields: [blockPredictions.cdlCode2],
    references: [crops.cdlCode],
    relationName: "predictedCrop2",
  }),
  crop3: one(crops, {
    fields: [blockPredictions.cdlCode3],
    references: [crops.cdlCode],
    relationName: "predictedCrop3",
  }),
}));

export const blocksRelations = relations(blocks, ({ many }) => ({
  blockCrops: many(blockCrops),
  blockPredictions: many(blockPredictions),
}));

export const countiesRelations = relations(counties, ({ many }) => ({
  blockCrops: many(blockCrops),
}));

export const cropsRelations = relations(crops, ({ many }) => ({
  blockCrops: many(blockCrops),
  blockPredictions: many(blockPredictions, { relationName: "predictedCrop" }),
  blockPredictions2: many(blockPredictions, { relationName: "predictedCrop2" }),
  blockPredictions3: many(blockPredictions, { relationName: "predictedCrop3" }),
}));
