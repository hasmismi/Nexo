import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, cartItemsTable, productsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/checkout", async (req, res) => {
  try {
    const { account_id } = req.body;
    if (!account_id) return res.status(400).json({ message: "account_id required" });

    const cartItems = await db
      .select({
        id: cartItemsTable.id,
        product_id: cartItemsTable.product_id,
        product_name: productsTable.name,
        grams: cartItemsTable.grams,
        price: cartItemsTable.price,
      })
      .from(cartItemsTable)
      .leftJoin(productsTable, eq(cartItemsTable.product_id, productsTable.id))
      .where(eq(cartItemsTable.account_id, account_id));

    if (cartItems.length === 0) return res.status(400).json({ message: "Cart is empty" });

    const total_price = parseFloat(cartItems.reduce((sum, i) => sum + i.price, 0).toFixed(2));

    const orders = await db
      .insert(ordersTable)
      .values({ account_id, total_price, status: "confirmed" })
      .returning();

    const order = orders[0];

    const orderItems = [];
    for (const ci of cartItems) {
      const inserted = await db
        .insert(orderItemsTable)
        .values({ order_id: order.id, product_id: ci.product_id!, grams: ci.grams, price: ci.price })
        .returning();
      orderItems.push({
        ...inserted[0],
        product_name: ci.product_name ?? "",
      });
    }

    await db.delete(cartItemsTable).where(eq(cartItemsTable.account_id, account_id));

    return res.json({
      order: {
        id: order.id,
        account_id: order.account_id,
        total_price: order.total_price,
        status: order.status,
        tracking_link: order.tracking_link ?? undefined,
        created_at: order.created_at.toISOString(),
        items: orderItems,
      },
      message: "Order placed successfully",
    });
  } catch (err) {
    console.error("checkout error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const account_id = parseInt(req.query.account_id as string);
    if (!account_id) return res.status(400).json({ message: "account_id required" });

    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.account_id, account_id))
      .orderBy(ordersTable.created_at);

    const result = [];
    for (const order of orders) {
      const items = await db
        .select({
          id: orderItemsTable.id,
          product_id: orderItemsTable.product_id,
          product_name: productsTable.name,
          grams: orderItemsTable.grams,
          price: orderItemsTable.price,
        })
        .from(orderItemsTable)
        .leftJoin(productsTable, eq(orderItemsTable.product_id, productsTable.id))
        .where(eq(orderItemsTable.order_id, order.id));

      result.push({
        id: order.id,
        account_id: order.account_id,
        total_price: order.total_price,
        status: order.status,
        tracking_link: order.tracking_link ?? undefined,
        created_at: order.created_at.toISOString(),
        items: items.map((i) => ({ ...i, product_name: i.product_name ?? "" })),
      });
    }

    return res.json({ orders: result.reverse() });
  } catch (err) {
    console.error("get orders error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
