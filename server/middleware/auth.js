import jwt from "jsonwebtoken";
import db from "../db/index.js";
const SESSION_AUD = "table-session";
const ADMIN_AUD = "admin";
function secret() {
  return process.env.JWT_SECRET || "dev-secret";
}
function signSession(session) {
  return jwt.sign({ sid: session.id, tid: session.table_id, aud: SESSION_AUD }, secret(), { expiresIn: "2h" });
}
function verifySessionToken(token) {
  try {
    const payload = jwt.verify(token, secret(), { audience: SESSION_AUD });
    return payload;
  } catch {
    return null;
  }
}
async function sessionMiddleware(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "unauthorized" });
  const payload = verifySessionToken(token);
  if (!payload) return res.status(401).json({ error: "invalid" });
  const session = await db.getSession(payload.sid);
  if (!session || session.active !== 1 || session.expires_at < Math.floor(Date.now() / 1000)) return res.status(401).json({ error: "expired" });
  req.session = session;
  next();
}
function signAdmin(admin) {
  return jwt.sign({ sub: admin.id, username: admin.username, aud: ADMIN_AUD }, secret(), { expiresIn: "8h" });
}
function verifyAdminMiddleware(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "unauthorized" });
  try {
    const payload = jwt.verify(token, secret(), { audience: ADMIN_AUD });
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: "invalid" });
  }
}
export { signSession, sessionMiddleware, signAdmin, verifyAdminMiddleware };
// Restrict guest endpoints to specific IP prefixes (e.g., "192.168.1.")
function clientIp(req){
  const xf = req.headers["x-forwarded-for"];
  if(xf) return String(xf).split(",")[0].trim();
  return req.ip || (req.connection && req.connection.remoteAddress) || "";
}
function guestNetworkGuard(req,res,next){
  const allow = (process.env.ALLOWED_GUEST_IP_PREFIXES||"").split(",").map(s=>s.trim()).filter(Boolean);
  if(allow.length===0) return next();
  const ip = clientIp(req);
  const ok = allow.some(pref => ip.startsWith(pref));
  if(!ok) return res.status(403).json({ error: "wifi_required" });
  next();
}
export { guestNetworkGuard }; 
