import { Router, type IRouter } from "express";
import { GallerySearchQueryParams, GallerySearchResponse } from "@workspace/api-zod";
import { isAdultQuery, searchGallery } from "../lib/gallery/search";

const router: IRouter = Router();

router.get("/gallery/search", async (req, res): Promise<void> => {
  const parsed = GallerySearchQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const requestedProviderIds = typeof parsed.data.providers === "string"
    ? parsed.data.providers.split(",").map((value) => value.trim()).filter(Boolean)
    : undefined;
  const result = await searchGallery({
    query: parsed.data.q.trim(),
    page: parsed.data.page,
    limit: parsed.data.limit,
    safeSearch: !isAdultQuery(parsed.data.q.trim()),
    category: parsed.data.category,
    media: parsed.data.media,
    license: parsed.data.license,
    quality: parsed.data.quality,
    orientation: parsed.data.orientation,
  }, requestedProviderIds);

  res.json(GallerySearchResponse.parse({
    query: parsed.data.q.trim(),
    page: parsed.data.page,
    items: result.items,
    providerStatus: result.providerStatus,
    hasMore: result.hasMore,
  }));
});

export default router;