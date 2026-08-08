import singularityRouter from "./singularity";
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import ttsRouter from "./tts";
import searchRouter from "./search";
import unifiedSearchRouter from "./unified-search";
import authRouter from "./auth";
import postsRouter from "./posts";
import cosmicRouter from "./cosmic";
import biologyRouter from "./biology";
import aiSummaryRouter from "./ai-summary";
import discoveryRouter from "./discovery";
import transcribeRouter from "./transcribe";
import visualReferencesRouter from "./visual-references";
import imageSearchRouter from "./image-search";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(ttsRouter);
router.use(searchRouter);
router.use(unifiedSearchRouter);
router.use(authRouter);
router.use(postsRouter);
router.use(cosmicRouter);
router.use(biologyRouter);
router.use(aiSummaryRouter);
router.use(discoveryRouter);
router.use(transcribeRouter);
router.use(visualReferencesRouter);
router.use(imageSearchRouter);
router.use(singularityRouter);


export default router;
