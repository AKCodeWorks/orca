<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import SiteHeader from "$lib/components/site-header.svelte";
  import AppSidebar from "$lib/components/app-sidebar.svelte";

  let { data, children } = $props();
</script>

<div class="[--header-height:calc(--spacing(14))]">
  <Sidebar.Provider class="flex flex-col">
    <SiteHeader />
    <div class="flex flex-1">
      <AppSidebar
        functions={data.functions}
        currentFunctionId={data.currentFunctionId}
        functionsError={data.functionsError}
        showUnregistered={data.showUnregistered}
      />
      <Sidebar.Inset>
        {@render children()}
      </Sidebar.Inset>
    </div>
  </Sidebar.Provider>
</div>
