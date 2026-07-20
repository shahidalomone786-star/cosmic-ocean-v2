import Database from "better-sqlite3";
import path from "node:path";

const DB_PATH =
  process.env["DB_PATH"] ?? path.join(process.cwd(), "cosmos.db");

const db = new Database(DB_PATH);

// WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    username      TEXT NOT NULL,
    avatar_url    TEXT NOT NULL DEFAULT '',
    chess_wins    INTEGER NOT NULL DEFAULT 0,
    chess_losses  INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    type       TEXT NOT NULL DEFAULT 'post',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_posts_user_id    ON posts(user_id);
  CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
`);

// ── Row types ─────────────────────────────────────────────────────────────────
export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  username: string;
  avatar_url: string;
  chess_wins: number;
  chess_losses: number;
  created_at: string;
}

export interface PostRow {
  id: string;
  user_id: string;
  content: string;
  type: string;
  created_at: string;
}

// ── Prepared statements ───────────────────────────────────────────────────────
export const stmts = {
  // users
  insertUser: db.prepare<[string, string, string, string, string]>(`
    INSERT INTO users (id, email, password_hash, username, avatar_url)
    VALUES (?, ?, ?, ?, ?)
  `),
  getUserByEmail: db.prepare<[string], UserRow>(
    `SELECT * FROM users WHERE email = ? LIMIT 1`,
  ),
  getUserById: db.prepare<[string], UserRow>(
    `SELECT * FROM users WHERE id = ? LIMIT 1`,
  ),
  updateProfile: db.prepare<[string, string, string]>(
    `UPDATE users SET username = ?, avatar_url = ? WHERE id = ?`,
  ),
  recordChessResult: db.prepare<[number, number, string]>(
    `UPDATE users SET chess_wins = chess_wins + ?, chess_losses = chess_losses + ? WHERE id = ?`,
  ),

  // posts
  insertPost: db.prepare<[string, string, string, string]>(`
    INSERT INTO posts (id, user_id, content, type)
    VALUES (?, ?, ?, ?)
  `),
  getPosts: db.prepare<[], PostRow & { author_username: string; author_avatar: string }>(`
    SELECT p.*, u.username AS author_username, u.avatar_url AS author_avatar
    FROM posts p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC
    LIMIT 50
  `),
  getPostsByUser: db.prepare<[string], PostRow>(`
    SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC
  `),
};

export default db;
