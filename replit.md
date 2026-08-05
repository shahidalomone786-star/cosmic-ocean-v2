# Cosmos

A science social platform — AI chat, NASA/arXiv/SpaceX search, grandmaster chess, short videos, and a social feed (Cosmic Nexus).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/cosmos run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 + Framer Motion
- API: Express 5
- DB: SQLite via `better-sqlite3` (file: `cosmos.db` at cwd, configurable via `DB_PATH` env)
- Auth: JWT in httpOnly cookies (`SESSION_SECRET` required)
- AI chat: Groq (llama-3.3-70b) — GROQ_KEY_1…5
- TTS: Microsoft Edge Neural via `@andresaya/edge-tts` — no API key required
- Build: esbuild (CJS bundle) with `better-sqlite3` externalized

## Where things live

- `artifacts/cosmos/src/` — React frontend
- `artifacts/cosmos/src/store/authStore.ts` — Zustand auth store (calls real API, no localStorage passwords)
- `artifacts/cosmos/src/components/LoginScreen.tsx` — sign-in / sign-up UI
- `artifacts/api-server/src/` — Express API
- `artifacts/api-server/src/lib/db.ts` — SQLite schema + prepared statements
- `artifacts/api-server/src/lib/jwt.ts` — JWT sign/verify helpers
- `artifacts/api-server/src/routes/auth.ts` — /api/auth/* (signup, login, logout, me, profile, chess)
- `artifacts/api-server/src/routes/posts.ts` — /api/posts (GET list, POST create)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for codegen)

## Auth flow

1. Signup/Login → Express hashes password with bcryptjs, signs JWT, sets `cosmos_session` httpOnly cookie.
2. On app mount, frontend calls `GET /api/auth/me` to restore session from cookie.
3. Logout clears the cookie and resets Zustand state.
4. Chess results and profile updates persist to SQLite via `/api/auth/chess` and `/api/auth/profile`.

## Architecture decisions

- `better-sqlite3` for SQLite: synchronous API, zero config, single-file DB. Native build requires Python (available via `~/.nix-profile/bin/python3`); run `PYTHON=$HOME/.nix-profile/bin/python3 npm run install` in its package dir if the `.node` file is missing after a fresh install.
- JWT in httpOnly cookies (not localStorage) prevents XSS token theft.
- `onlyBuiltDependencies` in `pnpm-workspace.yaml` must include `better-sqlite3` for its build scripts to run.
- Zustand `persist` stores only the safe user profile (no passwords); real auth state is always validated against the API on mount.

## Product

Science social platform with: AI avatars (Einstein, Feynman), NASA/arXiv/SpaceX/CERN search, grandmaster chess, cosmic 3D backgrounds, short-video feed, Cosmic Nexus social hub (Home/Search/Chat/Profile tabs), light/dark mode, multi-language support.

## User preferences

_Populate as explicit preferences are stated._

## Gotchas

- `better-sqlite3` is externalized in esbuild — it runs from `node_modules` at runtime, not bundled.
- After `pnpm install` on a fresh clone, run the `better-sqlite3` build manually (see Architecture decisions).
- Never run `pnpm dev` at the workspace root — use workflows or per-package `pnpm --filter` commands.
- DB file `cosmos.db` is created in the API server's working directory (usually the monorepo root).
