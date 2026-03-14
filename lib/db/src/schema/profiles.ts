import { pgTable, serial, integer, text, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  account_id: integer("account_id").notNull().references(() => accountsTable.id),
  name: text("name").notNull(),
  date_of_birth: text("date_of_birth").notNull().default(""),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  height_cm: real("height_cm").notNull(),
  weight_kg: real("weight_kg").notNull(),
  bmi: real("bmi").notNull(),
  phone_number: text("phone_number").notNull(),
  onboarding_completed: boolean("onboarding_completed").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ id: true, created_at: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
