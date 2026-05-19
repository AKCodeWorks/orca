import z4 from "zod/v4";

const invokeJobSchema = z4.object({
  functionId: z4.string().min(1, "function id is required"),
  args: z4.record(z4.string(), z4.unknown()).optional(),
  maxRetries: z4.number().int().min(0).optional(),
  backoffSeconds: z4.number().int().min(1).optional(),
  maxBackoffSeconds: z4.number().int().min(1).optional(),
});

export { invokeJobSchema };
