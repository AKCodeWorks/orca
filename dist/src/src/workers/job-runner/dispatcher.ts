type DispatchJobMessage = {
  jobId: string;
  functionId: string;
  args?: Record<string, unknown>;
  maxRetries: number;
  backoffSeconds: number;
  maxBackoffSeconds: number;
};

const worker = new Worker(new URL("./worker.ts", import.meta.url).href, {
  type: "module",
});

worker.addEventListener("error", (event) => {
  console.error("job worker error:", event.message);
});

worker.addEventListener("messageerror", () => {
  console.error("job worker message error");
});

function dispatchJob(message: DispatchJobMessage) {
  worker.postMessage(message);
}

export { dispatchJob };
export type { DispatchJobMessage };
