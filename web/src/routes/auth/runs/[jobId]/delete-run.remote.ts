import { redirect } from '@sveltejs/kit';
import { form, getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';

export const deleteRun = form(async () => {
  const apiBase = env.ORCA_API_BASE_URL;
  const apiToken = env.ORCA_API_TOKEN;

  if (!apiBase || !apiToken) {
    throw new Error('Missing ORCA_API_BASE_URL or ORCA_API_TOKEN');
  }

  const event = getRequestEvent();
  const jobId = event.params.jobId;
  if (!jobId) {
    throw new Error('Missing job id');
  }

  const runRes = await fetch(`${apiBase}/auth/functions/runs/${jobId}`, {
    headers: {
      authorization: `Bearer ${apiToken}`,
    },
  });

  if (!runRes.ok) {
    throw new Error(`Failed to find run (${runRes.status})`);
  }

  const runJson = (await runRes.json()) as { run: { functionId: string } };

  const resp = await fetch(`${apiBase}/auth/functions/runs/${jobId}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${apiToken}`,
    },
  });

  if (!resp.ok) {
    const json = await resp.json().catch(() => ({}));
    const message =
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error: unknown }).error)
        : `Failed to delete run (${resp.status})`;
    throw new Error(message);
  }

  redirect(303, `/auth/functions/${runJson.run.functionId}`);
});
