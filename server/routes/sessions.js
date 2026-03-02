import express from "express";
import db from "../db/index.js";
import { signSession, guestNetworkGuard } from "../middleware/auth.js";
const router = express.Router();
router.post("/validate", guestNetworkGuard, async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: "token required" });
  const table = await db.getTableByToken(token);
  if (!table) return res.status(401).json({ error: "access_denied" });
  const session = await db.createSession(table.id, token);
  const session_token = signSession(session);
  res.json({ session_id: session.id, table_id: session.table_id, expires_at: session.expires_at, session_token });
});
export default router;
