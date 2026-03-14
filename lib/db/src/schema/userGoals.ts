import { pgTable, integer, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";
import { goalsTable } from "./goals";

export const userGoalsTable = pgTable("user_goals", {
  profile_id: integer("profile_id").notNull().references(() => profilesTable.id),
  goal_id: integer("goal_id").notNull().references(() => goalsTable.id),
  rank: integer("rank").notNull(),
}, (t) => [primaryKey({ columns: [t.profile_id, t.goal_id] })]);

export const insertUserGoalSchema = createInsertSchema(userGoalsTable);
export type InsertUserGoal = z.infer<typeof insertUserGoalSchema>;
export type UserGoal = typeof userGoalsTable.$inferSelect;
