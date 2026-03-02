import express from "express";
import db from "../db/index.js";
import { verifyAdminMiddleware, sessionMiddleware, guestNetworkGuard } from "../middleware/auth.js";
const router = express.Router();
router.get("/", guestNetworkGuard, sessionMiddleware, async (req, res) => {
  const items = await db.listMenu(true);
  res.json(items);
});
router.get("/all", verifyAdminMiddleware, async (req, res) => {
  const items = await db.listMenu(false);
  res.json(items);
});
router.post("/", verifyAdminMiddleware, async (req, res) => {
  const { name, price_cents, description, image_url, category, available } = req.body || {};
  if (!name || typeof price_cents !== "number") return res.status(400).json({ error: "invalid" });
  const id = await db.upsertMenu({ name, price_cents, description, image_url, category, available: available !== false });
  res.json({ id });
});
router.put("/:id", verifyAdminMiddleware, async (req, res) => {
  const id = req.params.id;
  const { name, price_cents, description, image_url, category, available } = req.body || {};
  await db.upsertMenu({ id, name, price_cents, description, image_url, category, available });
  res.json({ ok: true });
});
router.delete("/:id", verifyAdminMiddleware, async (req, res) => {
  const id = req.params.id;
  await db.deleteMenu(id);
  res.json({ ok: true });
});
export default router;
