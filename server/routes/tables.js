import express from "express";
import crypto from "crypto";
import QRCode from "qrcode";
import db from "../db/index.js";
import { verifyAdminMiddleware } from "../middleware/auth.js";
const router = express.Router();
router.post("/", verifyAdminMiddleware, async (req, res) => {
  const { name, domain } = req.body || {};
  if (!name || !domain) return res.status(400).json({ error: "name and domain required" });
  const table_id = await db.createTable(name);
  const token = crypto.randomBytes(32).toString("base64url");
  await db.createTableToken(table_id, token);
  const url = `${domain.replace(/\/+$/,"")}/order?token=${encodeURIComponent(token)}`;
  const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M" });
  res.json({ table_id, url, qr_svg: svg });
});
export default router;
