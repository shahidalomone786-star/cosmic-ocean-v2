import { Router, type Request, type Response } from "express";
import { syncAllSources } from "../lib/aggregator.js";

const router = Router();

/**
 * POST /api/admin/sync-cosmic
 * Triggers an immediate aggregation pass across all Cosmic Intelligence sources.
 * Returns per-source counts of newly inserted items.
 */
router.post("/admin/sync-cosmic", async (req: Request, res: Response) => {
  try {
    const results = await syncAllSources();
    const totalInserted = results.reduce((s, r) => s + r.inserted, 0);
    res.json({ ok: true, totalInserted, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "Sync-cosmic failed");
    res.status(500).json({ ok: false, error: message });
  }
});

export default router;
