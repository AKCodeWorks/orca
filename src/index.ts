import { Hono } from "hono";

import { AuthRouter } from "./api/auth/auth-router.js";
const app = new Hono();

app.route("/auth", AuthRouter);

app.get("/health", (c) => {
  return c.text("OK");
});

export default {
  port: 3000,
  fetch: app.fetch,
};
