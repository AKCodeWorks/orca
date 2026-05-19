import type { RequestHandler } from './$types';
import { orca } from '$lib/server/orca';

export const GET: RequestHandler = async () => {
	return orca.GET();
};

export const POST: RequestHandler = async ({ request }) => {
	return orca.POST(request);
};
