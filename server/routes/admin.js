import express from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import db from "../db/index.js";
import { signAdmin, verifyAdminMiddleware } from "../middleware/auth.js";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");
const router = express.Router();
function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, s, 64).toString("hex");
  return `${s}:${hash}`;
}
function verifyPassword(password, stored) {
  const [s, h] = stored.split(":");
  const hash = crypto.scryptSync(password, s, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(h, "hex"));
}
router.post("/bootstrap", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "invalid" });
  const exists = await db.getAdminByUsername(username);
  if (exists) return res.status(409).json({ error: "exists" });
  const ph = hashPassword(password);
  const id = await db.createAdmin(username, ph);
  res.json({ id });
});
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "invalid" });
  const admin = await db.getAdminByUsername(username);
  if (!admin) return res.status(401).json({ error: "invalid" });
  if (!verifyPassword(password, admin.password_hash)) return res.status(401).json({ error: "invalid" });
  const token = signAdmin(admin);
  res.json({ token });
});
router.get("/tables/monitor", verifyAdminMiddleware, async (req, res) => {
  const active = await db.activeTables();
  const pending_payment = await db.pendingPaymentTables();
  const completed = await db.completedTables();
  res.json({ active, pending_payment, completed });
});
router.get("/orders", verifyAdminMiddleware, async (req, res) => {
  const from = Number(req.query.from)||0;
  const to = Number(req.query.to)||9999999999;
  const o = await db.listOrdersBetween(from, to);
  const orders = [];
  for (const ord of o) {
    const items = await db.getOrderItems(ord.id);
    orders.push({ ...ord, items });
  }
  res.json(orders);
});
router.put("/orders/:id/payment", verifyAdminMiddleware, async (req, res) => {
  const id = req.params.id;
  const { status, method, amount_cents } = req.body || {};
  if (!status) return res.status(400).json({ error: "status_required" });
  await db.setPaymentStatus(id, status.toUpperCase(), method || "COUNTER", Number(amount_cents)||0);
  res.json({ ok: true });
});
// Sales summary by day
router.get("/sales", verifyAdminMiddleware, async (req, res) => {
  const from = Number(req.query.from)||0;
  const to = Number(req.query.to)||9999999999;
  const rows = await db.salesByDay(from, to);
  res.json(rows);
});
// Pending payments with full order details
router.get("/payments/pending", verifyAdminMiddleware, async (req, res) => {
  const o = await db.listPendingOrders();
  const orders = [];
  for (const ord of o) {
    const items = await db.getOrderItems(ord.id);
    orders.push({ ...ord, items });
  }
  res.json(orders);
});
router.get("/ratings", verifyAdminMiddleware, async (req, res) => {
  const rows = await db.listRatings();
  res.json(rows);
});
router.put("/ratings/:id/visible", verifyAdminMiddleware, async (req, res) => {
  const id = req.params.id;
  const { visible } = req.body || {};
  await db.setRatingVisible(id, !!visible);
  res.json({ ok: true });
});
// List all tables for admin
router.get("/tables", verifyAdminMiddleware, async (req, res) => {
  const tables = await db.listTables();
  res.json(tables);
});
// Toggle table active
router.put("/tables/:id/active", verifyAdminMiddleware, async (req, res) => {
  const id = req.params.id;
  const { active } = req.body || {};
  await db.setTableActive(id, !!active);
  res.json({ ok: true });
});
// Rotate token for a table and return fresh QR
router.post("/tables/:id/rotate-token", verifyAdminMiddleware, async (req, res) => {
  const id = req.params.id;
  const { domain } = req.body || {};
  if (!domain) return res.status(400).json({ error: "domain_required" });
  await db.deactivateTokensForTable(id);
  const token = crypto.randomBytes(32).toString("base64url");
  await db.createTableToken(id, token);
  const url = `${domain.replace(/\/+$/,"")}/order?token=${encodeURIComponent(token)}`;
  const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M" });
  res.json({ table_id: id, url, qr_svg: svg });
});
// Upload image (data URL) and return a local URL
router.post("/upload-image", verifyAdminMiddleware, async (req, res) => {
  const { filename, data_url } = req.body || {};
  if (!filename || !data_url || !data_url.startsWith("data:")) return res.status(400).json({ error: "invalid" });
  const ext = filename.includes(".") ? filename.split(".").pop() : "png";
  const base = crypto.randomBytes(8).toString("hex");
  const out = path.join(uploadsDir, `${base}.${ext}`);
  try{
    const b64 = data_url.split(",")[1];
    const buf = Buffer.from(b64, "base64");
    fs.writeFileSync(out, buf);
    res.json({ url: `/uploads/${path.basename(out)}` });
  }catch(e){
    res.status(500).json({ error: "save_failed" });
  }
});
// Status assets (GIFs) management
router.get("/status-assets", verifyAdminMiddleware, async (req, res) => {
  const cfg = path.join(uploadsDir, "status_assets.json");
  let data = { cooking: "", ready: "", served: "" };
  if (fs.existsSync(cfg)) {
    try { data = JSON.parse(fs.readFileSync(cfg, "utf8")); } catch {}
  }
  res.json(data);
});
router.put("/status-assets", verifyAdminMiddleware, async (req, res) => {
  const { cooking, ready, served } = req.body || {};
  const cfg = path.join(uploadsDir, "status_assets.json");
  const data = { cooking: cooking||"", ready: ready||"", served: served||"" };
  fs.writeFileSync(cfg, JSON.stringify(data, null, 2));
  res.json({ ok: true });
});
export default router;
