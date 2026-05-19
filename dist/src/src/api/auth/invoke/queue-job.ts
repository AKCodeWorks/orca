import { JobStatus } from "../../../../prisma/generated/prisma/enums.js";
import { getPrismaClient } from "../../../utils/prisma.js";
import { dispatchJob } from "../../../workers/job-runner/dispatcher.js";

type QueueJobInput = {
  functionId: string;
  args?: Record<string, unknown>;
  maxRetries?: number;
  backoffSeconds?: number;
  maxBackoffSeconds?: number;
};

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BACKOFF_SECONDS = 10;
const DEFAULT_MAX_BACKOFF_SECONDS = 30;

async function queueJob(input: QueueJobInput) {
  const db = await getPrismaClient();

  if (!Bun.env.ORCA_APP_URL) {
    throw new Error("ORCA_APP_URL environment variable is not set");
  }

  const maxRetries = input.maxRetries ?? DEFAULT_MAX_RETRIES;
  const backoffSeconds = input.backoffSeconds ?? DEFAULT_BACKOFF_SECONDS;
  const maxBackoffSeconds =
    input.maxBackoffSeconds ?? DEFAULT_MAX_BACKOFF_SECONDS;

  const fn = await db.orcaFunction.findUnique({
    where: { id: input.functionId },
  });

  const job = await db.orcaJob.create({
    data: {
      functionId: input.functionId,
      name: fn?.name ?? input.functionId,
      status: JobStatus.QUEUED,
      maxAttempts: maxRetries + 1,
      result: {
        invocation: {
          functionId: input.functionId,
          args: input.args ?? {},
          maxRetries,
          backoffSeconds,
          maxBackoffSeconds,
        },
      },
    },
  });

  dispatchJob({
    jobId: job.id,
    functionId: input.functionId,
    args: input.args,
    maxRetries,
    backoffSeconds,
    maxBackoffSeconds,
  });

  return {
    functionId: input.functionId,
    jobId: job.id,
    status: JobStatus.QUEUED,
  };
}

export { queueJob };
