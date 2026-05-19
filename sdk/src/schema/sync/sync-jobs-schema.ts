import z4 from "zod/v4";

export const syncJobsSchema = z4.object({
  functions: z4.array(
    z4.object({
      id: z4.string().min(1, "job id is required"),
      name: z4.string().min(1, "job name is required"),
    }),
  ),
}).check((ctx) => {
  const seen = new Set<string>();

  for (const job of ctx.value.functions) {
    if (seen.has(job.id)) {
      ctx.issues.push({
        code: "custom",
        message: `duplicate job id: ${job.id}, job ids must be unique`,
        path: ["jobs"],
        input: ctx.value.functions,
      });
      return;
    }

    seen.add(job.id);
  }
});

export type SyncJobsResponse = z4.infer<typeof syncJobsSchema>;
