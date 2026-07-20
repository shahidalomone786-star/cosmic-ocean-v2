---
name: Cosmic Intelligence Engine
description: Architecture decisions for the Phase 3 science content aggregation system integrated into Cosmos
---

## Rule
External content is stored in a separate `external_content` table (not in the `posts` table). The hybrid feed is assembled via a `UNION ALL` SQL query that merges user posts with external content in a single `GET /api/posts` call.

**Why:** Keeps user data and aggregated data separate and cleanly auditable; the UNION approach lets the existing like/bookmark/comment routes work on external content IDs without any FK enforcement changes (SQLite FK enforcement is off by default).

## How to apply
- External content IDs are prefixed: `ec_nasa_`, `ec_arxiv_`, `ec_yt_`, `ec_x_`, `ec_tg_`, `ec_wiki_`
- New `LivePost` fields added: `source`, `external_link`, `extra_json`, `ec_title` — empty strings for user posts
- Source-specific metadata lives in `extra_json` (JSON string); each card component parses it with `parseExtra()`
- Frontend dispatches via `CosmicFeedCard` (in `CosmicCards.tsx`) when `post.source` is truthy; falls back to `LiveFeedCard` for user posts
- Auto-sync runs 3s after server boot, then every 6 hours; manual trigger via `POST /api/admin/sync-cosmic`
- Each source has a hardcoded fallback pool so the feed is never empty even if external APIs are rate-limited
- `INSERT OR IGNORE` prevents duplicate rows across syncs while preserving original `created_at` timestamps
