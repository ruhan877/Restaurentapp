import express from "express";
import db from "../db/index.js";
const router = express.Router();
router.post("/", async (req, res) => {
  const { name, score, comment, email, phone, dish } = req.body || {};
  if (!score) return res.status(400).json({ error: "invalid" });
  const id = await db.addRating(name, score, comment, email, phone, dish);
  res.json({ id });
});
router.get("/visible", async (req, res) => {
  const rows = await db.listVisibleRatings();
  res.json(rows);
});
export default router;
