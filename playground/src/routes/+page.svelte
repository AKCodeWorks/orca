<script lang="ts">
	import {
		invokeAddNumbers,
		invokeDelayedStatus,
		invokeHelloWorld,
		invokeReverseText
	} from './orca.remote';

	type JobResponse = {
		functionId: string;
		jobId: string;
		status: string;
	};

		type JobError = {
		error: string;
	};

	let loading = $state<string | null>(null);
	let outputs = $state<Record<string, JobResponse | JobError>>({});

	async function run(label: string, task: () => Promise<JobResponse>) {
		loading = label;
		try {
			const res = await task();
			outputs = {
				...outputs,
				[label]: res
			};
		} catch (error) {
			outputs = {
				...outputs,
				[label]: {
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			};
		} finally {
			loading = null;
		}
	}
</script>

<main class="mx-auto max-w-3xl space-y-6 p-6">
	<header class="space-y-2">
		<h1 class="text-3xl font-semibold">Orca Playground</h1>
		<p class="text-muted-foreground">
			These buttons call remote functions that queue jobs for the 4 locally registered Orca functions.
		</p>
	</header>

	<section class="grid gap-3 sm:grid-cols-2">
		<button
			class="rounded-md border px-4 py-2 text-left"
			onclick={() => run('helloWorld', invokeHelloWorld)}
			disabled={loading !== null}
		>
			<div class="font-medium">Run Hello World</div>
			<div class="text-muted-foreground text-sm">No args</div>
		</button>

		<button
			class="rounded-md border px-4 py-2 text-left"
			onclick={() => run('addNumbers', invokeAddNumbers)}
			disabled={loading !== null}
		>
			<div class="font-medium">Run Add Numbers</div>
			<div class="text-muted-foreground text-sm">a=7, b=13</div>
		</button>

		<button
			class="rounded-md border px-4 py-2 text-left"
			onclick={() => run('reverseText', invokeReverseText)}
			disabled={loading !== null}
		>
			<div class="font-medium">Run Reverse Text</div>
			<div class="text-muted-foreground text-sm">text='Orca Playground'</div>
		</button>

		<button
			class="rounded-md border px-4 py-2 text-left"
			onclick={() => run('delayedStatus', invokeDelayedStatus)}
			disabled={loading !== null}
		>
			<div class="font-medium">Run Delayed Status</div>
			<div class="text-muted-foreground text-sm">Simulated long job (6s delay)</div>
		</button>
	</section>

	{#if loading}
		<p class="text-sm">Running: {loading}...</p>
	{/if}

	<section class="space-y-3">
		<h2 class="text-xl font-medium">Responses</h2>
		{#if Object.keys(outputs).length === 0}
			<p class="text-muted-foreground text-sm">No responses yet.</p>
		{:else}
			{#each Object.entries(outputs) as [key, value] (key)}
				<article class="rounded-md border p-3">
					<h3 class="font-medium">{key}</h3>
					<pre class="mt-2 overflow-x-auto rounded-md border p-2 text-xs">{JSON.stringify(value, null, 2)}</pre>
				</article>
			{/each}
		{/if}
	</section>
</main>
