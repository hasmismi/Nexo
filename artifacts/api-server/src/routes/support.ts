import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  return res.json({
    phone: "+91 98765 43210",
    email: "support@nexonutrition.com",
  });
});

export default router;
