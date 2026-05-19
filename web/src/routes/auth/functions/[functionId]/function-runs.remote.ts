import { env } from '$env/dynamic/private';
import { query } from '$app/server';

type FunctionRunsInput = {
	functionId: string;
	page: number;
	pageSize: number;
};

type FunctionRunsOutput = {
	selectedFunctionId: string;
	function: {
		id: string;
		name: string;
		registered: boolean;
	} | null;
	runs: {
		id: string;
		functionId: string;
		name: string;
		status: string;
		attempts: number;
		maxAttempts: number;
		result: unknown;
		createdAt: string;
		updatedAt: string;
	}[];
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getFunctionRuns = query.live('unchecked', async function* (input: FunctionRunsInput) {
	const apiBase = env.ORCA_API_BASE_URL;
	const apiToken = env.ORCA_API_TOKEN;

	if (!apiBase || !apiToken) {
		throw new Error('Missing ORCA_API_BASE_URL or ORCA_API_TOKEN');
	}

	if (!input?.functionId || typeof input.functionId !== 'string') {
		throw new Error('Missing function id');
	}

	const page = Math.max(1, Number(input.page ?? 1) || 1);
	const pageSize = Math.max(1, Math.min(100, Number(input.pageSize ?? 25) || 25));

	while (true) {
		const runsRes = await fetch(
			`${apiBase}/auth/functions/${input.functionId}/runs?page=${page}&pageSize=${pageSize}`,
			{
				headers: {
					authorization: `Bearer ${apiToken}`
				}
			}
		);

		if (!runsRes.ok) {
			throw new Error(`Failed to load runs (${runsRes.status})`);
		}

		const runsJson = (await runsRes.json()) as {
			function: FunctionRunsOutput['function'];
			runs: FunctionRunsOutput['runs'];
			page: number;
			pageSize: number;
			total: number;
			totalPages: number;
		};

		yield {
			selectedFunctionId: input.functionId,
			function: runsJson.function,
			runs: runsJson.runs,
			page: runsJson.page,
			pageSize: runsJson.pageSize,
			total: runsJson.total,
			totalPages: runsJson.totalPages
		} satisfies FunctionRunsOutput;

		await sleep(1000);
	}
});
