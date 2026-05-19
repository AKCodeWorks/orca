import { Hono } from "hono";
import { syncJobsSchema } from "orca-sdk";
import { getPrismaClient } from "../../../utils/prisma.js";

const router = new Hono();

router.get("/", async (c) => {
  try {
    const db = await getPrismaClient();
    if (!Bun.env.ORCA_APP_URL)
      return c.json(
        { error: "ORCA_APP_URL environment variable is not set" },
        500,
      );
    const resp = await fetch(Bun.env.ORCA_APP_URL);
    if (!resp.ok) {
      return c.json({ error: `Upstream returned ${resp.status}` }, 502);
    }

    const json = await resp.json();
    const valid = syncJobsSchema.safeParse(json);
    if (!valid.success)
      return c.json(
        {
          error: "Response is not in expected format",
          issues: valid.error.issues,
        },
        500,
      );

    // sync jobs to db and register them

    for (const fn of valid.data.functions) {
      await db.orcaFunction.upsert({
        where: {
          id: fn.id,
        },
        update: {
          name: fn.name,
          registered: true,
        },
        create: {
          id: fn.id,
          name: fn.name,
          registered: true,
        },
      });
    }
    // de-register functions that have been deleted
    await db.orcaFunction.updateMany({
      where: {
        id: {
          notIn: valid.data.functions.map((fn) => fn.id),
        },
      },
      data: {
        registered: false,
      },
    });

    return c.json({
      message: "Jobs synced successfully",
      jobCount: valid.data.functions.length,
    });
  } catch (e) {
    console.error("Error fetching data from /api/orca:", e);

    return c.json(
      { error: "Failed to fetch data from: " + Bun.env.ORCA_APP_URL },
      500,
    );
  }
});

export { router as SyncRouter };
