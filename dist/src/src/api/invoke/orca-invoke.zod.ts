import z4 from "zod/v4";

const orcaInvokeSchema = z4.object({
  functionId: z4.string().min(1, "Function ID is required"),
  args: z4.array(z4.string()).optional(),
});

export { orcaInvokeSchema };
