import { command } from '$app/server';
import { orca } from '$lib/server/orca';

export const invokeHelloWorld = command(async () => {
	const res = await orca.requestJob({
		id: 'helloWorld'
	});
	return res.data;
});

export const invokeAddNumbers = command(async () => {
	const res = await orca.requestJob({
		id: 'addNumbers',
		a: 7,
		b: 13
	});
	return res.data;
});

export const invokeReverseText = command(async () => {
	const res = await orca.requestJob({
		id: 'reverseText',
		text: 'Orca Playground'
	});
	return res.data;
});

export const invokeDelayedStatus = command(async () => {
	const res = await orca.requestJob({
		id: 'delayedStatus',
		durationMs: 6000
	});
	return res.data;
});
