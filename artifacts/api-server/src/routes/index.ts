import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import onboardingRouter from "./onboarding";
import dashboardRouter from "./dashboard";
import productsRouter from "./products";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import supportRouter from "./support";

const router = Router();

router.use("/", healthRouter);
router.use("/auth", authRouter);
router.use("/onboarding", onboardingRouter);
router.use("/dashboard", dashboardRouter);
router.use("/products", productsRouter);
router.use("/cart", cartRouter);
router.use("/checkout", ordersRouter);
router.use("/orders", ordersRouter);
router.use("/support", supportRouter);

export default router;
