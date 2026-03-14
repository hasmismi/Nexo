import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, cartItemsTable, productsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/checkout", async (req, res) => {
  try {
    const {
      account_id,
      delivery_name,
      delivery_phone,
      delivery_address,
      delivery_city,
      delivery_pincode,
      payment_method,
      delivery_lat,
      delivery_lng,
      delivery_fee,
      razorpay_payment_id,
    } = req.body;
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

    const subtotal = parseFloat(cartItems.reduce((sum, i) => sum + i.price, 0).toFixed(2));
    const fee = typeof delivery_fee === "number" ? delivery_fee : 0;
    const total_price = parseFloat((subtotal + fee).toFixed(2));

    const orders = await db
      .insert(ordersTable)
      .values({
        account_id,
        total_price,
        status: "confirmed",
        delivery_name: delivery_name ?? null,
        delivery_phone: delivery_phone ?? null,
        delivery_address: delivery_address ?? null,
        delivery_city: delivery_city ?? null,
        delivery_pincode: delivery_pincode ?? null,
        payment_method: payment_method ?? null,
        delivery_lat: delivery_lat ?? null,
        delivery_lng: delivery_lng ?? null,
        delivery_fee: fee,
        razorpay_payment_id: razorpay_payment_id ?? null,
      })
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
        delivery_fee: order.delivery_fee,
        status: order.status,
        tracking_link: order.tracking_link ?? undefined,
        delivery_name: order.delivery_name ?? undefined,
        delivery_phone: order.delivery_phone ?? undefined,
        delivery_address: order.delivery_address ?? undefined,
        delivery_city: order.delivery_city ?? undefined,
        delivery_pincode: order.delivery_pincode ?? undefined,
        payment_method: order.payment_method ?? undefined,
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
        delivery_name: order.delivery_name ?? undefined,
        delivery_phone: order.delivery_phone ?? undefined,
        delivery_address: order.delivery_address ?? undefined,
        delivery_city: order.delivery_city ?? undefined,
        delivery_pincode: order.delivery_pincode ?? undefined,
        payment_method: order.payment_method ?? undefined,
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
