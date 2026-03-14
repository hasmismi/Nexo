import { Router } from "express";
import { db } from "@workspace/db";
import { accountsTable, profilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/google-login", async (req, res) => {
  try {
    const { google_id, email } = req.body;
    if (!google_id || !email) {
      return res.status(400).json({ message: "google_id and email are required" });
    }

    // First try to find by google_id
    let account = await db
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.google_id, google_id))
      .limit(1);

    // If not found by google_id, try by email (handles returning users)
    if (account.length === 0) {
      account = await db
        .select()
        .from(accountsTable)
        .where(eq(accountsTable.email, email))
        .limit(1);
    }

    // If still not found, create new account
    if (account.length === 0) {
      const inserted = await db
        .insert(accountsTable)
        .values({ google_id, email })
        .returning();
      account = inserted;
    }

    const acc = account[0];

    const profile = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.account_id, acc.id))
      .limit(1);

    const onboarding_completed = profile.length > 0 && profile[0].onboarding_completed;

    return res.json({
      account_id: acc.id,
      email: acc.email,
      onboarding_completed,
    });
  } catch (err) {
    console.error("google-login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
