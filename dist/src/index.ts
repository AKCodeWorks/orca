import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { zValidator } from "@hono/zod-validator";
import { orcaInvokeSchema } from "./api/invoke/orca-invoke.zod.js";
import { DispatcWorker } from "./workers/dispatcher/dispatcher.js";
const app = new Hono();

app.use("*", bearerAuth({ token: Bun.env.ORCA_TOKEN! }));

app.post("/invoke", zValidator("json", orcaInvokeSchema), async (c) => {
  const body = c.req.valid("json");
  console.log(body);
  DispatcWorker.postMessage("Yeet");
  return c.json({
    message: `Function ${body.functionId} invoked with args: ${body.args?.join(", ") || "none"}`,
  });
});

app.post("/sync", async (c) => {
  const resp = await fetch("http://localhost:5173/api/orca");

  const json = await resp.json();

  console.log(json);

  return c.json(json);
});

app.get("/health", (c) => {
  return c.text("OK");
});

export default {
  port: 3000,
  fetch: app.fetch,
};
