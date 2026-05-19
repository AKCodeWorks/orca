import { form, getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';

export const deleteAllRuns = form(async () => {
  const apiBase = env.ORCA_API_BASE_URL;
  const apiToken = env.ORCA_API_TOKEN;

  if (!apiBase || !apiToken) {
    throw new Error('Missing ORCA_API_BASE_URL or ORCA_API_TOKEN');
  }

  const event = getRequestEvent();
  const functionId = event.params.functionId;
  if (!functionId) {
    throw new Error('Missing function id');
  }

  const resp = await fetch(`${apiBase}/auth/functions/${functionId}/runs`, {
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
        : `Failed to delete runs (${resp.status})`;
    throw new Error(message);
  }

  return await resp.json();
});
