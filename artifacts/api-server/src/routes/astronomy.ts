import { Router } from "express";
import {
  getAstronomyObject,
  isAstronomyCategory,
  searchAstronomy,
  searchAstronomyMap,
  suggestAstronomy,
  type AstronomyCategory,
  type AstronomySource,
} from "../lib/astronomy";

const router = Router();

router.get("/astronomy/map", async (req, res): Promise<void> => {
  const rawNumber = (value: unknown): number => {
    const candidate = Array.isArray(value) ? value[0] : value;
    return Number(candidate);
  };
  const raMin = rawNumber(req.query.raMin);
  const raMax = rawNumber(req.query.raMax);
  const decMin = rawNumber(req.query.decMin);
  const decMax = rawNumber(req.query.decMax);
  const zoom = rawNumber(req.query.zoom);
  const limitValue = rawNumber(req.query.limit);
  const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 24), 180) : 96;
  const query = String(req.query.q ?? "").trim() || undefined;
  const categoryParam = String(req.query.category ?? "").trim() || undefined;

  if (
    ![raMin, raMax, decMin, decMax, zoom].every(Number.isFinite)
    || raMin < 0 || raMin > 360
    || raMax < 0 || raMax > 360
    || decMin < -90 || decMin > 90
    || decMax < -90 || decMax > 90
    || decMin > decMax
    || zoom < 1 || zoom > 5
  ) {
    res.status(400).json({ error: "Invalid sky viewport." });
    return;
  }
  if (query && query.length < 2) {
    res.status(400).json({ error: "Map search query must be at least 2 characters." });
    return;
  }
  if (categoryParam && !isAstronomyCategory(categoryParam)) {
    res.status(400).json({ error: "Unknown astronomy category." });
    return;
  }

  try {
    const viewport = { raMin, raMax, decMin, decMax, zoom };
    const result = await searchAstronomyMap({
      query,
      category: categoryParam as AstronomyCategory | undefined,
      viewport,
      limit: Math.round(limit),
    });
    res.json({ viewport, ...result });
  } catch (error) {
    req.log.warn({ err: error }, "astronomy map query failed");
    res.status(503).json({ error: "Scientific map data temporarily unavailable." });
  }
});

router.get("/astronomy/search", async (req, res) => {
  const query = String(req.query.q ?? "").trim();
  const categoryParam = String(req.query.category ?? "").trim() || undefined;
  const pageSize = Math.min(Math.max(Number(req.query.pageSize ?? 12) || 12, 6), 24);
  const page = Math.max(1, Number(req.query.cursor ?? "1") || 1);
  const minDistance = req.query.minDistance === undefined ? undefined : Number(req.query.minDistance);
  const maxDistance = req.query.maxDistance === undefined ? undefined : Number(req.query.maxDistance);
  const discoveryYear = req.query.discoveryYear === undefined ? undefined : Number(req.query.discoveryYear);

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
      source: String(req.query.source ?? "").trim() as AstronomySource | undefined || undefined,
      objectType: String(req.query.objectType ?? "").trim() || undefined,
      minDistance: Number.isFinite(minDistance) ? minDistance : undefined,
      maxDistance: Number.isFinite(maxDistance) ? maxDistance : undefined,
      discoveryYear: Number.isFinite(discoveryYear) ? discoveryYear : undefined,
      observationSource: String(req.query.observationSource ?? "").trim() || undefined,
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

router.get("/astronomy/suggestions", async (req, res) => {
  const query = String(req.query.q ?? "").trim();
  const categoryParam = String(req.query.category ?? "").trim() || undefined;
  if (query.length < 2) {
    res.json({ query, suggestions: [] });
    return;
  }
  if (categoryParam && !isAstronomyCategory(categoryParam)) {
    res.status(400).json({ error: "Unknown astronomy category." });
    return;
  }
  try {
    const suggestions = await suggestAstronomy({
      query,
      category: categoryParam as AstronomyCategory | undefined,
    });
    res.json({ query, suggestions });
  } catch (error) {
    req.log.warn({ err: error }, "astronomy suggestions failed");
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