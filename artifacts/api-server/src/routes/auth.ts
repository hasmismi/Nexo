import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { accountsTable, profilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();
const SALT_ROUNDS = 10;

router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await db
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const inserted = await db
      .insert(accountsTable)
      .values({ email: email.toLowerCase().trim(), password_hash })
      .returning();

    const acc = inserted[0];
    return res.json({ account_id: acc.id, email: acc.email, onboarding_completed: false });
  } catch (err) {
    console.error("signup error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const account = await db
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (account.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const acc = account[0];

    if (!acc.password_hash) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, acc.password_hash);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const profile = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.account_id, acc.id))
      .limit(1);

    const onboarding_completed = profile.length > 0 && profile[0].onboarding_completed;

    return res.json({ account_id: acc.id, email: acc.email, onboarding_completed });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
