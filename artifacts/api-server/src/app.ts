import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Allow credentials so cookies flow through the shared proxy
app.use(
  cors({
    credentials: true,
    origin: true, // reflect the request origin — safe behind the Replit proxy
  }),
);
app.use(cookieParser());
// Multimodal turns contain optimized data URLs (up to five images), plus one
// retained image turn for follow-up questions. Keep the limit bounded while
// leaving room for the structured JSON envelope.
app.use(express.json({ limit: "32mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
