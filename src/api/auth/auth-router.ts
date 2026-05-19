import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { FunctionsRouter } from "./functions-router.js";
import { InvokeRouter } from "./invoke/invoke-router.js";
import { SyncRouter } from "./sync/sync-router.js";

const router = new Hono();

router.use("*", bearerAuth({ token: Bun.env.ORCA_TOKEN! }));

router.route("/invoke", InvokeRouter);
router.route("/sync", SyncRouter);
router.route("/functions", FunctionsRouter);

export { router as AuthRouter };
