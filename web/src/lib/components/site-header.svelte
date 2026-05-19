<script lang="ts">
	import SidebarIcon from "@lucide/svelte/icons/sidebar";
	import SunIcon from "@lucide/svelte/icons/sun";
	import MoonIcon from "@lucide/svelte/icons/moon";
	import SearchForm from "./search-form.svelte";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { page } from "$app/state";
	import { mode, toggleMode } from "mode-watcher";

	const sidebar = Sidebar.useSidebar();
	const routeLabel = $derived(
		page.url.pathname === "/auth" ? "Auth" : page.url.pathname.replaceAll("/", " ").trim(),
	);
	const selectedFunction = $derived(page.params.functionId ?? null);
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
</header>
