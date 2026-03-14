import { Router } from "express";
import { db } from "@workspace/db";
import { profilesTable, userGoalsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { account_id, name, age, gender, height_cm, weight_kg, phone_number, goals } = req.body;

    if (!account_id || !name || !age || !gender || !height_cm || !weight_kg || !phone_number || !goals) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const bmi = parseFloat((weight_kg / ((height_cm / 100) ** 2)).toFixed(2));

    const existing = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.account_id, account_id))
      .limit(1);

    let profile_id: number;
    if (existing.length > 0) {
      await db
        .update(profilesTable)
        .set({ name, age, gender, height_cm, weight_kg, bmi, phone_number, onboarding_completed: true })
        .where(eq(profilesTable.account_id, account_id));
      profile_id = existing[0].id;
      await db.delete(userGoalsTable).where(eq(userGoalsTable.profile_id, profile_id));
    } else {
      const inserted = await db
        .insert(profilesTable)
        .values({ account_id, name, age, gender, height_cm, weight_kg, bmi, phone_number, onboarding_completed: true })
        .returning();
      profile_id = inserted[0].id;
    }

    for (const goal of goals) {
      await db.insert(userGoalsTable).values({ profile_id, goal_id: goal.goal_id, rank: goal.rank });
    }

    return res.json({ success: true, profile_id, message: "Onboarding completed" });
  } catch (err) {
    console.error("onboarding error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
