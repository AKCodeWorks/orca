import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { invokeJobSchema } from "orca-sdk";
import { JobStatus } from "../../../../prisma/generated/prisma/enums.js";
import { queueJob } from "./queue-job.js";

const router = new Hono();

router.post("/", zValidator("json", invokeJobSchema), async (c) => {
  const body = c.req.valid("json");

  try {
    const queued = await queueJob({
      functionId: body.functionId,
      args: body.args,
      maxRetries: body.maxRetries,
      backoffSeconds: body.backoffSeconds,
      maxBackoffSeconds: body.maxBackoffSeconds,
    });

    return c.json(queued);
  } catch (e) {
    console.error("Error queueing job:", e);
    return c.json(
      {
        functionId: body.functionId,
        status: JobStatus.FAILED,
        error: e instanceof Error ? e.message : "Unknown error",
      },
      500,
    );
  }
});

export { router as InvokeRouter };
