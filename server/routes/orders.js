import express from "express";
import db from "../db/index.js";
import { sessionMiddleware, guestNetworkGuard } from "../middleware/auth.js";
const router = express.Router();
router.post("/", guestNetworkGuard, sessionMiddleware, async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "no_items" });
  const sanitized = items.map(i => ({ menu_item_id: i.menu_item_id, quantity: Math.max(1, Number(i.quantity)||1), price_cents: Number(i.price_cents)||0 }));
  const order = await db.createOrder(req.session.table_id, req.session.id, sanitized, "");
  res.json({ order_id: order.id, created_at: order.created_at });
});
router.post("/checkout", guestNetworkGuard, sessionMiddleware, async (req, res) => {
  const { items, method, customer_name, txn, amount_inr } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "no_items" });
  const sanitized = items.map(i => ({ menu_item_id: i.menu_item_id, quantity: Math.max(1, Number(i.quantity)||1), price_cents: Number(i.price_cents)||0 }));
  const txnOk = typeof txn === "string" && txn.trim().length >= 12;
  if (!txnOk) return res.status(400).json({ error: "invalid_txn" });
  const order = await db.createOrder(req.session.table_id, req.session.id, sanitized, customer_name||"");
  const total = sanitized.reduce((s,x)=>s + (x.price_cents * x.quantity), 0);
  await db.setPaymentStatus(order.id, "PENDING", method || `ONLINE:${txn}`, total);
  res.json({ order_id: order.id, paid: false });
});
router.get("/kds", async (req, res) => {
  const o = await db.getOrdersForKDS();
  const orders = [];
  for (const ord of o) {
    const items = await db.getOrderItems(ord.id);
    orders.push({ ...ord, items });
  }
  res.json(orders);
});
router.put("/:id/status", async (req, res) => {
  const id = req.params.id;
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: "status_required" });
  await db.updateOrderStatus(id, status.toUpperCase());
  res.json({ ok: true });
});
router.put("/:id/items/:itemId/done", async (req, res) => {
  const orderId = req.params.id;
  const itemId = req.params.itemId;
  await db.markOrderItemDone(orderId, itemId);
  res.json({ ok: true });
});
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  const ord = await db.getOrder(id);
  if (!ord) return res.status(404).json({ error: "not_found" });
  res.json(ord);
});
export default router;
