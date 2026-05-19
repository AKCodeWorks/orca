import { type SyncJobsResponse } from "../schema/sync";
import { invokeJobSchema } from "../schema/invoke/invoke-job-schema";
import z4 from "zod/v4";

type FunctionArgs = Record<string, unknown> | undefined;
type RetryConfig = {
  maxRetries?: number;
  backoffSeconds?: number;
  maxBackoffSeconds?: number;
};
type RegisteredFn<Id extends string = string, Args extends FunctionArgs = FunctionArgs, Return = unknown> = {
  id: Id;
  name: string;
  retries?: RetryConfig;
  handler: Args extends undefined
    ? () => Return | Promise<Return>
    : (args: Args) => Return | Promise<Return>;
};
type AnyRegisteredFn = RegisteredFn<string, any, any>;
type InvokeRouteRequest = {
  functionId: string;
  maxRetries?: number;
  backoffSeconds?: number;
  maxBackoffSeconds?: number;
};
const invokeRequestSchema = invokeJobSchema.extend({
  args: z4.record(z4.string(), z4.unknown()).optional(),
});

type RegisteredFnId<TRegistry extends readonly AnyRegisteredFn[]> = TRegistry[number]["id"];
type RegisteredFnById<
  TRegistry extends readonly AnyRegisteredFn[],
  TId extends RegisteredFnId<TRegistry>,
> = Extract<TRegistry[number], { id: TId }>;
type RegisteredFnArgsById<
  TRegistry extends readonly AnyRegisteredFn[],
  TId extends RegisteredFnId<TRegistry>,
> = Parameters<RegisteredFnById<TRegistry, TId>["handler"]>[0];
type RequestJobInput<TRegistry extends readonly AnyRegisteredFn[]> = {
  [TId in RegisteredFnId<TRegistry>]: RegisteredFnArgsById<TRegistry, TId> extends undefined
    ? { id: TId }
    : { id: TId } & RegisteredFnArgsById<TRegistry, TId>;
}[RegisteredFnId<TRegistry>];
type OrcaClientConfig = {
  apiUrl?: string;
  token?: string;
};
type RequestJobSuccess<TData> = {
  data: TData;
  httpResponse: Response;
};
type RequestJobQueued = {
  functionId: string;
  jobId: string;
  status: string;
};

class OrcaClient<TRegistry extends readonly AnyRegisteredFn[] = []> {
  private registry: TRegistry;
  private config: OrcaClientConfig;
  functions: SyncJobsResponse["functions"] = [];

  static create<const TRegistry extends readonly AnyRegisteredFn[]>(
    registry: TRegistry,
    config: OrcaClientConfig = {},
  ) {
    return new OrcaClient<TRegistry>(registry, config);
  }

  static defineFunction<
    const TId extends string,
    TArgs extends FunctionArgs = undefined,
    TReturn = unknown,
  >(
    input: RegisteredFn<TId, TArgs, TReturn>,
  ) {
    return input;
  }

  constructor(registry?: TRegistry, config: OrcaClientConfig = {}) {
    this.registry = (registry ?? ([] as unknown as TRegistry));
    this.config = config;
    this.functions = this.registry.map(({ id, name }) => ({ id, name }));
  }

// sync jobs from client
  GET() {
    const res: SyncJobsResponse = {
      functions: this.functions,
    };

    return new Response(JSON.stringify(res), { status: 200 });
  }

  // invoke jobs to client
  async POST(request: Request): Promise<Response> {
    try {
      const body = await request.json();
      const parsed = invokeRequestSchema.safeParse(body);
      if (!parsed.success) {
        return new Response(
          JSON.stringify({
            error: "Invalid request body",
            issues: parsed.error.issues,
          }),
          { status: 400 },
        );
      }

      const functionId = parsed.data.functionId as RegisteredFnId<TRegistry>;
      const args = parsed.data.args as RegisteredFnArgsById<TRegistry, typeof functionId>;
      const result = await this.invoke(functionId, args);
      return new Response(JSON.stringify({ result }), { status: 200 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to invoke function";
      const status = message.startsWith("Function not registered:") ? 404 : 500;
      return new Response(JSON.stringify({ error: message }), { status });
    }
  }

  async requestJob<TId extends RegisteredFnId<TRegistry>>(
    input: Extract<RequestJobInput<TRegistry>, { id: TId }>,
  ): Promise<RequestJobSuccess<RequestJobQueued>> {
    const orcaApiUrl = this.config.apiUrl;
    const orcaToken = this.config.token;

    if (!orcaApiUrl) {
      throw new Error("ORCA_API_URL environment variable is not set");
    }

    if (!orcaToken) {
      throw new Error("ORCA_TOKEN environment variable is not set");
    }

    const { id, ...rest } = input as { id: string } & Record<string, unknown>;
    const fn = this.registry.find((item) => item.id === id);
    const payload: InvokeRouteRequest & { args?: Record<string, unknown> } = {
      functionId: id,
      args: Object.keys(rest).length > 0 ? rest : undefined,
      maxRetries: fn?.retries?.maxRetries,
      backoffSeconds: fn?.retries?.backoffSeconds,
      maxBackoffSeconds: fn?.retries?.maxBackoffSeconds,
    };

    const invokeUrl = new URL("/auth/invoke", orcaApiUrl).toString();

    const httpResponse = await fetch(invokeUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${orcaToken}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await httpResponse.json();
    if (!httpResponse.ok) {
      throw new Error(
        `requestJob failed with status ${httpResponse.status}: ${JSON.stringify(json)}`,
      );
    }

    return {
      data: json as RequestJobQueued,
      httpResponse,
    };
  }

  private async invoke<TId extends RegisteredFnId<TRegistry>>(
    functionId: TId,
    args?: RegisteredFnArgsById<TRegistry, TId>,
  ): Promise<Awaited<ReturnType<RegisteredFnById<TRegistry, TId>["handler"]>>> {
    const fn = this.registry.find((item) => item.id === functionId) as
      | RegisteredFnById<TRegistry, TId>
      | undefined;
    if (!fn) throw new Error(`Function not registered: ${functionId}`);

    const result = args === undefined
      ? await (fn.handler as () => Awaited<ReturnType<RegisteredFnById<TRegistry, TId>["handler"]>>)()
      : await (fn.handler as (input: RegisteredFnArgsById<TRegistry, TId>) => Awaited<ReturnType<RegisteredFnById<TRegistry, TId>["handler"]>>)(args);
    return result as Awaited<ReturnType<RegisteredFnById<TRegistry, TId>["handler"]>>;
  }
}


export { OrcaClient };
