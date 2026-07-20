import { Router } from "express";
import bcrypt from "bcryptjs";
import { stmts, type UserRow } from "../lib/db.js";
import { signToken, verifyToken, COOKIE_NAME, COOKIE_OPTS } from "../lib/jwt.js";
import type { Request, Response } from "express";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function safeUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    avatar: u.avatar_url,
    chessWins: u.chess_wins,
    chessLosses: u.chess_losses,
    joinDate: u.created_at,
  };
}

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post("/auth/signup", async (req: Request, res: Response) => {
  const { email, username, password } = req.body as {
    email?: string;
    username?: string;
    password?: string;
  };

  if (!email || !email.includes("@")) {
    res.status(400).json({ ok: false, error: "Please enter a valid email address." });
    return;
  }
  if (!username || username.trim().length < 2) {
    res.status(400).json({ ok: false, error: "Username must be at least 2 characters." });
    return;
  }
  if (!password || password.length < 6) {
    res.status(400).json({ ok: false, error: "Password must be at least 6 characters." });
    return;
  }

  const key = email.trim().toLowerCase();
  const existing = stmts.getUserByEmail.get(key);
  if (existing) {
    res.status(409).json({ ok: false, error: "An account with this email already exists." });
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const id = uid();
  const DEFAULT_AVATAR =
    "https://upload.wikimedia.org/wikipedia/commons/d/d3/Albert_Einstein_Head.jpg";

  stmts.insertUser.run(id, key, hash, username.trim(), DEFAULT_AVATAR);

  const token = signToken({ sub: id, email: key });
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);

  const user = stmts.getUserById.get(id)!;
  req.log.info({ userId: id }, "User signed up");
  res.json({ ok: true, user: safeUser(user) });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({ ok: false, error: "Email and password are required." });
    return;
  }

  const key = email.trim().toLowerCase();
  const user = stmts.getUserByEmail.get(key);

  if (!user) {
    res.status(401).json({ ok: false, error: "No account found with that email." });
    return;
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    res.status(401).json({ ok: false, error: "Incorrect password." });
    return;
  }

  const token = signToken({ sub: user.id, email: key });
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);

  req.log.info({ userId: user.id }, "User logged in");
  res.json({ ok: true, user: safeUser(user) });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post("/auth/logout", (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/auth/me", (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) {
    res.status(401).json({ ok: false, error: "Not authenticated." });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.status(401).json({ ok: false, error: "Session expired." });
    return;
  }

  const user = stmts.getUserById.get(payload.sub);
  if (!user) {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.status(401).json({ ok: false, error: "Account not found." });
    return;
  }

  res.json({ ok: true, user: safeUser(user) });
});

// ── PATCH /api/auth/profile ───────────────────────────────────────────────────
router.patch("/auth/profile", (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) { res.status(401).json({ ok: false, error: "Not authenticated." }); return; }

  const payload = verifyToken(token);
  if (!payload) { res.status(401).json({ ok: false, error: "Session expired." }); return; }

  const { username, avatar } = req.body as { username?: string; avatar?: string };
  const user = stmts.getUserById.get(payload.sub);
  if (!user) { res.status(404).json({ ok: false, error: "User not found." }); return; }

  stmts.updateProfile.run(
    username?.trim() ?? user.username,
    avatar ?? user.avatar_url,
    user.id,
  );

  const updated = stmts.getUserById.get(user.id)!;
  res.json({ ok: true, user: safeUser(updated) });
});

// ── POST /api/auth/chess ──────────────────────────────────────────────────────
router.post("/auth/chess", (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) { res.status(401).json({ ok: false, error: "Not authenticated." }); return; }

  const payload = verifyToken(token);
  if (!payload) { res.status(401).json({ ok: false, error: "Session expired." }); return; }

  const { result } = req.body as { result?: "win" | "loss" };
  if (result !== "win" && result !== "loss") {
    res.status(400).json({ ok: false, error: "result must be 'win' or 'loss'." });
    return;
  }

  stmts.recordChessResult.run(
    result === "win" ? 1 : 0,
    result === "loss" ? 1 : 0,
    payload.sub,
  );

  const user = stmts.getUserById.get(payload.sub)!;
  res.json({ ok: true, user: safeUser(user) });
});

export default router;
