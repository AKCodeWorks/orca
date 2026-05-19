<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Progress } from "$lib/components/ui/progress/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { page } from "$app/state";
  import { mode } from "mode-watcher";
  import { rerunFunction } from "./rerun.remote";
  import { deleteRun } from "./delete-run.remote";
  import { getRunDetails } from "./run-details.remote";

  const runDetails = $derived(getRunDetails({ jobId: page.params.jobId }));
  const runData = $derived(await runDetails);
  const run = $derived(runData.run);
  const initialArgs = $derived(runData.initialArgs ?? "{}");
  let rerunArgs = $state("");
  let nowMs = $state(Date.now());

  $effect(() => {
    if (rerunArgs === "" && initialArgs) {
      rerunArgs = initialArgs;
    }
  });

  $effect(() => {
    const timer = setInterval(() => {
      nowMs = Date.now();
    }, 100);
    return () => clearInterval(timer);
  });

  type AttemptRecord = {
    attempt: number;
    status: "COMPLETED" | "FAILED";
    at: string;
    execution?: {
      startTime: string;
      endTime: string;
      totalDurationMs: number;
    };
    result?: unknown;
    error?: string;
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
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

  const attemptHistory = $derived.by(() => {
    const value = run?.result;
    if (!value || typeof value !== "object") return [] as AttemptRecord[];

    const attempts = (value as { attempts?: unknown }).attempts;
    if (!Array.isArray(attempts)) return [] as AttemptRecord[];

    return attempts as AttemptRecord[];
  });

  const formatDuration = (ms: number) => {
    return `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
  };

  const runDurationLabel = $derived.by(() => {
    if (!run || attemptHistory.length === 0) return "-";
    const latest = attemptHistory[attemptHistory.length - 1];
    const startMs = latest.execution?.startTime ? new Date(latest.execution.startTime).getTime() : NaN;
    const endMs = latest.execution?.endTime ? new Date(latest.execution.endTime).getTime() : NaN;
    const resolvedDurationMs =
      Number.isFinite(startMs) && Number.isFinite(endMs)
        ? endMs - startMs
        : latest.execution?.totalDurationMs;
    if (run.status === "RUNNING" && latest.execution?.startTime) {
      if (Number.isFinite(startMs)) return formatDuration(nowMs - startMs);
    }
    if (typeof resolvedDurationMs === "number") {
      return formatDuration(resolvedDurationMs);
    }
    return "-";
  });

  const invocationConfig = $derived.by(() => {
    const result = run?.result;
    if (!result || typeof result !== "object") return null;
    return (result as { invocation?: unknown }).invocation as
      | {
          maxRetries?: number;
          backoffSeconds?: number;
          maxBackoffSeconds?: number;
        }
      | undefined;
  });

  const attemptDurationsMs = $derived.by(() =>
    attemptHistory
      .map((attempt) => {
        const startMs = attempt.execution?.startTime
          ? new Date(attempt.execution.startTime).getTime()
          : NaN;
        const endMs = attempt.execution?.endTime ? new Date(attempt.execution.endTime).getTime() : NaN;
        if (Number.isFinite(startMs) && Number.isFinite(endMs)) return Math.max(0, endMs - startMs);
        if (typeof attempt.execution?.totalDurationMs === "number") return Math.max(0, attempt.execution.totalDurationMs);
        return 0;
      })
      .filter((value) => Number.isFinite(value)),
  );

  const actualElapsedMs = $derived.by(() => {
    if (!run || attemptHistory.length === 0) return 0;

    let total = 0;

    for (let index = 0; index < attemptHistory.length; index += 1) {
      const attempt = attemptHistory[index];
      const startMs = attempt.execution?.startTime
        ? new Date(attempt.execution.startTime).getTime()
        : NaN;
      const endMs = attempt.execution?.endTime ? new Date(attempt.execution.endTime).getTime() : NaN;

      if (Number.isFinite(startMs) && Number.isFinite(endMs)) {
        total += Math.max(0, endMs - startMs);
      } else if (Number.isFinite(startMs) && run.status === "RUNNING" && index === attemptHistory.length - 1) {
        total += Math.max(0, nowMs - startMs);
      } else if (typeof attempt.execution?.totalDurationMs === "number") {
        total += Math.max(0, attempt.execution.totalDurationMs);
      }

      const next = attemptHistory[index + 1];
      if (next) {
        const nextStartMs = next.execution?.startTime ? new Date(next.execution.startTime).getTime() : NaN;
        if (Number.isFinite(endMs) && Number.isFinite(nextStartMs)) {
          total += Math.max(0, nextStartMs - endMs);
        }
      }
    }

    return total;
  });

  const maxPossibleElapsedMs = $derived.by(() => {
    if (!run) return 0;
    const maxAttempts = Math.max(1, run.maxAttempts || 1);
    const backoffSeconds = Math.max(1, invocationConfig?.backoffSeconds ?? 10);
    const maxBackoffSeconds = Math.max(1, invocationConfig?.maxBackoffSeconds ?? 30);

    const observedMaxAttemptMs = attemptDurationsMs.length
      ? Math.max(...attemptDurationsMs)
      : run.status === "RUNNING"
        ? actualElapsedMs
        : 0;

    const maxAttemptDurationMs = Math.max(0, observedMaxAttemptMs);
    let maxBackoffTotalMs = 0;
    for (let attempt = 1; attempt < maxAttempts; attempt += 1) {
      const seconds = Math.min(attempt * backoffSeconds, maxBackoffSeconds);
      maxBackoffTotalMs += seconds * 1000;
    }

    return maxAttempts * maxAttemptDurationMs + maxBackoffTotalMs;
  });

  const durationProgressPercent = $derived.by(() => {
    if (maxPossibleElapsedMs <= 0) return 0;
    return Math.max(0, Math.min(100, (actualElapsedMs / maxPossibleElapsedMs) * 100));
  });
</script>

<div class="flex flex-1 flex-col gap-4 p-4">
  <a href={`/auth/functions/${run?.functionId ?? ""}`} class="text-sm underline underline-offset-4">← Back to function runs</a>

  {#if run}
    <Card>
      <CardHeader class="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{run.name}</CardTitle>
          <CardDescription class="font-mono text-xs">Job ID: {run.id}</CardDescription>
        </div>
        <form {...deleteRun} id="delete-run-form"></form>
        <AlertDialog.Root>
          <AlertDialog.Trigger class="rounded border px-3 py-2 text-sm">
            Delete run
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Delete this run?</AlertDialog.Title>
              <AlertDialog.Description>
                This run will be permanently removed from the database.
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
              <AlertDialog.Action form="delete-run-form" type="submit">
                Delete
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </CardHeader>
      <CardContent class="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div><p class="text-muted-foreground text-xs">Function ID</p><p class="font-mono text-xs">{run.functionId}</p></div>
        <div>
          <p class="text-muted-foreground text-xs">Status</p>
          <Badge
            variant={run.status === "FAILED" ? "destructive" : "outline"}
            class={statusBadgeClass(run.status)}
          >
            {run.status}
          </Badge>
        </div>
        <div><p class="text-muted-foreground text-xs">Attempts</p><p>{run.attempts}/{run.maxAttempts}</p></div>
        <div><p class="text-muted-foreground text-xs">Duration</p><p>{runDurationLabel}</p></div>
        <div><p class="text-muted-foreground text-xs">Created</p><p>{formatDate(run.createdAt)}</p></div>
      </CardContent>
      <CardContent class="pt-0">
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs">
            <p class="text-muted-foreground">Runtime Progress</p>
            <p class="font-mono">{durationProgressPercent.toFixed(1)}%</p>
          </div>
          <Progress value={durationProgressPercent} max={100} />
          <div class="text-muted-foreground flex items-center justify-between text-[11px]">
            <span>actual: {formatDuration(actualElapsedMs)}</span>
            <span>max: {formatDuration(maxPossibleElapsedMs)}</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Re-run Function</CardTitle>
        <CardDescription>Starts a new job. Edit args before submitting.</CardDescription>
      </CardHeader>
      <CardContent>
        <form {...rerunFunction} class="space-y-3">
          <textarea
            name="args"
            class="bg-background min-h-32 w-full rounded border p-3 font-mono text-xs"
            bind:value={rerunArgs}
          ></textarea>
          <button class="rounded border px-3 py-2 text-sm" type="submit">Re-run</button>
        </form>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Attempt History</CardTitle>
        <CardDescription>Per-attempt execution timing and outcome.</CardDescription>
      </CardHeader>
      <CardContent>
        {#if attemptHistory.length === 0}
          <p class="text-muted-foreground text-sm">No attempt history recorded yet.</p>
        {:else}
          <div class="space-y-2">
            {#each attemptHistory as attempt (attempt.attempt)}
              <div class="rounded border p-3">
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <p class="font-medium">Attempt {attempt.attempt}</p>
                  <Badge
                    variant={attempt.status === "FAILED" ? "destructive" : "outline"}
                    class={statusBadgeClass(attempt.status)}
                  >
                    {attempt.status}
                  </Badge>
                </div>
                <div class="grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <p class="text-muted-foreground text-xs">Start</p>
                    <p>{attempt.execution?.startTime ? formatDate(attempt.execution.startTime) : "-"}</p>
                  </div>
                  <div>
                    <p class="text-muted-foreground text-xs">End</p>
                    <p>{attempt.execution?.endTime ? formatDate(attempt.execution.endTime) : "-"}</p>
                  </div>
                  <div>
                    <p class="text-muted-foreground text-xs">Duration</p>
                    <p>{attempt.execution?.totalDurationMs ?? "-"} ms</p>
                  </div>
                </div>
                {#if attempt.error}
                  <p class="text-destructive mt-2 text-xs">{attempt.error}</p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Result</CardTitle>
        <CardDescription>Full JSON output from this run.</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="overflow-x-auto rounded border p-4 text-xs [&_pre]:m-0">
          {@html mode.current === "dark" ? runData.highlightedResultDark : runData.highlightedResultLight}
        </div>
      </CardContent>
    </Card>
  {/if}
</div>
