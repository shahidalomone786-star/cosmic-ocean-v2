import { Router } from "express";
import { stmts } from "../lib/db.js";
import { verifyToken, COOKIE_NAME } from "../lib/jwt.js";
import type { Request, Response } from "express";

const router = Router();

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const VALID_TYPES = ["post", "short-video", "article", "long-video"] as const;
type PostType = (typeof VALID_TYPES)[number];

// ── Helper: resolve authed user from cookie (returns null if unauthenticated) ─
function getAuthUserId(req: Request): string | null {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.sub ?? null;
}

// ── Helper: require auth, send 401 and return null on failure ─────────────────
function requireAuth(req: Request, res: Response): string | null {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ ok: false, error: "Not authenticated." });
    return null;
  }
  return userId;
}

// ── GET /api/posts ─────────────────────────────────────────────────────────────
router.get("/posts", (req: Request, res: Response) => {
  const posts = stmts.getPosts.all();
  const userId = getAuthUserId(req);

  let likedSet   = new Set<string>();
  let savedSet   = new Set<string>();

  if (userId) {
    stmts.getLikedPostIds.all(userId).forEach(r => likedSet.add(r.post_id));
    stmts.getBookmarkedPostIds.all(userId).forEach(r => savedSet.add(r.post_id));
  }

  const enriched = posts.map(p => ({
    ...p,
    user_liked:      likedSet.has(p.id),
    user_bookmarked: savedSet.has(p.id),
  }));

  res.json({ ok: true, posts: enriched });
});

// ── POST /api/posts ────────────────────────────────────────────────────────────
router.post("/posts", (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { content, type = "post", mediaUrl = "" } = req.body as {
    content?:  string;
    type?:     string;
    mediaUrl?: string;
  };

  if (!content || content.trim().length === 0) {
    res.status(400).json({ ok: false, error: "Post content cannot be empty." });
    return;
  }
  if (!VALID_TYPES.includes(type as PostType)) {
    res.status(400).json({ ok: false, error: `type must be one of: ${VALID_TYPES.join(", ")}` });
    return;
  }

  const id = uid();
  stmts.insertPost.run(id, userId, content.trim(), type, (mediaUrl ?? "").trim());

  req.log.info({ postId: id, userId }, "Post created");
  res.status(201).json({ ok: true, postId: id });
});

// ── POST /api/posts/:id/like  (toggle) ────────────────────────────────────────
router.post("/posts/:id/like", (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const postId = String(req.params["id"]);
  const existing = stmts.getLike.get(postId, userId);

  if (existing) {
    stmts.deleteLike.run(postId, userId);
    res.json({ ok: true, liked: false });
  } else {
    stmts.insertLike.run(postId, userId);
    res.json({ ok: true, liked: true });
  }
});

// ── POST /api/posts/:id/bookmark  (toggle) ────────────────────────────────────
router.post("/posts/:id/bookmark", (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const postId = String(req.params["id"]);
  const existing = stmts.getBookmark.get(postId, userId);

  if (existing) {
    stmts.deleteBookmark.run(postId, userId);
    res.json({ ok: true, bookmarked: false });
  } else {
    stmts.insertBookmark.run(postId, userId);
    res.json({ ok: true, bookmarked: true });
  }
});

// ── GET /api/posts/:id/comments ───────────────────────────────────────────────
router.get("/posts/:id/comments", (req: Request, res: Response) => {
  const postId   = String(req.params["id"]);
  const comments = stmts.getComments.all(postId);
  res.json({ ok: true, comments });
});

// ── POST /api/posts/:id/comments ─────────────────────────────────────────────
router.post("/posts/:id/comments", (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const postId = String(req.params["id"]);
  const { content } = req.body as { content?: string };

  if (!content || content.trim().length === 0) {
    res.status(400).json({ ok: false, error: "Comment cannot be empty." });
    return;
  }
  if (content.length > 500) {
    res.status(400).json({ ok: false, error: "Comment must be under 500 characters." });
    return;
  }

  const id = uid();
  stmts.insertComment.run(id, postId, userId, content.trim());

  // Return the full comment with author info
  const comment = stmts.getComments.all(postId).find(c => c.id === id);
  req.log.info({ commentId: id, postId, userId }, "Comment created");
  res.status(201).json({ ok: true, comment });
});

export default router;
