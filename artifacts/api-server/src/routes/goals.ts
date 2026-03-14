import { Router } from "express";
import { db } from "@workspace/db";
import { profilesTable, userGoalsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.put("/update", async (req, res) => {
  try {
    const { account_id, goals } = req.body;
    if (!account_id || !goals || !Array.isArray(goals) || goals.length === 0) {
      return res.status(400).json({ message: "account_id and goals are required" });
    }

    const profiles = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.account_id, account_id))
      .limit(1);

    if (profiles.length === 0) return res.status(404).json({ message: "Profile not found" });
    const profile_id = profiles[0].id;

    await db.delete(userGoalsTable).where(eq(userGoalsTable.profile_id, profile_id));

    for (const goal of goals) {
      await db.insert(userGoalsTable).values({ profile_id, goal_id: goal.goal_id, rank: goal.rank });
    }

    return res.json({ success: true, message: "Goals updated" });
  } catch (err) {
    console.error("goals update error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/profile", async (req, res) => {
  try {
    const { account_id, height_cm, weight_kg } = req.body;
    if (!account_id) return res.status(400).json({ message: "account_id required" });

    const profiles = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.account_id, account_id))
      .limit(1);

    if (profiles.length === 0) return res.status(404).json({ message: "Profile not found" });
    const profile = profiles[0];

    const newHeight = height_cm ?? profile.height_cm;
    const newWeight = weight_kg ?? profile.weight_kg;
    const bmi = parseFloat((newWeight / ((newHeight / 100) ** 2)).toFixed(2));

    await db
      .update(profilesTable)
      .set({ height_cm: newHeight, weight_kg: newWeight, bmi })
      .where(eq(profilesTable.account_id, account_id));

    return res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    console.error("profile update error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
