import { env } from "$env/dynamic/private";
import { query } from "$app/server";
import { codeToHtml } from "shiki";

type RunDetailsInput = {
  jobId: string;
};

type RunDetailsOutput = {
  run: {
    id: string;
    functionId: string;
    name: string;
    status: string;
    attempts: number;
    maxAttempts: number;
    result: unknown;
    createdAt: string;
    updatedAt: string;
  };
  highlightedResultLight: string;
  highlightedResultDark: string;
  initialArgs: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isTerminalStatus = (status: string) => status === "COMPLETED" || status === "FAILED";

export const getRunDetails = query.live("unchecked", async function* (input: RunDetailsInput) {
  const apiBase = env.ORCA_API_BASE_URL;
  const apiToken = env.ORCA_API_TOKEN;

  if (!apiBase || !apiToken) {
    throw new Error("Missing ORCA_API_BASE_URL or ORCA_API_TOKEN");
  }

  if (!input?.jobId || typeof input.jobId !== "string") {
    throw new Error("Missing job id");
  }

  let previousSerializedResult = "";
  let highlightedResultLight = "";
  let highlightedResultDark = "";

  while (true) {
    const runRes = await fetch(`${apiBase}/auth/functions/runs/${input.jobId}`, {
      headers: {
        authorization: `Bearer ${apiToken}`,
      },
    });

    if (!runRes.ok) {
      throw new Error(`Failed to load run (${runRes.status})`);
    }

    const runJson = (await runRes.json()) as { run: RunDetailsOutput["run"] };
    const run = runJson.run;

    const serializedResult = JSON.stringify(run.result ?? null, null, 2);
    if (serializedResult !== previousSerializedResult) {
      previousSerializedResult = serializedResult;
      [highlightedResultLight, highlightedResultDark] = await Promise.all([
        codeToHtml(serializedResult, { lang: "json", theme: "github-light" }),
        codeToHtml(serializedResult, { lang: "json", theme: "github-dark" }),
      ]);
    }

    const invocationArgs =
      run.result && typeof run.result === "object"
        ? (run.result as { invocation?: { args?: unknown } }).invocation?.args
        : undefined;

    yield {
      run,
      highlightedResultLight,
      highlightedResultDark,
      initialArgs: JSON.stringify(
        invocationArgs && typeof invocationArgs === "object" && !Array.isArray(invocationArgs)
          ? invocationArgs
          : {},
        null,
        2,
      ),
    } satisfies RunDetailsOutput;

    if (isTerminalStatus(run.status)) {
      return;
    }

    await sleep(1000);
  }
});
