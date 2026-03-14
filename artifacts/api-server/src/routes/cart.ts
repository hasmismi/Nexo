import { Router } from "express";
import { db } from "@workspace/db";
import { cartItemsTable, productsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

router.post("/add", async (req, res) => {
  try {
    const { account_id, product_id, grams } = req.body;
    if (!account_id || !product_id || !grams) {
      return res.status(400).json({ message: "account_id, product_id, grams required" });
    }

    const products = await db.select().from(productsTable).where(eq(productsTable.id, product_id)).limit(1);
    if (products.length === 0) return res.status(404).json({ message: "Product not found" });

    const product = products[0];
    let price: number;
    if (product.is_trial) {
      price = 499;
    } else {
      price = parseFloat((product.price_per_gram * grams).toFixed(2));
    }

    await db.insert(cartItemsTable).values({ account_id, product_id, grams, price });

    return await getCartResponse(account_id, res);
  } catch (err) {
    console.error("add to cart error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const account_id = parseInt(req.query.account_id as string);
    if (!account_id) return res.status(400).json({ message: "account_id required" });
    return await getCartResponse(account_id, res);
  } catch (err) {
    console.error("get cart error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/item/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(cartItemsTable).where(eq(cartItemsTable.id, id));
    return res.json({ message: "Item removed" });
  } catch (err) {
    console.error("remove cart item error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

async function getCartResponse(account_id: number, res: any) {
  const rows = await db
    .select({
      id: cartItemsTable.id,
      account_id: cartItemsTable.account_id,
      product_id: cartItemsTable.product_id,
      product_name: productsTable.name,
      grams: cartItemsTable.grams,
      price: cartItemsTable.price,
    })
    .from(cartItemsTable)
    .leftJoin(productsTable, eq(cartItemsTable.product_id, productsTable.id))
    .where(eq(cartItemsTable.account_id, account_id));

  const items = rows.map((r) => ({
    ...r,
    product_name: r.product_name ?? "",
  }));

  const total_price = parseFloat(items.reduce((sum, i) => sum + i.price, 0).toFixed(2));
  return res.json({ items, total_price });
}

export default router;
