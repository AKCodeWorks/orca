import type { LayoutServerLoad } from "./$types";
import { env } from "$env/dynamic/private";

export const load: LayoutServerLoad = async ({ fetch, params, url }) => {
  const apiBase = env.ORCA_API_BASE_URL;
  const apiToken = env.ORCA_API_TOKEN;
  const showUnregistered =
    url.searchParams.get("includeUnregistered") === "1" ||
    url.searchParams.get("includeUnregistered") === "true";

  if (!apiBase || !apiToken) {
    return {
      functions: [],
      functionsError: "Missing ORCA_API_BASE_URL or ORCA_API_TOKEN",
      currentFunctionId: params.functionId ?? null,
      showUnregistered,
    };
  }

  const functionsRes = await fetch(
    `${apiBase}/auth/functions?includeUnregistered=${showUnregistered ? "1" : "0"}`,
    {
      headers: {
        authorization: `Bearer ${apiToken}`,
      },
    },
  );

  if (!functionsRes.ok) {
    return {
      functions: [],
      functionsError: `Failed to load functions (${functionsRes.status})`,
      currentFunctionId: params.functionId ?? null,
      showUnregistered,
    };
  }

  const functionsJson = (await functionsRes.json()) as {
    functions: { id: string; name: string; registered: boolean }[];
  };

  return {
    functions: functionsJson.functions,
    functionsError: null,
    currentFunctionId: params.functionId ?? null,
    showUnregistered,
  };
};
