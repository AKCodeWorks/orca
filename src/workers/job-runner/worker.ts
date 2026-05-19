import { JobStatus } from "../../../prisma/generated/prisma/enums.js";
import { getPrismaClient } from "../../utils/prisma.js";

type DispatchJobMessage = {
  jobId: string;
  functionId: string;
  args?: Record<string, unknown>;
  maxRetries: number;
  backoffSeconds: number;
  maxBackoffSeconds: number;
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type AttemptRecord = {
  attempt: number;
  status: "COMPLETED" | "FAILED";
  at: string;
  execution: {
    startTime: string;
    endTime: string;
    totalDurationMs: number;
  };
  result?: unknown;
  error?: string;
};

function appendAttemptResult(existing: unknown, entry: AttemptRecord) {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  const prevAttempts = Array.isArray(base.attempts) ? base.attempts : [];
  return {
    ...base,
    attempts: [...prevAttempts, entry],
  };
}

self.onmessage = async (event: MessageEvent<DispatchJobMessage>) => {
  const {
    jobId,
    functionId,
    args,
    maxRetries,
    backoffSeconds,
    maxBackoffSeconds,
  } = event.data;
  const maxAttempts = maxRetries + 1;

  try {
    const db = await getPrismaClient();
    const claim = await db.orcaJob.updateMany({
      where: {
        id: jobId,
        status: JobStatus.QUEUED,
      },
      data: {
        status: JobStatus.RUNNING,
        attempts: 1,
      },
    });

    if (claim.count === 0) {
      return;
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt > 1) {
        await db.orcaJob.update({
          where: { id: jobId },
          data: {
            status: JobStatus.RUNNING,
            attempts: attempt,
          },
        });
      }

      const startedAtMs = Date.now();
      const startedAtIso = new Date(startedAtMs).toISOString();

      try {
        if (!Bun.env.ORCA_APP_URL) {
          throw new Error("ORCA_APP_URL environment variable is not set");
        }

        const resp = await fetch(Bun.env.ORCA_APP_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ functionId, args }),
        });

        if (!resp.ok) {
          throw new Error(`Upstream returned ${resp.status}`);
        }

        const json = await resp.json();
        const functionResult =
          typeof json === "object" && json !== null && "result" in json
            ? (json as { result: unknown }).result
            : json;
        const endedAtMs = Date.now();

        const currentJob = await db.orcaJob.findUnique({
          where: { id: jobId },
          select: { result: true },
        });

        await db.orcaJob.update({
          where: { id: jobId },
          data: {
            status: JobStatus.COMPLETED,
            result: appendAttemptResult(currentJob?.result, {
              attempt,
              status: "COMPLETED",
              at: new Date().toISOString(),
              execution: {
                startTime: startedAtIso,
                endTime: new Date(endedAtMs).toISOString(),
                totalDurationMs: endedAtMs - startedAtMs,
              },
              result: functionResult,
            }),
          },
        });

        return;
      } catch (error) {
        const endedAtMs = Date.now();
        const isLastAttempt = attempt >= maxAttempts;

        if (isLastAttempt) {
          const currentJob = await db.orcaJob.findUnique({
            where: { id: jobId },
            select: { result: true },
          });
          const message =
            error instanceof Error ? error.message : "Unknown error";

          await db.orcaJob.update({
            where: { id: jobId },
            data: {
              status: JobStatus.FAILED,
              result: appendAttemptResult(currentJob?.result, {
                attempt,
                status: "FAILED",
                at: new Date().toISOString(),
                execution: {
                  startTime: startedAtIso,
                  endTime: new Date(endedAtMs).toISOString(),
                  totalDurationMs: endedAtMs - startedAtMs,
                },
                error: message,
              }),
            },
          });
          return;
        }

        const currentJob = await db.orcaJob.findUnique({
          where: { id: jobId },
          select: { result: true },
        });
        const message = error instanceof Error ? error.message : "Unknown error";
        await db.orcaJob.update({
          where: { id: jobId },
          data: {
            result: appendAttemptResult(currentJob?.result, {
              attempt,
              status: "FAILED",
              at: new Date().toISOString(),
              execution: {
                startTime: startedAtIso,
                endTime: new Date(endedAtMs).toISOString(),
                totalDurationMs: endedAtMs - startedAtMs,
              },
              error: message,
            }),
          },
        });

        const delaySeconds = Math.min(
          backoffSeconds * attempt,
          maxBackoffSeconds,
        );
        await wait(delaySeconds * 1000);
      }
    }
  } catch (error) {
    console.error("job worker fatal error:", error);
    try {
      const db = await getPrismaClient();
      const currentJob = await db.orcaJob.findUnique({
        where: { id: jobId },
        select: { result: true },
      });
      const message = error instanceof Error ? error.message : "Unknown error";
      await db.orcaJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.FAILED,
          result: appendAttemptResult(currentJob?.result, {
            attempt: 0,
            status: "FAILED",
            at: new Date().toISOString(),
            error: message,
          }),
        },
      });
    } catch (updateError) {
      console.error("job worker failed to update job status:", updateError);
    }
  }
};
