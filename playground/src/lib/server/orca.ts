import { env } from '$env/dynamic/private';
import { OrcaClient } from 'orca-sdk';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const shouldFail = (probability: number) => Math.random() < probability;

const helloWorld = OrcaClient.defineFunction({
	id: 'helloWorld',
	name: 'Hello World',
	handler: async () => {
		return { message: 'Hello from Orca playground' };
	}
});

const addNumbers = OrcaClient.defineFunction({
	id: 'addNumbers',
	name: 'Add Numbers',
	handler: async ({ a, b }: { a: number; b: number }) => {
		if (shouldFail(0.35)) {
			throw new Error('Random failure in addNumbers');
		}
		return { total: a + b };
	}
});

const reverseText = OrcaClient.defineFunction({
	id: 'reverseText',
	name: 'Reverse Text',
	handler: async ({ text }: { text: string }) => {
		if (shouldFail(0.4)) {
			throw new Error('Random failure in reverseText');
		}
		return { input: text, reversed: text.split('').reverse().join('') };
	}
});

const delayedStatus = OrcaClient.defineFunction({
	id: 'delayedStatus',
	name: 'Delayed Status',
	handler: async ({ durationMs }: { durationMs?: number }) => {
		const waitMs = Math.max(250, Math.min(durationMs ?? 5000, 20000));
		await sleep(waitMs);
		if (shouldFail(0.5)) {
			throw new Error(`Random failure in delayedStatus after ${waitMs}ms`);
		}
		return { completed: true, waitedMs: waitMs };
	}
});

const orca = OrcaClient.create([helloWorld, addNumbers, reverseText, delayedStatus], {
	apiUrl: env.ORCA_API_URL ?? 'http://localhost:3000',
	token: env.ORCA_TOKEN ?? 'somesecret'
});

export { orca };
