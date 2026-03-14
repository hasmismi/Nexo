import { pgTable, serial, text, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { goalsTable } from "./goals";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price_per_gram: real("price_per_gram").notNull(),
  goal_id: integer("goal_id").references(() => goalsTable.id),
  is_trial: boolean("is_trial").default(false).notNull(),
  key_benefits: text("key_benefits").notNull().default("[]"),
  icon_color: text("icon_color").notNull().default("#00C27B"),
  icon_emoji: text("icon_emoji").notNull().default("📦"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, created_at: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
