import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import ttsRouter from "./tts";
import searchRouter from "./search";
import authRouter from "./auth";
import postsRouter from "./posts";
import cosmicRouter from "./cosmic";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(ttsRouter);
router.use(searchRouter);
router.use(authRouter);
router.use(postsRouter);
router.use(cosmicRouter);

export default router;
