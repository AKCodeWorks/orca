<script lang="ts" module>
	import LayoutDashboardIcon from "@lucide/svelte/icons/layout-dashboard";
	import ListChecksIcon from "@lucide/svelte/icons/list-checks";
	import ActivityIcon from "@lucide/svelte/icons/activity";
	import LifeBuoyIcon from "@lucide/svelte/icons/life-buoy";
	import SendIcon from "@lucide/svelte/icons/send";
	import favicon from "$lib/assets/favicon.svg";

	const data = {
		user: {
			name: "shadcn",
			email: "m@example.com",
			avatar: "/avatars/shadcn.jpg",
		},
		navMain: [
			{
				title: "Dashboard",
				url: "/auth",
				icon: LayoutDashboardIcon,
				isActive: true,
				items: [
					{
						title: "Overview",
						url: "/auth",
					},
				],
			},
			{
				title: "Functions",
				url: "/auth",
				icon: ListChecksIcon,
				items: [
					{
						title: "Run Explorer",
						url: "/auth",
					},
				],
			},
			{
				title: "Activity",
				url: "/auth",
				icon: ActivityIcon,
				items: [
					{
						title: "Job Statuses",
						url: "/auth",
					},
				],
			},
		],
		navSecondary: [
			{
				title: "Support",
				url: "#",
				icon: LifeBuoyIcon,
			},
			{
				title: "Feedback",
				url: "#",
				icon: SendIcon,
			},
		],
		brand: {
			name: "Orca",
			tier: "Control Plane",
			logo: favicon,
		},
	};
</script>

<script lang="ts">
	import type { ComponentProps } from "svelte";
	import { page } from "$app/state";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import NavMain from "./nav-main.svelte";
	import NavProjects from "./nav-projects.svelte";
	import NavSecondary from "./nav-secondary.svelte";
	import NavUser from "./nav-user.svelte";

	let {
		ref = $bindable(null),
		functions = [],
		currentFunctionId = null,
		functionsError = null,
		showUnregistered = false,
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		functions?: { id: string; name: string; registered?: boolean }[];
		currentFunctionId?: string | null;
		functionsError?: string | null;
		showUnregistered?: boolean;
	} = $props();

	const query = $derived(page.url.searchParams.get("q") ?? "");
	const currentPath = $derived(page.url.pathname);
</script>

<Sidebar.Root
	bind:ref
	class="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
	{...restProps}
>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg">
					{#snippet child({ props })}
						<a href="/auth" {...props}>
							<img src={data.brand.logo} alt="Orca logo" class="size-8 shrink-0" />
							<div class="grid flex-1 text-start text-sm leading-tight">
								<span class="truncate font-medium">{data.brand.name}</span>
								<span class="truncate text-xs">{data.brand.tier}</span>
							</div>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain items={data.navMain} />
		{#if functionsError}
			<div class="text-destructive px-2 py-1 text-xs">{functionsError}</div>
		{:else}
			<NavProjects
				functions={functions}
				{currentFunctionId}
				{query}
				{showUnregistered}
				{currentPath}
			/>
		{/if}
		<NavSecondary items={data.navSecondary} class="mt-auto" />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser user={data.user} />
	</Sidebar.Footer>
</Sidebar.Root>
