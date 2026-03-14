import { pgTable, serial, integer, real, text, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  account_id: integer("account_id").notNull().references(() => accountsTable.id),
  total_price: real("total_price").notNull(),
  status: text("status").default("pending").notNull(),
  tracking_link: text("tracking_link"),
  delivery_name: text("delivery_name"),
  delivery_phone: text("delivery_phone"),
  delivery_address: text("delivery_address"),
  delivery_city: text("delivery_city"),
  delivery_pincode: text("delivery_pincode"),
  payment_method: text("payment_method"),
  delivery_lat: doublePrecision("delivery_lat"),
  delivery_lng: doublePrecision("delivery_lng"),
  delivery_fee: real("delivery_fee").default(0).notNull(),
  razorpay_payment_id: text("razorpay_payment_id"),
  order_status: text("order_status").default("pending").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, created_at: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
