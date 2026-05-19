import { query } from '$app/server';
import { env } from '$env/dynamic/private';

type RunsQueryInput = {
  page?: number;
  pageSize?: number;
};

type RunRow = {
  id: string;
  functionId: string;
  name: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  result: unknown;
  createdAt: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getRunsPage = query.live('unchecked', async function* (input: RunsQueryInput) {
  const apiBase = env.ORCA_API_BASE_URL;
  const apiToken = env.ORCA_API_TOKEN;

  if (!apiBase || !apiToken) {
    throw new Error('Missing ORCA_API_BASE_URL or ORCA_API_TOKEN');
  }

  const page = Math.max(1, input?.page ?? 1);
  const pageSize = Math.max(1, Math.min(input?.pageSize ?? 10, 100));

  while (true) {
    const runsResp = await fetch(`${apiBase}/auth/functions/runs?page=${page}&pageSize=${pageSize}`, {
      headers: { authorization: `Bearer ${apiToken}` }
    });

    if (!runsResp.ok) {
      throw new Error(`Failed to load runs (${runsResp.status})`);
    }

    const runsJson = (await runsResp.json()) as {
      runs: RunRow[];
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };

    yield {
      items: runsJson.runs,
      page: runsJson.page,
      pageSize: runsJson.pageSize,
      total: runsJson.total,
      totalPages: runsJson.totalPages,
    };

    await sleep(1000);
  }
});
