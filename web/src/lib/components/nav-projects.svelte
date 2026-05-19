<script lang="ts">
	import { goto } from "$app/navigation";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { Switch } from "$lib/components/ui/switch/index.js";

	let {
		functions,
		currentFunctionId,
		query,
		showUnregistered = false,
		currentPath = "/auth",
	}: {
		functions: {
			id: string;
			name: string;
			registered?: boolean;
		}[];
		currentFunctionId?: string | null;
		query?: string;
		showUnregistered?: boolean;
		currentPath?: string;
	} = $props();
	let includeUnregistered = $state(false);
	let hasMounted = false;

	const filteredFunctions = $derived.by(() => {
		const q = (query ?? "").trim().toLowerCase();
		if (!q) return functions;
		return functions.filter((fn) =>
			fn.name.toLowerCase().includes(q) || fn.id.toLowerCase().includes(q),
		);
	});

	$effect(() => {
		includeUnregistered = showUnregistered;
	});

	$effect(() => {
		if (!hasMounted) {
			hasMounted = true;
			return;
		}

		if (includeUnregistered === showUnregistered) return;

		const params = new URLSearchParams();
		if (query) params.set("q", query);
		if (includeUnregistered) params.set("includeUnregistered", "1");
		const qs = params.toString();
		void goto(qs ? `${currentPath}?${qs}` : currentPath, { keepFocus: true, noScroll: true });
	});
</script>

<Sidebar.Group class="group-data-[collapsible=icon]:hidden">
	<Sidebar.GroupLabel class="px-2">Functions</Sidebar.GroupLabel>
	<div class="px-2 pb-2">
		<div class="bg-muted/20 flex items-center justify-between rounded-md px-2 py-2">
			<span class="text-muted-foreground text-xs">Show unregistered</span>
			<Switch bind:checked={includeUnregistered} aria-label="Show unregistered functions" size="sm" />
		</div>
	</div>
	<Sidebar.Menu>
		{#if filteredFunctions.length === 0}
			<Sidebar.MenuItem>
				<div class="text-muted-foreground px-2 py-1 text-xs">No functions match search.</div>
			</Sidebar.MenuItem>
		{:else}
			{#each filteredFunctions as fn (fn.id)}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton class="h-auto py-2" isActive={currentFunctionId === fn.id}>
						{#snippet child({ props })}
							<a
								href={`/auth/functions/${fn.id}${query ? `?q=${encodeURIComponent(query)}${showUnregistered ? "&includeUnregistered=1" : ""}` : showUnregistered ? "?includeUnregistered=1" : ""}`}
								{...props}
							>
								<div class="grid gap-0.5">
									<div class="flex items-center gap-2">
										<span class="text-sm leading-tight">{fn.name}</span>
										{#if fn.registered === false}
											<span class="text-muted-foreground text-[10px] uppercase">Unregistered</span>
										{/if}
									</div>
									<span class="text-muted-foreground font-mono text-xs">{fn.id}</span>
								</div>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/each}
		{/if}
	</Sidebar.Menu>
</Sidebar.Group>
