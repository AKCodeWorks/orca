<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { page } from "$app/state";
  import { invokeFunction } from "./invoke.remote";
  import { deleteAllRuns } from "./delete-all.remote";
  import { getFunctionRuns } from "./function-runs.remote";
  type AttemptRecord = {
    execution?: {
      startTime?: string;
      endTime?: string;
      totalDurationMs?: number;
    };
  };

  const currentPage = $derived(Math.max(1, Number(page.url.searchParams.get("page") ?? "1") || 1));
  const currentPageSize = 25;
  const selectedFunctionId = $derived(page.params.functionId);
  const functionRuns = $derived(
    getFunctionRuns({
      functionId: selectedFunctionId,
      page: currentPage,
      pageSize: currentPageSize,
    }),
  );
  const data = $derived(await functionRuns);
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
      <CardTitle>Function Details</CardTitle>
      <CardDescription>
        Status for <span class="font-mono">{data.function?.id ?? selectedFunctionId}</span>.
      </CardDescription>
    </CardHeader>
    <CardContent>
      {#if data.function}
        <div class="flex items-center gap-2">
          <p class="text-sm">{data.function.name}</p>
          <Badge variant={data.function.registered ? "outline" : "secondary"}>
            {data.function.registered ? "Registered" : "Unregistered"}
          </Badge>
        </div>
      {:else}
        <p class="text-muted-foreground text-sm">Function metadata unavailable.</p>
      {/if}
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Invoke Function</CardTitle>
      <CardDescription>Queue a new run by passing JSON object args.</CardDescription>
    </CardHeader>
    <CardContent>
      {#if data.function?.registered === false}
        <p class="text-muted-foreground text-sm">
          This function is unregistered. Invocation is disabled until it is registered.
        </p>
      {:else}
        <form {...invokeFunction} class="space-y-3">
          <textarea
            name="args"
            class="bg-background min-h-32 w-full rounded border p-3 font-mono text-xs"
          >{'{}'}</textarea>
          <button class="rounded border px-3 py-2 text-sm" type="submit">Invoke</button>
        </form>
      {/if}
    </CardContent>
  </Card>

  <Card>
    <CardHeader class="flex flex-row items-start justify-between gap-3">
      <div>
        <CardTitle>Function Runs</CardTitle>
        <CardDescription>
          Ordered by created date (newest first), 25 per page.
        </CardDescription>
      </div>
      <form {...deleteAllRuns} id="delete-all-runs-form"></form>
      <AlertDialog.Root>
        <AlertDialog.Trigger class="rounded border px-3 py-2 text-sm">
          Delete all runs
        </AlertDialog.Trigger>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Delete all runs?</AlertDialog.Title>
            <AlertDialog.Description>
              This will permanently remove all runs for this function.
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action form="delete-all-runs-form" type="submit">
              Delete
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </CardHeader>
    <CardContent>
      {#if data.runs.length === 0}
        <p class="text-muted-foreground text-sm">No runs yet for this function.</p>
      {:else}
        <div class="overflow-x-auto">
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Job ID</Table.Head>
                <Table.Head>Status</Table.Head>
                <Table.Head>Attempts</Table.Head>
                <Table.Head>Duration</Table.Head>
                <Table.Head>Created</Table.Head>
                <Table.Head>Result</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each data.runs as run (run.id)}
                <Table.Row>
                  <Table.Cell class="font-mono text-xs">
                    <a class="underline underline-offset-4" href={`/auth/runs/${run.id}`}>
                      {run.id}
                    </a>
                  </Table.Cell>
                  <Table.Cell>
                      <Badge
                        variant={run.status === "FAILED" ? "destructive" : "outline"}
                        class={statusBadgeClass(run.status)}
                      >
                        {run.status}
                      </Badge>
                  </Table.Cell>
                  <Table.Cell>{run.attempts}/{run.maxAttempts}</Table.Cell>
                  <Table.Cell>{getRunDurationLabel(run)}</Table.Cell>
                  <Table.Cell>{formatDate(run.createdAt)}</Table.Cell>
                  <Table.Cell>
                    <a class="underline underline-offset-4" href={`/auth/runs/${run.id}`}>
                      View details
                    </a>
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </div>

        <div class="mt-3 flex items-center justify-between gap-2">
          <p class="text-muted-foreground text-xs">
            Page {data.page} of {data.totalPages} • {data.total} total runs
          </p>
          <div class="flex items-center gap-2">
            <a
              class={`rounded border px-3 py-1.5 text-sm ${data.page <= 1 ? "pointer-events-none opacity-50" : ""}`}
              href={`/auth/functions/${selectedFunctionId}?page=${Math.max(1, data.page - 1)}`}
              aria-disabled={data.page <= 1}
            >
              Previous
            </a>
            <a
              class={`rounded border px-3 py-1.5 text-sm ${data.page >= data.totalPages ? "pointer-events-none opacity-50" : ""}`}
              href={`/auth/functions/${selectedFunctionId}?page=${Math.min(data.totalPages, data.page + 1)}`}
              aria-disabled={data.page >= data.totalPages}
            >
              Next
            </a>
          </div>
        </div>
      {/if}
    </CardContent>
  </Card>
</div>
