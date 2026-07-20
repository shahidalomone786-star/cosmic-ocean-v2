import Database from "better-sqlite3";
import path from "node:path";

const DB_PATH =
  process.env["DB_PATH"] ?? path.join(process.cwd(), "cosmos.db");

const db = new Database(DB_PATH);

// WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

// ── Core schema ───────────────────────────────────────────────────────────────
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

  CREATE TABLE IF NOT EXISTS post_likes (
    post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (post_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS post_bookmarks (
    post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (post_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS post_comments (
    id         TEXT PRIMARY KEY,
    post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_comments_post_id ON post_comments(post_id);
`);

// Add media_url column to posts if it doesn't already exist
// SQLite doesn't support IF NOT EXISTS on ALTER TABLE, so we catch the error.
try {
  db.exec(`ALTER TABLE posts ADD COLUMN media_url TEXT NOT NULL DEFAULT ''`);
} catch {
  // Column already present — ignore
}

// Add parent_comment_id to post_comments for nested replies
try {
  db.exec(`ALTER TABLE post_comments ADD COLUMN parent_comment_id TEXT REFERENCES post_comments(id) ON DELETE CASCADE`);
} catch {
  // Column already present — ignore
}

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
  media_url: string;
  created_at: string;
}

export interface EnrichedPostRow extends PostRow {
  author_username: string;
  author_avatar: string;
  like_count: number;
  comment_count: number;
}

export interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_username: string;
  author_avatar: string;
  parent_comment_id: string | null;
}

// ── Prepared statements ───────────────────────────────────────────────────────
export const stmts = {
  // ── users ──
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

  // ── posts ──
  insertPost: db.prepare<[string, string, string, string, string]>(`
    INSERT INTO posts (id, user_id, content, type, media_url)
    VALUES (?, ?, ?, ?, ?)
  `),
  getPosts: db.prepare<[], EnrichedPostRow>(`
    SELECT
      p.*,
      u.username  AS author_username,
      u.avatar_url AS author_avatar,
      COALESCE(lc.cnt, 0) AS like_count,
      COALESCE(cc.cnt, 0) AS comment_count
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN (
      SELECT post_id, COUNT(*) AS cnt FROM post_likes GROUP BY post_id
    ) lc ON lc.post_id = p.id
    LEFT JOIN (
      SELECT post_id, COUNT(*) AS cnt FROM post_comments GROUP BY post_id
    ) cc ON cc.post_id = p.id
    ORDER BY p.created_at DESC
    LIMIT 50
  `),
  getPostsByUser: db.prepare<[string], PostRow>(
    `SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC`,
  ),

  // ── likes ──
  getLike: db.prepare<[string, string], { post_id: string }>(
    `SELECT post_id FROM post_likes WHERE post_id = ? AND user_id = ? LIMIT 1`,
  ),
  insertLike: db.prepare<[string, string]>(
    `INSERT OR IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)`,
  ),
  deleteLike: db.prepare<[string, string]>(
    `DELETE FROM post_likes WHERE post_id = ? AND user_id = ?`,
  ),
  getLikedPostIds: db.prepare<[string], { post_id: string }>(
    `SELECT post_id FROM post_likes WHERE user_id = ?`,
  ),

  // ── bookmarks ──
  getBookmark: db.prepare<[string, string], { post_id: string }>(
    `SELECT post_id FROM post_bookmarks WHERE post_id = ? AND user_id = ? LIMIT 1`,
  ),
  insertBookmark: db.prepare<[string, string]>(
    `INSERT OR IGNORE INTO post_bookmarks (post_id, user_id) VALUES (?, ?)`,
  ),
  deleteBookmark: db.prepare<[string, string]>(
    `DELETE FROM post_bookmarks WHERE post_id = ? AND user_id = ?`,
  ),
  getBookmarkedPostIds: db.prepare<[string], { post_id: string }>(
    `SELECT post_id FROM post_bookmarks WHERE user_id = ?`,
  ),

  // ── comments ──
  getComments: db.prepare<[string], CommentRow>(`
    SELECT
      c.*,
      u.username   AS author_username,
      u.avatar_url AS author_avatar
    FROM post_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `),
  insertComment: db.prepare<[string, string, string, string, string | null]>(
    `INSERT INTO post_comments (id, post_id, user_id, content, parent_comment_id) VALUES (?, ?, ?, ?, ?)`,
  ),

  // ── liked posts (enriched) ──
  getLikedPosts: db.prepare<[string], EnrichedPostRow>(`
    SELECT
      p.*,
      u.username   AS author_username,
      u.avatar_url AS author_avatar,
      COALESCE(lc.cnt, 0) AS like_count,
      COALESCE(cc.cnt, 0) AS comment_count
    FROM post_likes pl
    JOIN posts p ON p.id = pl.post_id
    JOIN users u ON u.id = p.user_id
    LEFT JOIN (
      SELECT post_id, COUNT(*) AS cnt FROM post_likes GROUP BY post_id
    ) lc ON lc.post_id = p.id
    LEFT JOIN (
      SELECT post_id, COUNT(*) AS cnt FROM post_comments GROUP BY post_id
    ) cc ON cc.post_id = p.id
    WHERE pl.user_id = ?
    ORDER BY pl.created_at DESC
  `),

  // ── bookmarked posts (enriched) ──
  getBookmarkedPosts: db.prepare<[string], EnrichedPostRow>(`
    SELECT
      p.*,
      u.username   AS author_username,
      u.avatar_url AS author_avatar,
      COALESCE(lc.cnt, 0) AS like_count,
      COALESCE(cc.cnt, 0) AS comment_count
    FROM post_bookmarks pb
    JOIN posts p ON p.id = pb.post_id
    JOIN users u ON u.id = p.user_id
    LEFT JOIN (
      SELECT post_id, COUNT(*) AS cnt FROM post_likes GROUP BY post_id
    ) lc ON lc.post_id = p.id
    LEFT JOIN (
      SELECT post_id, COUNT(*) AS cnt FROM post_comments GROUP BY post_id
    ) cc ON cc.post_id = p.id
    WHERE pb.user_id = ?
    ORDER BY pb.created_at DESC
  `),
};

export default db;
