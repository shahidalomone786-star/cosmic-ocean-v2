import { Router } from "express";
import {
  getAstronomyObject,
  isAstronomyCategory,
  searchAstronomy,
  type AstronomyCategory,
} from "../lib/astronomy";

const router = Router();

router.get("/astronomy/search", async (req, res) => {
  const query = String(req.query.q ?? "").trim();
  const categoryParam = String(req.query.category ?? "").trim() || undefined;
  const pageSize = Math.min(Math.max(Number(req.query.pageSize ?? 12) || 12, 6), 24);
  const page = Math.max(1, Number(req.query.cursor ?? "1") || 1);

  if (query.length < 2) {
    res.status(400).json({ error: "Search query must be at least 2 characters." });
    return;
  }
  if (categoryParam && !isAstronomyCategory(categoryParam)) {
    res.status(400).json({ error: "Unknown astronomy category." });
    return;
  }

  try {
    const result = await searchAstronomy({
      query,
      category: categoryParam as AstronomyCategory | undefined,
      page,
      pageSize,
    });
    res.json({
      query,
      category: (categoryParam ?? "universe") as AstronomyCategory,
      ...result,
      nextCursor: result.hasMore ? String(page + 1) : null,
    });
  } catch (error) {
    req.log.warn({ err: error }, "astronomy search failed");
    res.status(503).json({ error: "Scientific data temporarily unavailable." });
  }
});

router.get("/astronomy/objects/:id", async (req, res) => {
  const id = String(req.params.id);
  const categoryParam = String(req.query.category ?? "universe");
  const category = isAstronomyCategory(categoryParam) ? categoryParam : "universe";
  try {
    const item = await getAstronomyObject(id, category);
    if (!item) {
      res.status(404).json({ error: "Astronomical object not found in its source archive." });
      return;
    }
    res.json({
      item,
      sourceStatus: [{ source: item.source, status: "ready", message: null }],
    });
  } catch (error) {
    req.log.warn({ err: error }, "astronomy object lookup failed");
    res.status(503).json({ error: "Scientific data temporarily unavailable." });
  }
});

export default router;