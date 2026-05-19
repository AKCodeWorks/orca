const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

worker.onmessage = (event) => {
  console.log("dispatcher event:", event.data);
};

worker.addEventListener("error", (event) => {
  console.error("worker error:", event.message);
});

export { worker as DispatcWorker };
