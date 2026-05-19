<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { page } from "$app/state";
  import { getRunsPage } from "./dashboard.remote";
  type AttemptRecord = {
    execution?: {
      startTime?: string;
      endTime?: string;
      totalDurationMs?: number;
    };
  };

  const currentPage = $derived(Math.max(1, Number(page.url.searchParams.get("page") ?? "1") || 1));
  const currentPageSize = $derived(
    Math.max(1, Math.min(100, Number(page.url.searchParams.get("pageSize") ?? "10") || 10)),
  );

  const runsPage = $derived(getRunsPage({ page: currentPage, pageSize: currentPageSize }));
  const res = $derived(await runsPage);
  let nowMs = $state(Date.now());

  $effect(() => {
    const timer = setInterval(() => {
      nowMs = Date.now();
    }, 100);
    return () => clearInterval(timer);
  });

  const formatDate = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
      case "RUNNING":
        return "border-blue-500/30 bg-blue-500/10 text-blue-400";
      case "QUEUED":
        return "border-violet-500/30 bg-violet-500/10 text-violet-400";
      default:
        return "";
    }
  };

  const formatDuration = (ms: number) => {
    return `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
  };

  const getRunDurationLabel = (run: { status: string; result: unknown }) => {
    const result = run.result;
    if (!result || typeof result !== "object") return "-";
    const attempts = (result as { attempts?: unknown }).attempts;
    if (!Array.isArray(attempts) || attempts.length === 0) return "-";
    const last = attempts[attempts.length - 1] as AttemptRecord;
    const startMs = last.execution?.startTime ? new Date(last.execution.startTime).getTime() : NaN;
    const endMs = last.execution?.endTime ? new Date(last.execution.endTime).getTime() : NaN;
    const totalDurationMs =
      Number.isFinite(startMs) && Number.isFinite(endMs)
        ? endMs - startMs
        : last.execution?.totalDurationMs;
    if (run.status === "RUNNING" && last.execution?.startTime) {
      if (Number.isFinite(startMs)) return formatDuration(nowMs - startMs);
    }
    if (typeof totalDurationMs === "number") return formatDuration(totalDurationMs);
    return "-";
  };
</script>

<div class="grid flex-1 gap-4 p-4">
  <Card>
    <CardHeader>
      <CardTitle>Recent Runs</CardTitle>
      <CardDescription>Paginated run history across all functions.</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="space-y-3">
        {#if res.items.length === 0}
          <p class="text-muted-foreground text-sm">No runs found.</p>
        {:else}
          <div class="space-y-2">
            {#each res.items as run (run.id)}
              <a href={`/auth/runs/${run.id}`} class="block rounded border p-3 hover:opacity-90">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium">{run.name}</p>
                    <p class="text-muted-foreground font-mono text-xs">{run.functionId}</p>
                    <p class="text-muted-foreground mt-1 font-mono text-xs">{run.id}</p>
                  </div>
                  <Badge
                    variant={run.status === "FAILED" ? "destructive" : "outline"}
                    class={statusBadgeClass(run.status)}
                  >
                    {run.status}
                  </Badge>
                </div>
                <p class="text-muted-foreground mt-2 text-xs">
                  Attempts: {run.attempts}/{run.maxAttempts} • {getRunDurationLabel(run)} • {formatDate(run.createdAt)}
                </p>
              </a>
            {/each}
          </div>
        {/if}

        <div class="flex items-center justify-between gap-2 pt-2">
          <p class="text-muted-foreground text-xs">
            Page {res.page} of {res.totalPages} • {res.total} total runs
          </p>
          <div class="flex items-center gap-2">
            <a
              class={`rounded border px-3 py-1.5 text-sm ${res.page <= 1 ? "pointer-events-none opacity-50" : ""}`}
              href={`/auth?page=${Math.max(1, res.page - 1)}&pageSize=${res.pageSize}`}
              aria-disabled={res.page <= 1}
            >
              Previous
            </a>
            <a
              class={`rounded border px-3 py-1.5 text-sm ${res.page >= res.totalPages ? "pointer-events-none opacity-50" : ""}`}
              href={`/auth?page=${Math.min(res.totalPages, res.page + 1)}&pageSize=${res.pageSize}`}
              aria-disabled={res.page >= res.totalPages}
            >
              Next
            </a>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</div>
