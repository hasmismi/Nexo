import { Router } from "express";
import { db } from "@workspace/db";
import { profilesTable, userGoalsTable, goalsTable, productsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

function calcMonthlyGrams(weight_kg: number): number {
  if (weight_kg > 60) return 1500;
  if (weight_kg > 50) return 1300;
  if (weight_kg > 40) return 1000;
  return 800;
}

router.get("/", async (req, res) => {
  try {
    const account_id = parseInt(req.query.account_id as string);
    if (!account_id) return res.status(400).json({ message: "account_id required" });

    const profiles = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.account_id, account_id))
      .limit(1);

    if (profiles.length === 0) return res.status(404).json({ message: "Profile not found" });

    const profile = profiles[0];

    const userGoals = await db
      .select({ goal_id: userGoalsTable.goal_id, rank: userGoalsTable.rank, goal_name: goalsTable.name })
      .from(userGoalsTable)
      .leftJoin(goalsTable, eq(userGoalsTable.goal_id, goalsTable.id))
      .where(eq(userGoalsTable.profile_id, profile.id))
      .orderBy(userGoalsTable.rank);

    const totalGrams = calcMonthlyGrams(profile.weight_kg);
    const gramsPerProduct = userGoals.length > 0 ? Math.floor(totalGrams / userGoals.length) : totalGrams;
    const gramsPerDay = totalGrams / 30;

    const recommendations = [];
    for (const ug of userGoals) {
      const products = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.goal_id, ug.goal_id))
        .limit(1);
      if (products.length > 0) {
        const p = products[0];
        recommendations.push({
          product_id: p.id,
          product_name: p.name,
          grams: gramsPerProduct,
          grams_per_day: parseFloat((gramsPerProduct / 30).toFixed(1)),
          goal_name: ug.goal_name ?? "",
        });
      }
    }

    return res.json({
      profile: {
        id: profile.id,
        account_id: profile.account_id,
        name: profile.name,
        age: profile.age,
        gender: profile.gender,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        bmi: profile.bmi,
        phone_number: profile.phone_number,
      },
      recommendations,
      total_grams_per_month: totalGrams,
      grams_per_day: gramsPerDay,
    });
  } catch (err) {
    console.error("dashboard error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
