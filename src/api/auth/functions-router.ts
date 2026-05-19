import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z4 from "zod/v4";
import { JobStatus } from "../../../prisma/generated/prisma/enums.js";
import { getPrismaClient } from "../../utils/prisma.js";
import { queueJob } from "./invoke/queue-job.js";

const router = new Hono();

const invokeArgsSchema = z4.object({
  args: z4.record(z4.string(), z4.unknown()).optional(),
  maxRetries: z4.number().int().min(0).optional(),
  backoffSeconds: z4.number().int().min(1).optional(),
  maxBackoffSeconds: z4.number().int().min(1).optional(),
});

router.get("/", async (c) => {
  try {
    const db = await getPrismaClient();
    const includeUnregistered =
      c.req.query("includeUnregistered") === "true" ||
      c.req.query("includeUnregistered") === "1";
    const functions = await db.orcaFunction.findMany({
      where: includeUnregistered ? undefined : { registered: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        registered: true,
      },
    });

    return c.json({ functions });
  } catch (error) {
    console.error("Error fetching functions:", error);
    return c.json({ error: "Failed to fetch functions" }, 500);
  }
});

router.post("/:functionId/invoke", zValidator("json", invokeArgsSchema), async (c) => {
  const body = c.req.valid("json");
  const functionId = c.req.param("functionId");

  try {
    const queued = await queueJob({
      functionId,
      args: body.args,
      maxRetries: body.maxRetries,
      backoffSeconds: body.backoffSeconds,
      maxBackoffSeconds: body.maxBackoffSeconds,
    });

    return c.json(queued);
  } catch (error) {
    console.error("Error invoking function:", error);
    return c.json(
      {
        functionId,
        status: JobStatus.FAILED,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

router.post("/runs/:jobId/rerun", zValidator("json", invokeArgsSchema), async (c) => {
  const body = c.req.valid("json");
  const jobId = c.req.param("jobId");

  try {
    const db = await getPrismaClient();
    const run = await db.orcaJob.findUnique({
      where: { id: jobId },
      select: {
        functionId: true,
        result: true,
      },
    });

    if (!run) {
      return c.json({ error: "Run not found" }, 404);
    }

    const previousArgs =
      run.result && typeof run.result === "object"
        ? (run.result as { invocation?: { args?: Record<string, unknown> } }).invocation?.args
        : undefined;

    const queued = await queueJob({
      functionId: run.functionId,
      args: body.args ?? previousArgs ?? {},
      maxRetries: body.maxRetries,
      backoffSeconds: body.backoffSeconds,
      maxBackoffSeconds: body.maxBackoffSeconds,
    });

    return c.json({ ...queued, sourceJobId: jobId });
  } catch (error) {
    console.error("Error rerunning function:", error);
    return c.json({ error: "Failed to rerun function" }, 500);
  }
});

router.get("/:functionId/runs", async (c) => {
  try {
    const db = await getPrismaClient();
    const functionId = c.req.param("functionId");
    const page = Math.max(1, Number(c.req.query("page") ?? "1") || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(c.req.query("pageSize") ?? "25") || 25),
    );
    const skip = (page - 1) * pageSize;

    const [fn, total, runs] = await Promise.all([
      db.orcaFunction.findUnique({
        where: { id: functionId },
        select: { id: true, name: true, registered: true },
      }),
      db.orcaJob.count({ where: { functionId } }),
      db.orcaJob.findMany({
        where: { functionId },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          functionId: true,
          name: true,
          status: true,
          attempts: true,
          maxAttempts: true,
          result: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    if (!fn) {
      return c.json({ error: "Function not found" }, 404);
    }

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return c.json({ function: fn, runs, page, pageSize, total, totalPages });
  } catch (error) {
    console.error("Error fetching runs:", error);
    return c.json({ error: "Failed to fetch runs" }, 500);
  }
});

router.get("/runs", async (c) => {
  try {
    const db = await getPrismaClient();
    const page = Math.max(1, Number(c.req.query("page") ?? "1") || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(c.req.query("pageSize") ?? "10") || 10),
    );
    const skip = (page - 1) * pageSize;

    const [total, runs] = await Promise.all([
      db.orcaJob.count(),
      db.orcaJob.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          functionId: true,
          name: true,
          status: true,
          attempts: true,
          maxAttempts: true,
          result: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return c.json({
      runs,
      page,
      pageSize,
      total,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching all runs:", error);
    return c.json({ error: "Failed to fetch runs" }, 500);
  }
});

router.get("/runs/:jobId", async (c) => {
  try {
    const db = await getPrismaClient();
    const jobId = c.req.param("jobId");

    const run = await db.orcaJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        functionId: true,
        name: true,
        status: true,
        attempts: true,
        maxAttempts: true,
        result: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!run) {
      return c.json({ error: "Run not found" }, 404);
    }

    return c.json({ run });
  } catch (error) {
    console.error("Error fetching run:", error);
    return c.json({ error: "Failed to fetch run" }, 500);
  }
});

router.delete("/runs/:jobId", async (c) => {
  try {
    const db = await getPrismaClient();
    const jobId = c.req.param("jobId");

    const existing = await db.orcaJob.findUnique({
      where: { id: jobId },
      select: { id: true, functionId: true },
    });

    if (!existing) {
      return c.json({ error: "Run not found" }, 404);
    }

    await db.orcaJob.delete({ where: { id: jobId } });
    return c.json({ deleted: true, jobId, functionId: existing.functionId });
  } catch (error) {
    console.error("Error deleting run:", error);
    return c.json({ error: "Failed to delete run" }, 500);
  }
});

router.delete("/:functionId/runs", async (c) => {
  try {
    const db = await getPrismaClient();
    const functionId = c.req.param("functionId");

    const result = await db.orcaJob.deleteMany({
      where: { functionId },
    });

    return c.json({ deleted: result.count, functionId });
  } catch (error) {
    console.error("Error deleting function runs:", error);
    return c.json({ error: "Failed to delete runs" }, 500);
  }
});

export { router as FunctionsRouter };
