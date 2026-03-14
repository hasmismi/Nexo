import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  return res.json({
    phone: "+91 8807803856",
    email: "nexohealthsupport@gmail.com",
  });
});

export default router;
