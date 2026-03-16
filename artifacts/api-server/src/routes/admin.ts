import { Router, Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { accountsTable, profilesTable, ordersTable, orderItemsTable, productsTable, offersTable } from "@workspace/db/schema";
import { eq, desc, count, sum, sql, asc } from "drizzle-orm";

const router = Router();

async function requireAdmin(req: Request, res: Response, next: NextFunction): promise<void> {
  const account_id = Number(req.body?.account_id ?? req.query?.account_id);
  if (!account_id) return res.status(401).json({ message: "account_id required" });
  const [acc] = await db.select({ is_admin: accountsTable.is_admin }).from(accountsTable).where(eq(accountsTable.id, account_id)).limit(1);
  if (!acc?.is_admin) return res.status(403).json({ message: "Admin access required" });
  next();
}

router.post("/bootstrap", async (req, res) => {
  try {
    const { account_id } = req.body;
    if (!account_id) return res.status(400).json({ message: "account_id required" });
    const existing = await db.select({ id: accountsTable.id }).from(accountsTable).where(eq(accountsTable.is_admin, true)).limit(1);
    if (existing.length > 0) return res.status(403).json({ message: "An admin already exists. Ask them to promote you." });
    await db.update(accountsTable).set({ is_admin: true }).where(eq(accountsTable.id, account_id));
    return res.json({ success: true, message: "You are now an admin." });
  } catch (err) {
    console.error("bootstrap error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const [userCount] = await db.select({ count: count() }).from(accountsTable);
    const [orderCount] = await db.select({ count: count() }).from(ordersTable);

    const [totalRevenueRow] = await db
      .select({ total: sql<string>`COALESCE(SUM(${ordersTable.total_price}), 0)` })
      .from(ordersTable);

    const [thisMonthRow] = await db
      .select({ total: sql<string>`COALESCE(SUM(${ordersTable.total_price}), 0)` })
      .from(ordersTable)
      .where(sql`DATE_TRUNC('month', ${ordersTable.created_at}) = DATE_TRUNC('month', CURRENT_DATE)`);

    const [lastMonthRow] = await db
      .select({ total: sql<string>`COALESCE(SUM(${ordersTable.total_price}), 0)` })
      .from(ordersTable)
      .where(sql`DATE_TRUNC('month', ${ordersTable.created_at}) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')`);

    const [thisYearRow] = await db
      .select({ total: sql<string>`COALESCE(SUM(${ordersTable.total_price}), 0)` })
      .from(ordersTable)
      .where(sql`DATE_TRUNC('year', ${ordersTable.created_at}) = DATE_TRUNC('year', CURRENT_DATE)`);

    const todayOrders = await db
      .select({ count: count() })
      .from(ordersTable)
      .where(sql`DATE(${ordersTable.created_at}) = CURRENT_DATE`);

    const pendingOrders = await db
      .select({ count: count() })
      .from(ordersTable)
      .where(eq(ordersTable.order_status, "pending"));

    return res.json({
      total_users: Number(userCount.count),
      total_orders: Number(orderCount.count),
      total_revenue: Number(totalRevenueRow?.total ?? 0),
      this_month_revenue: Number(thisMonthRow?.total ?? 0),
      last_month_revenue: Number(lastMonthRow?.total ?? 0),
      this_year_revenue: Number(thisYearRow?.total ?? 0),
      today_orders: Number(todayOrders[0]?.count ?? 0),
      pending_orders: Number(pendingOrders[0]?.count ?? 0),
    });
  } catch (err) {
    console.error("stats error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/orders", requireAdmin, async (req, res) => {
  try {
    const orders = await db
      .select({
        id: ordersTable.id,
        account_id: ordersTable.account_id,
        delivery_name: ordersTable.delivery_name,
        delivery_phone: ordersTable.delivery_phone,
        delivery_address: ordersTable.delivery_address,
        delivery_city: ordersTable.delivery_city,
        delivery_pincode: ordersTable.delivery_pincode,
        payment_method: ordersTable.payment_method,
        delivery_fee: ordersTable.delivery_fee,
        order_status: ordersTable.order_status,
        tracking_link: ordersTable.tracking_link,
        razorpay_payment_id: ordersTable.razorpay_payment_id,
        created_at: ordersTable.created_at,
        email: accountsTable.email,
        customer_name: profilesTable.name,
      })
      .from(ordersTable)
      .leftJoin(accountsTable, eq(ordersTable.account_id, accountsTable.id))
      .leftJoin(profilesTable, eq(ordersTable.account_id, profilesTable.account_id))
      .orderBy(desc(ordersTable.created_at))
      .limit(200);

    const orderIds = orders.map((o) => o.id);
    const items =
      orderIds.length > 0
        ? await db
            .select({
              order_id: orderItemsTable.order_id,
              product_name: productsTable.name,
              quantity: orderItemsTable.grams,
              unit_price: orderItemsTable.price,
            })
            .from(orderItemsTable)
            .leftJoin(productsTable, eq(orderItemsTable.product_id, productsTable.id))
            .where(sql`${orderItemsTable.order_id} = ANY(${sql.raw(`ARRAY[${orderIds.join(",")}]`)})`)
        : [];

    const itemsByOrder: Record<number, typeof items> = {};
    for (const item of items) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    }

    const result = orders.map((o) => ({
      ...o,
      items: itemsByOrder[o.id] ?? [],
    }));

    return res.json({ orders: result });
  } catch (err) {
    console.error("admin orders error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { order_status, tracking_link } = req.body;
    const valid = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    if (!valid.includes(order_status)) return res.status(400).json({ message: "Invalid status" });
    const updates: Record<string, unknown> = { order_status };
    if (tracking_link !== undefined) updates.tracking_link = tracking_link || null;
    await db.update(ordersTable).set(updates).where(eq(ordersTable.id, Number(id)));
    return res.json({ success: true });
  } catch (err) {
    console.error("update order status error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/users", requireAdmin, async (req, res) => {
  try {
    const users = await db
      .select({
        id: accountsTable.id,
        email: accountsTable.email,
        is_admin: accountsTable.is_admin,
        created_at: accountsTable.created_at,
        name: profilesTable.name,
        phone_number: profilesTable.phone_number,
        gender: profilesTable.gender,
        age: profilesTable.age,
        onboarding_completed: profilesTable.onboarding_completed,
      })
      .from(accountsTable)
      .leftJoin(profilesTable, eq(accountsTable.id, profilesTable.account_id))
      .orderBy(desc(accountsTable.created_at));

    const orderCounts = await db
      .select({ account_id: ordersTable.account_id, count: count() })
      .from(ordersTable)
      .groupBy(ordersTable.account_id);

    const countMap: Record<number, number> = {};
    for (const row of orderCounts) {
      countMap[row.account_id] = Number(row.count);
    }

    return res.json({
      users: users.map((u) => ({ ...u, order_count: countMap[u.id] ?? 0 })),
    });
  } catch (err) {
    console.error("admin users error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/users/:id/toggle-admin", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { account_id } = req.body;
    if (Number(id) === Number(account_id)) return res.status(400).json({ message: "Cannot change your own admin status" });
    const [user] = await db.select({ is_admin: accountsTable.is_admin }).from(accountsTable).where(eq(accountsTable.id, Number(id))).limit(1);
    if (!user) return res.status(404).json({ message: "User not found" });
    await db.update(accountsTable).set({ is_admin: !user.is_admin }).where(eq(accountsTable.id, Number(id)));
    return res.json({ success: true, is_admin: !user.is_admin });
  } catch (err) {
    console.error("toggle admin error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/products", requireAdmin, async (req, res) => {
  try {
    const products = await db.select().from(productsTable).orderBy(productsTable.id);
    return res.json({ products });
  } catch (err) {
    console.error("admin products error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/products/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { account_id: _a, ...updates } = req.body;
    const allowed = ["name", "description", "price_per_gram", "is_trial", "key_benefits", "icon_color", "icon_emoji",
      "nutrition_energy_kcal", "nutrition_protein_g", "nutrition_fat_g", "nutrition_carbs_g",
      "nutrition_fibre_g", "nutrition_sugars_g", "nutrition_added_sugars_g"];
    const filtered: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in updates) filtered[key] = updates[key];
    }
    if (Object.keys(filtered).length === 0) return res.status(400).json({ message: "No valid fields to update" });
    const [product] = await db.update(productsTable).set(filtered).where(eq(productsTable.id, Number(id))).returning();
    return res.json({ product });
  } catch (err) {
    console.error("update product error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/offers", requireAdmin, async (req, res) => {
  try {
    const offers = await db.select().from(offersTable).orderBy(desc(offersTable.created_at));
    return res.json({ offers });
  } catch (err) {
    console.error("admin offers error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/offers", requireAdmin, async (req, res) => {
  try {
    const { account_id: _a, ...body } = req.body;
    const [offer] = await db.insert(offersTable).values({
      title: body.title,
      description: body.description ?? "",
      code: body.code || null,
      discount_type: body.discount_type ?? "percent",
      discount_value: Number(body.discount_value),
      min_order_amount: Number(body.min_order_amount ?? 0),
      max_uses: body.max_uses ? Number(body.max_uses) : null,
      is_active: body.is_active ?? true,
      starts_at: body.starts_at ? new Date(body.starts_at) : null,
      ends_at: body.ends_at ? new Date(body.ends_at) : null,
    }).returning();
    return res.json({ offer });
  } catch (err) {
    console.error("create offer error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/offers/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { account_id: _a, ...body } = req.body;
    const updates: Record<string, unknown> = {};
    if ("title" in body) updates.title = body.title;
    if ("description" in body) updates.description = body.description;
    if ("code" in body) updates.code = body.code || null;
    if ("discount_type" in body) updates.discount_type = body.discount_type;
    if ("discount_value" in body) updates.discount_value = Number(body.discount_value);
    if ("min_order_amount" in body) updates.min_order_amount = Number(body.min_order_amount);
    if ("max_uses" in body) updates.max_uses = body.max_uses ? Number(body.max_uses) : null;
    if ("is_active" in body) updates.is_active = body.is_active;
    if ("starts_at" in body) updates.starts_at = body.starts_at ? new Date(body.starts_at) : null;
    if ("ends_at" in body) updates.ends_at = body.ends_at ? new Date(body.ends_at) : null;
    const [offer] = await db.update(offersTable).set(updates).where(eq(offersTable.id, Number(id))).returning();
    return res.json({ offer });
  } catch (err) {
    console.error("update offer error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/offers/:id", requireAdmin, async (req, res) => {
  try {
    const account_id = Number(req.query.account_id);
    if (!account_id) return res.status(401).json({ message: "account_id required" });
    const [acc] = await db.select({ is_admin: accountsTable.is_admin }).from(accountsTable).where(eq(accountsTable.id, account_id)).limit(1);
    if (!acc?.is_admin) return res.status(403).json({ message: "Admin access required" });
    await db.delete(offersTable).where(eq(offersTable.id, Number(req.params.id)));
    return res.json({ success: true });
  } catch (err) {
    console.error("delete offer error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
