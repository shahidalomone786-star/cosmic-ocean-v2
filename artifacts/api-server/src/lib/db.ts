import Database from "better-sqlite3";
import path from "node:path";

const DB_PATH =
  process.env["DB_PATH"] ?? path.join(process.cwd(), "cosmos.db");

// IMPORTANT: The DB file at DB_PATH is the persistent store for all user
// accounts, posts, likes, and bookmarks. NEVER drop, truncate, or DELETE FROM
// the `users` table in any migration or sync path. All schema changes must use
// ADD COLUMN or CREATE TABLE IF NOT EXISTS — never DROP TABLE or recreate.
const db = new Database(DB_PATH);

// WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
// Foreign keys are OFF by default in SQLite — keep them off to allow
// external_content IDs to be used in post_likes/post_bookmarks.
db.pragma("foreign_keys = OFF");

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
    post_id    TEXT NOT NULL,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (post_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS post_bookmarks (
    post_id    TEXT NOT NULL,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (post_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS post_comments (
    id         TEXT PRIMARY KEY,
    post_id    TEXT NOT NULL,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_comments_post_id ON post_comments(post_id);

  CREATE TABLE IF NOT EXISTS external_content (
    id            TEXT PRIMARY KEY,
    source        TEXT NOT NULL,
    title         TEXT NOT NULL DEFAULT '',
    content       TEXT NOT NULL DEFAULT '',
    media_url     TEXT NOT NULL DEFAULT '',
    external_link TEXT NOT NULL DEFAULT '',
    type          TEXT NOT NULL DEFAULT 'post',
    extra_json    TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_external_source     ON external_content(source);
  CREATE INDEX IF NOT EXISTS idx_external_created_at ON external_content(created_at DESC);
`);

// Additive migrations — catch-on-duplicate pattern
const migrations = [
  `ALTER TABLE posts ADD COLUMN media_url TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE post_comments ADD COLUMN parent_comment_id TEXT REFERENCES post_comments(id) ON DELETE CASCADE`,
];
for (const sql of migrations) {
  try { db.exec(sql); } catch { /* already present */ }
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
  author_avatar:   string;
  like_count:      number;
  comment_count:   number;
  // External-content fields ('' for user posts)
  source:          string;
  external_link:   string;
  extra_json:      string;
  ec_title:        string;
}

export interface CommentRow {
  id:                string;
  post_id:           string;
  user_id:           string;
  content:           string;
  created_at:        string;
  author_username:   string;
  author_avatar:     string;
  parent_comment_id: string | null;
}

export interface ExternalContentRow {
  id:            string;
  source:        string;
  title:         string;
  content:       string;
  media_url:     string;
  external_link: string;
  type:          string;
  extra_json:    string;
  created_at:    string;
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

  // Hybrid feed: UNION of user posts + external_content, sorted newest first
  getPosts: db.prepare<[], EnrichedPostRow>(`
    SELECT
      p.id,
      p.user_id,
      p.content,
      p.type,
      p.media_url,
      p.created_at,
      u.username   AS author_username,
      u.avatar_url AS author_avatar,
      COALESCE(lc.cnt, 0) AS like_count,
      COALESCE(cc.cnt, 0) AS comment_count,
      '' AS source,
      '' AS external_link,
      '' AS extra_json,
      '' AS ec_title
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN (
      SELECT post_id, COUNT(*) AS cnt FROM post_likes GROUP BY post_id
    ) lc ON lc.post_id = p.id
    LEFT JOIN (
      SELECT post_id, COUNT(*) AS cnt FROM post_comments GROUP BY post_id
    ) cc ON cc.post_id = p.id

    UNION ALL

    SELECT
      ec.id,
      'external'   AS user_id,
      ec.content,
      ec.type,
      ec.media_url,
      ec.created_at,
      ec.source    AS author_username,
      ''           AS author_avatar,
      COALESCE(lc2.cnt, 0) AS like_count,
      COALESCE(cc2.cnt, 0) AS comment_count,
      ec.source,
      ec.external_link,
      ec.extra_json,
      ec.title     AS ec_title
    FROM external_content ec
    LEFT JOIN (
      SELECT post_id, COUNT(*) AS cnt FROM post_likes GROUP BY post_id
    ) lc2 ON lc2.post_id = ec.id
    LEFT JOIN (
      SELECT post_id, COUNT(*) AS cnt FROM post_comments GROUP BY post_id
    ) cc2 ON cc2.post_id = ec.id

    ORDER BY 6 DESC
    LIMIT 500
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

  // ── liked posts (enriched — user posts + external content) ──
  getLikedPosts: db.prepare<[string, string], EnrichedPostRow>(`
    SELECT
      p.id, p.user_id, p.content, p.type, p.media_url, p.created_at,
      u.username   AS author_username,
      u.avatar_url AS author_avatar,
      COALESCE(lc.cnt, 0) AS like_count,
      COALESCE(cc.cnt, 0) AS comment_count,
      '' AS source, '' AS external_link, '' AS extra_json, '' AS ec_title
    FROM post_likes pl
    JOIN posts p ON p.id = pl.post_id
    JOIN users u ON u.id = p.user_id
    LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM post_likes GROUP BY post_id) lc ON lc.post_id = p.id
    LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM post_comments GROUP BY post_id) cc ON cc.post_id = p.id
    WHERE pl.user_id = ?

    UNION ALL

    SELECT
      ec.id, 'external' AS user_id, ec.content, ec.type, ec.media_url, ec.created_at,
      ec.source AS author_username,
      ''        AS author_avatar,
      COALESCE(lc2.cnt, 0) AS like_count,
      COALESCE(cc2.cnt, 0) AS comment_count,
      ec.source, ec.external_link, ec.extra_json, ec.title AS ec_title
    FROM post_likes pl2
    JOIN external_content ec ON ec.id = pl2.post_id
    LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM post_likes GROUP BY post_id) lc2 ON lc2.post_id = ec.id
    LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM post_comments GROUP BY post_id) cc2 ON cc2.post_id = ec.id
    WHERE pl2.user_id = ?

    ORDER BY 6 DESC
  `),

  // ── bookmarked posts (enriched — user posts + external content) ──
  getBookmarkedPosts: db.prepare<[string, string], EnrichedPostRow>(`
    SELECT
      p.id, p.user_id, p.content, p.type, p.media_url, p.created_at,
      u.username   AS author_username,
      u.avatar_url AS author_avatar,
      COALESCE(lc.cnt, 0) AS like_count,
      COALESCE(cc.cnt, 0) AS comment_count,
      '' AS source, '' AS external_link, '' AS extra_json, '' AS ec_title
    FROM post_bookmarks pb
    JOIN posts p ON p.id = pb.post_id
    JOIN users u ON u.id = p.user_id
    LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM post_likes GROUP BY post_id) lc ON lc.post_id = p.id
    LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM post_comments GROUP BY post_id) cc ON cc.post_id = p.id
    WHERE pb.user_id = ?

    UNION ALL

    SELECT
      ec.id, 'external' AS user_id, ec.content, ec.type, ec.media_url, ec.created_at,
      ec.source AS author_username,
      ''        AS author_avatar,
      COALESCE(lc2.cnt, 0) AS like_count,
      COALESCE(cc2.cnt, 0) AS comment_count,
      ec.source, ec.external_link, ec.extra_json, ec.title AS ec_title
    FROM post_bookmarks pb2
    JOIN external_content ec ON ec.id = pb2.post_id
    LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM post_likes GROUP BY post_id) lc2 ON lc2.post_id = ec.id
    LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM post_comments GROUP BY post_id) cc2 ON cc2.post_id = ec.id
    WHERE pb2.user_id = ?

    ORDER BY 6 DESC
  `),

  // ── external content ──
  upsertExternalContent: db.prepare<[string, string, string, string, string, string, string, string, string]>(`
    INSERT OR IGNORE INTO external_content
      (id, source, title, content, media_url, external_link, type, extra_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  // Plain INSERT — use after an explicit DELETE so there is nothing to conflict with.
  // Preferred over INSERT OR IGNORE in flows that delete-then-reinsert (e.g. fetchVideoPool).
  insertExternalContent: db.prepare<[string, string, string, string, string, string, string, string, string]>(`
    INSERT INTO external_content
      (id, source, title, content, media_url, external_link, type, extra_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getExternalCountBySource: db.prepare<[string], { cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM external_content WHERE source = ?`,
  ),
  deleteOldExternal: db.prepare<[string, string]>(
    `DELETE FROM external_content WHERE source = ? AND created_at < ?`,
  ),
};

export default db;
