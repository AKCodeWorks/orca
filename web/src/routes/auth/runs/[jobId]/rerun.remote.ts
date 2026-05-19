import { form, getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';

export const rerunFunction = form('unchecked', async (data: { args?: string }) => {
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

  const argsRaw = (data.args ?? '').trim() || '{}';
  let args: Record<string, unknown>;

  try {
    const parsed = JSON.parse(argsRaw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Args must be a JSON object');
    }
    args = parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Invalid JSON args');
  }

  const resp = await fetch(`${apiBase}/auth/functions/runs/${jobId}/rerun`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ args })
  });

  if (!resp.ok) {
    const json = await resp.json().catch(() => ({}));
    const message =
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error: unknown }).error)
        : `Failed to rerun (${resp.status})`;
    throw new Error(message);
  }

  const json = (await resp.json().catch(() => ({}))) as { jobId?: unknown; id?: unknown };
  const nextJobId =
    typeof json.jobId === 'string'
      ? json.jobId
      : typeof json.id === 'string'
        ? json.id
        : null;

  if (!nextJobId) {
    throw new Error('Rerun succeeded but no job id was returned');
  }

  redirect(303, `/auth/runs/${nextJobId}`);
});
