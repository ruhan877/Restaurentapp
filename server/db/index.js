import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import initSqlJs from "sql.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "..", "data.sqlite");
let SQL;
let memdb;
async function ensureDB() {
  if (memdb) return;
  SQL = await initSqlJs({
    locateFile: f => path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "node_modules", "sql.js", "dist", f)
  });
  let data = null;
  if (fs.existsSync(dbPath)) {
    const b = fs.readFileSync(dbPath);
    if (b && b.length > 0) data = b;
  }
  memdb = data ? new SQL.Database(data) : new SQL.Database();
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  memdb.run(schema);
  try {
    memdb.run("ALTER TABLE order_items ADD COLUMN done INTEGER DEFAULT 0");
  } catch {}
  try {
    memdb.run("ALTER TABLE orders ADD COLUMN customer_name TEXT");
  } catch {}
  try {
    memdb.run("CREATE TABLE IF NOT EXISTS ratings (id TEXT PRIMARY KEY, name TEXT, score INTEGER, comment TEXT, created_at INTEGER)");
  } catch {}
  try { memdb.run("ALTER TABLE ratings ADD COLUMN email TEXT"); } catch {}
  try { memdb.run("ALTER TABLE ratings ADD COLUMN phone TEXT"); } catch {}
  try { memdb.run("ALTER TABLE ratings ADD COLUMN dish TEXT"); } catch {}
  try { memdb.run("ALTER TABLE ratings ADD COLUMN visible INTEGER DEFAULT 0"); } catch {}
}
function persist() {
  const data = memdb.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}
function now() {
  return Math.floor(Date.now() / 1000);
}
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
async function createTable(name) {
  await ensureDB();
  const id = crypto.randomUUID();
  const created_at = now();
  const stmt = memdb.prepare("INSERT INTO tables (id,name,active,created_at) VALUES (?,?,1,?)");
  stmt.run([id, name, created_at]);
  persist();
  return id;
}
async function createTableToken(table_id, token) {
  await ensureDB();
  const token_hash = hashToken(token);
  const created_at = now();
  const stmt = memdb.prepare("INSERT INTO table_tokens (table_id,token_hash,created_at,active) VALUES (?,?,?,1)");
  stmt.run([table_id, token_hash, created_at]);
  persist();
  return token_hash;
}
async function getTableByToken(token) {
  await ensureDB();
  const token_hash = hashToken(token);
  const stmt = memdb.prepare("SELECT t.* FROM tables t JOIN table_tokens tt ON t.id=tt.table_id WHERE tt.token_hash=? AND tt.active=1 AND t.active=1");
  const res = stmt.getAsObject([token_hash]);
  return res && res.id ? res : null;
}
async function createSession(table_id, token) {
  await ensureDB();
  const id = crypto.randomUUID();
  const created_at = now();
  const expires_at = created_at + 2 * 60 * 60;
  const token_hash = hashToken(token);
  const deact = memdb.prepare("UPDATE sessions SET active=0 WHERE table_id=?");
  deact.run([table_id]);
  const stmt = memdb.prepare("INSERT INTO sessions (id,table_id,token_hash,created_at,expires_at,active) VALUES (?,?,?,?,?,1)");
  stmt.run([id, table_id, token_hash, created_at, expires_at]);
  persist();
  return { id, table_id, created_at, expires_at };
}
async function getSession(id) {
  await ensureDB();
  const stmt = memdb.prepare("SELECT * FROM sessions WHERE id=? AND active=1");
  const res = stmt.getAsObject([id]);
  return res && res.id ? res : null;
}
async function deactivateSession(id) {
  await ensureDB();
  const s = memdb.prepare("UPDATE sessions SET active=0 WHERE id=?");
  s.run([id]);
  persist();
}
async function cleanupExpiredSessions() {
  await ensureDB();
  const t = now();
  const s = memdb.prepare("UPDATE sessions SET active=0 WHERE expires_at<?");
  s.run([t]);
  persist();
}
async function listMenu(onlyAvailable) {
  await ensureDB();
  if (onlyAvailable) {
    const res = [];
    const stmt = memdb.prepare("SELECT * FROM menu_items WHERE available=1 ORDER BY category,name");
    while (stmt.step()) res.push(stmt.getAsObject());
    return res;
  }
  const res = [];
  const stmt = memdb.prepare("SELECT * FROM menu_items ORDER BY category,name");
  while (stmt.step()) res.push(stmt.getAsObject());
  return res;
}
async function addRating(name, score, comment, email, phone, dish) {
  await ensureDB();
  const id = crypto.randomUUID();
  const stmt = memdb.prepare("INSERT INTO ratings (id,name,score,comment,created_at,email,phone,dish,visible) VALUES (?,?,?,?,?,?,?,?,0)");
  stmt.run([id, name || "", Math.max(1, Math.min(5, Number(score)||0)), comment || "", now(), email || "", phone || "", dish || ""]);
  persist();
  return id;
}
async function listRatings() {
  await ensureDB();
  const res = [];
  const stmt = memdb.prepare("SELECT * FROM ratings ORDER BY created_at DESC");
  while (stmt.step()) res.push(stmt.getAsObject());
  return res;
}
async function listVisibleRatings() {
  await ensureDB();
  const res = [];
  const stmt = memdb.prepare("SELECT * FROM ratings WHERE visible=1 ORDER BY created_at DESC");
  while (stmt.step()) res.push(stmt.getAsObject());
  return res;
}
async function setRatingVisible(id, visible) {
  await ensureDB();
  const stmt = memdb.prepare("UPDATE ratings SET visible=? WHERE id=?");
  stmt.run([visible ? 1 : 0, id]);
  persist();
}
async function upsertMenu(item) {
  await ensureDB();
  if (item.id) {
    const stmt = memdb.prepare("UPDATE menu_items SET name=?,price_cents=?,description=?,image_url=?,category=?,available=? WHERE id=?");
    stmt.run([item.name, item.price_cents, item.description, item.image_url, item.category, item.available ? 1 : 0, item.id]);
    persist();
    return item.id;
  }
  const id = crypto.randomUUID();
  const stmt = memdb.prepare("INSERT INTO menu_items (id,name,price_cents,description,image_url,category,available,created_at) VALUES (?,?,?,?,?,?,?,?)");
  stmt.run([id, item.name, item.price_cents, item.description, item.image_url, item.category, item.available ? 1 : 0, now()]);
  persist();
  return id;
}
async function createOrder(table_id, session_id, items, customer_name) {
  await ensureDB();
  const id = crypto.randomUUID();
  const created_at = now();
  const stmtO = memdb.prepare("INSERT INTO orders (id,table_id,session_id,created_at,status,payment_status,customer_name) VALUES (?,?,?,?,?,?,?)");
  stmtO.run([id, table_id, session_id, created_at, "NEW", "PENDING", customer_name || ""]);
  const stmt = memdb.prepare("INSERT INTO order_items (id,order_id,menu_item_id,quantity,price_cents) VALUES (?,?,?,?,?)");
  for (const it of items) {
    const itemId = crypto.randomUUID();
    stmt.run([itemId, id, it.menu_item_id, it.quantity, it.price_cents]);
  }
  persist();
  return { id, created_at };
}
async function getOrdersForKDS() {
  await ensureDB();
  const res = [];
  const stmt = memdb.prepare("SELECT o.*, t.name AS table_name FROM orders o JOIN tables t ON o.table_id=t.id WHERE o.payment_status='PAID' AND o.status!='SERVED' ORDER BY o.created_at DESC");
  while (stmt.step()) res.push(stmt.getAsObject());
  return res;
}
async function getOrder(order_id) {
  await ensureDB();
  const stmt = memdb.prepare("SELECT * FROM orders WHERE id=?");
  stmt.bind([order_id]);
  const ord = stmt.step() ? stmt.getAsObject() : null;
  if (!ord) return null;
  const items = await getOrderItems(order_id);
  return { ...ord, items };
}
async function listOrdersBetween(from_ts, to_ts) {
  await ensureDB();
  const res = [];
  const stmt = memdb.prepare("SELECT o.*, t.name AS table_name FROM orders o JOIN tables t ON o.table_id=t.id WHERE o.created_at>=? AND o.created_at<=? ORDER BY o.created_at DESC");
  stmt.bind([from_ts, to_ts]);
  while (stmt.step()) res.push(stmt.getAsObject());
  return res;
}
async function listPendingOrders() {
  await ensureDB();
  const res = [];
  const stmt = memdb.prepare("SELECT o.*, t.name AS table_name FROM orders o JOIN tables t ON o.table_id=t.id WHERE o.payment_status='PENDING' ORDER BY o.created_at DESC");
  while (stmt.step()) res.push(stmt.getAsObject());
  return res;
}
async function salesByDay(from_ts, to_ts) {
  await ensureDB();
  const res = [];
  const stmt = memdb.prepare("SELECT strftime('%Y-%m-%d', datetime(created_at, 'unixepoch')) AS day, SUM(amount_cents) AS total_cents, COUNT(*) AS count FROM payments WHERE status='PAID' AND created_at>=? AND created_at<=? GROUP BY day ORDER BY day");
  stmt.bind([from_ts, to_ts]);
  while (stmt.step()) res.push(stmt.getAsObject());
  return res;
}
async function getOrderItems(order_id) {
  await ensureDB();
  const res = [];
  const stmt = memdb.prepare("SELECT oi.*, m.name, m.image_url FROM order_items oi JOIN menu_items m ON oi.menu_item_id=m.id WHERE order_id=?");
  stmt.bind([order_id]);
  while (stmt.step()) res.push(stmt.getAsObject());
  return res;
}
async function updateOrderStatus(order_id, status) {
  await ensureDB();
  const stmt = memdb.prepare("UPDATE orders SET status=? WHERE id=?");
  stmt.run([status, order_id]);
  persist();
}
async function setPaymentStatus(order_id, status, method, amount_cents) {
  await ensureDB();
  const stmtE = memdb.prepare("SELECT * FROM payments WHERE order_id=?");
  stmtE.bind([order_id]);
  const exists = stmtE.step() ? stmtE.getAsObject() : null;
  if (exists && exists.id) {
    const stmtU = memdb.prepare("UPDATE payments SET status=?,method=?,amount_cents=? WHERE order_id=?");
    stmtU.run([status, method, amount_cents, order_id]);
  } else {
    const id = crypto.randomUUID();
    const stmtI = memdb.prepare("INSERT INTO payments (id,order_id,amount_cents,method,status,created_at) VALUES (?,?,?,?,?,?)");
    stmtI.run([id, order_id, amount_cents, method, status, now()]);
  }
  const stmtO = memdb.prepare("UPDATE orders SET payment_status=? WHERE id=?");
  stmtO.run([status.toUpperCase(), order_id]);
  persist();
}
async function deleteMenu(id) {
  await ensureDB();
  const d1 = memdb.prepare("DELETE FROM menu_items WHERE id=?");
  d1.run([id]);
  persist();
}
async function markOrderItemDone(order_id, item_id) {
  await ensureDB();
  const u = memdb.prepare("UPDATE order_items SET done=1 WHERE order_id=? AND id=?");
  u.run([order_id, item_id]);
  persist();
}
async function createAdmin(username, password_hash) {
  await ensureDB();
  const id = crypto.randomUUID();
  const stmt = memdb.prepare("INSERT INTO admins (id,username,password_hash,created_at) VALUES (?,?,?,?)");
  stmt.run([id, username, password_hash, now()]);
  persist();
  return id;
}
async function getAdminByUsername(username) {
  await ensureDB();
  const stmt = memdb.prepare("SELECT * FROM admins WHERE username=?");
  stmt.bind([username]);
  const res = stmt.step() ? stmt.getAsObject() : null;
  return res && res.id ? res : null;
}
async function activeTables() {
  await ensureDB();
  const res = [];
  const stmt = memdb.prepare("SELECT * FROM tables WHERE active=1");
  while (stmt.step()) res.push(stmt.getAsObject());
  return res;
}
async function pendingPaymentTables() {
  await ensureDB();
  const res = [];
  const stmt = memdb.prepare("SELECT DISTINCT t.* FROM tables t JOIN orders o ON o.table_id=t.id WHERE o.payment_status='PENDING'");
  while (stmt.step()) res.push(stmt.getAsObject());
  return res;
}
async function completedTables() {
  await ensureDB();
  const res = [];
  const stmt = memdb.prepare("SELECT DISTINCT t.* FROM tables t JOIN orders o ON o.table_id=t.id WHERE o.payment_status='PAID'");
  while (stmt.step()) res.push(stmt.getAsObject());
  return res;
}
async function listTables() {
  await ensureDB();
  const res = [];
  const stmt = memdb.prepare("SELECT * FROM tables ORDER BY created_at DESC");
  while (stmt.step()) res.push(stmt.getAsObject());
  return res;
}
async function setTableActive(table_id, active) {
  await ensureDB();
  const stmt = memdb.prepare("UPDATE tables SET active=? WHERE id=?");
  stmt.run([active ? 1 : 0, table_id]);
  persist();
}
async function deactivateTokensForTable(table_id) {
  await ensureDB();
  const stmt = memdb.prepare("UPDATE table_tokens SET active=0 WHERE table_id=?");
  stmt.run([table_id]);
  persist();
}
export default {
  hashToken,
  createTable,
  createTableToken,
  getTableByToken,
  createSession,
  getSession,
  deactivateSession,
  cleanupExpiredSessions,
  listMenu,
  upsertMenu,
  createOrder,
  getOrdersForKDS,
  getOrder,
  getOrderItems,
  updateOrderStatus,
  setPaymentStatus,
  createAdmin,
  getAdminByUsername,
  activeTables,
  pendingPaymentTables,
  completedTables,
  listTables,
  setTableActive,
  deactivateTokensForTable,
  deleteMenu,
  markOrderItemDone,
  listOrdersBetween,
  salesByDay,
  listPendingOrders
  ,
  addRating,
  listRatings,
  listVisibleRatings,
  setRatingVisible
};
