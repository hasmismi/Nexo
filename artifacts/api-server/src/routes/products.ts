import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, goalsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        description: productsTable.description,
        price_per_gram: productsTable.price_per_gram,
        goal_id: productsTable.goal_id,
        goal_name: goalsTable.name,
        is_trial: productsTable.is_trial,
        key_benefits: productsTable.key_benefits,
        icon_color: productsTable.icon_color,
        icon_emoji: productsTable.icon_emoji,
        nutrition_energy_kcal: productsTable.nutrition_energy_kcal,
        nutrition_protein_g: productsTable.nutrition_protein_g,
        nutrition_fat_g: productsTable.nutrition_fat_g,
        nutrition_carbs_g: productsTable.nutrition_carbs_g,
        nutrition_fibre_g: productsTable.nutrition_fibre_g,
        nutrition_sugars_g: productsTable.nutrition_sugars_g,
        nutrition_added_sugars_g: productsTable.nutrition_added_sugars_g,
      })
      .from(productsTable)
      .leftJoin(goalsTable, eq(productsTable.goal_id, goalsTable.id));

    const products = rows.map((r) => ({
      ...r,
      goal_id: r.goal_id ?? 0,
      goal_name: r.goal_name ?? "",
      trial_price: r.is_trial ? 499 : undefined,
      key_benefits: (() => {
        try { return JSON.parse(r.key_benefits ?? "[]"); } catch { return []; }
      })(),
    }));

    return res.json({ products });
  } catch (err) {
    console.error("products error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
