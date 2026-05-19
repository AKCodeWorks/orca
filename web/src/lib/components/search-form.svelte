<script lang="ts">
	import SearchIcon from "@lucide/svelte/icons/search";
	import { Label } from "$lib/components/ui/label/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { page } from "$app/state";
	import type { HTMLFormAttributes } from "svelte/elements";

	let { ...restProps }: HTMLFormAttributes = $props();
	const currentQuery = $derived(page.url.searchParams.get("q") ?? "");
</script>

<form method="GET" action={page.url.pathname} {...restProps}>
	<div class="relative">
		<Label for="search" class="sr-only">Search</Label>
		<Sidebar.Input id="search" name="q" value={currentQuery} placeholder="Search functions..." class="h-8 ps-7" />
		<SearchIcon
			class="pointer-events-none absolute start-2 top-1/2 size-4 -translate-y-1/2 opacity-50 select-none"
		/>
	</div>
</form>
