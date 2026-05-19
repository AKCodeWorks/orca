<script lang="ts">
	import SidebarIcon from "@lucide/svelte/icons/sidebar";
	import SunIcon from "@lucide/svelte/icons/sun";
	import MoonIcon from "@lucide/svelte/icons/moon";
	import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
	import SearchForm from "./search-form.svelte";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { refreshAll } from "$app/navigation";
	import { page } from "$app/state";
	import { mode, toggleMode } from "mode-watcher";
	import { syncRoutes } from "$lib/remote/sync.remote";

	const sidebar = Sidebar.useSidebar();
	const routeLabel = $derived(
		page.url.pathname === "/auth" ? "Auth" : page.url.pathname.replaceAll("/", " ").trim(),
	);
	const selectedFunction = $derived(page.params.functionId ?? null);
	let syncing = $state(false);
	let syncError = $state<string | null>(null);

	const onSyncRoutes = async () => {
		syncing = true;
		syncError = null;
		try {
			await syncRoutes();
			await refreshAll();
		} catch (error) {
			syncError = error instanceof Error ? error.message : "Failed to sync routes";
		} finally {
			syncing = false;
		}
	};
</script>

<header class="bg-background sticky top-0 z-50 flex w-full items-center border-b">
	<div class="flex h-(--header-height) w-full items-center gap-2 px-4">
		<Button class="size-8" variant="ghost" size="icon" onclick={sidebar.toggle}>
			<SidebarIcon />
		</Button>
		<Separator orientation="vertical" class="me-2 h-4" />
		<Breadcrumb.Root class="hidden sm:block">
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/auth">Orca</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>{routeLabel}</Breadcrumb.Page>
				</Breadcrumb.Item>
				{#if selectedFunction}
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page class="font-mono text-xs">{selectedFunction}</Breadcrumb.Page>
					</Breadcrumb.Item>
				{/if}
			</Breadcrumb.List>
		</Breadcrumb.Root>
		<SearchForm class="w-full sm:ms-auto sm:w-auto" />
		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" onclick={onSyncRoutes} disabled={syncing}>
				<RefreshCwIcon class={syncing ? "animate-spin" : ""} />
				{syncing ? "Syncing..." : "Sync Routes"}
			</Button>
		</div>
		<Button
			class="size-8"
			variant="ghost"
			size="icon"
			onclick={() => toggleMode()}
			aria-label="Toggle theme"
		>
			{#if mode.current === "dark"}
				<SunIcon />
			{:else}
				<MoonIcon />
			{/if}
		</Button>
	</div>
	{#if syncError}
		<div class="text-destructive px-4 pb-2 text-xs">{syncError}</div>
	{/if}
</header>
