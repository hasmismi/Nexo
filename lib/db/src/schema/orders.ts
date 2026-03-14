import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  account_id: integer("account_id").notNull().references(() => accountsTable.id),
  total_price: real("total_price").notNull(),
  status: text("status").default("pending").notNull(),
  tracking_link: text("tracking_link"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, created_at: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
