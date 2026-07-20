import app from "./app";
import { logger } from "./lib/logger";
import { syncAllSources } from "./lib/aggregator";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // ── Cosmic Intelligence Engine — auto-sync ────────────────────────────────
  // Run an initial sync shortly after startup, then every 6 hours.
  const runSync = () => {
    syncAllSources().catch((e) =>
      logger.error({ err: e }, "Cosmic background sync error"),
    );
  };

  setTimeout(runSync, 3_000);                   // first sync 3s after boot
  setInterval(runSync, 6 * 60 * 60 * 1_000);    // refresh every 6 hours
});
