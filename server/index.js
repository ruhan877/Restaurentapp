import "dotenv/config";
import express from "express";
import http from "http";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Server as SocketIOServer } from "socket.io";
import db from "./db/index.js";
import tablesRouter from "./routes/tables.js";
import sessionsRouter from "./routes/sessions.js";
import menuRouter from "./routes/menu.js";
import ordersRouter from "./routes/orders.js";
import adminRouter from "./routes/admin.js";
import ratingsRouter from "./routes/ratings.js";
const app = express();
app.use(helmet());
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));
// Serve status assets from public directory
const statusAssetsDir = path.join(__dirname, "..", "public", "status-assets", "GIF");
if (fs.existsSync(statusAssetsDir)) {
  app.use("/status-assets/GIF", express.static(statusAssetsDir));
}
// Public status assets
app.get("/assets/status", (req, res) => {
  const cfg = path.join(uploadsDir, "status_assets.json");
  const getAsset = (name) => {
    const mp4 = path.join(statusAssetsDir, `${name}.mp4`);
    const gif = path.join(statusAssetsDir, `${name}.gif`);
    if (fs.existsSync(mp4)) return `/status-assets/GIF/${name}.mp4`;
    if (fs.existsSync(gif)) return `/status-assets/GIF/${name}.gif`;
    return `/images/${name}.gif`;
  };
  let data = { 
    cooking: getAsset("cooking"), 
    ready: getAsset("ready"), 
    served: getAsset("served") 
  };
  if (fs.existsSync(cfg)) {
    try { 
      const stored = JSON.parse(fs.readFileSync(cfg, "utf8")); 
      if (stored.cooking) data.cooking = stored.cooking;
      if (stored.ready) data.ready = stored.ready;
      if (stored.served) data.served = stored.served;
    } catch {}
  }
  res.json(data);
});
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: "*" } });
io.on("connection", () => {});
app.use("/tables", tablesRouter);
app.use("/sessions", sessionsRouter);
app.use("/menu", menuRouter);
app.use("/orders", ordersRouter);
app.use("/admin", adminRouter);
app.use("/ratings", ratingsRouter);
app.put("/menu/:id/availability", async (req, res) => {
  const id = req.params.id;
  const { available } = req.body || {};
  await db.upsertMenu({ id, available: !!available });
  io.emit("menu:availability", { id, available: !!available });
  res.json({ ok: true });
});
app.put("/kds/orders/:id/status", async (req, res) => {
  const id = req.params.id;
  const { status } = req.body || {};
  await db.updateOrderStatus(id, status.toUpperCase());
  io.emit("order:status", { id, status: status.toUpperCase() });
  res.json({ ok: true });
});
// Global JSON parse error handler
app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "invalid_json" });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "invalid_json" });
  }
  next(err);
});
// Final error handler with logging
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error("Unhandled error:", err && err.stack ? err.stack : err);
  res.status(500).json({ error: "server_error" });
});
setInterval(() => {
  db.cleanupExpiredSessions();
}, 60000);
const port = process.env.PORT || 4000;
server.listen(port, () => {});
