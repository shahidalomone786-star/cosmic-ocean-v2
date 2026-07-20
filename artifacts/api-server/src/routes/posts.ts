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

// ── GET /api/posts ─────────────────────────────────────────────────────────────
router.get("/posts", (_req: Request, res: Response) => {
  const posts = stmts.getPosts.all();
  res.json({ ok: true, posts });
});

// ── POST /api/posts ────────────────────────────────────────────────────────────
router.post("/posts", (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) {
    res.status(401).json({ ok: false, error: "Not authenticated." });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ ok: false, error: "Session expired." });
    return;
  }

  const { content, type = "post" } = req.body as {
    content?: string;
    type?: string;
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
  stmts.insertPost.run(id, payload.sub, content.trim(), type);

  req.log.info({ postId: id, userId: payload.sub }, "Post created");
  res.status(201).json({ ok: true, postId: id });
});

export default router;
