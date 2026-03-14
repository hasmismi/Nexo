import { pgTable, serial, text, real, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const offersTable = pgTable("offers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  code: text("code"),
  discount_type: text("discount_type").notNull().default("percent"),
  discount_value: real("discount_value").notNull(),
  min_order_amount: real("min_order_amount").default(0).notNull(),
  max_uses: integer("max_uses"),
  uses_count: integer("uses_count").default(0).notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  starts_at: timestamp("starts_at"),
  ends_at: timestamp("ends_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertOfferSchema = createInsertSchema(offersTable).omit({ id: true, created_at: true, uses_count: true });
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offersTable.$inferSelect;
