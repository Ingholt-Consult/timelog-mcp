import type { TimeLogClient } from "../client.js";

export type WriteMode = "preview" | "execute";

export interface RunWriteOptions {
  mode: WriteMode;
  validatePath: string;
  executePath: string;
  body: Record<string, unknown>;
}

// Build the POST body from tool args: drop the `mode` switch and any undefined fields.
export function bodyFromArgs(args: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (k === "mode") continue;
    if (v !== undefined) body[k] = v;
  }
  return body;
}

export async function runWrite(client: TimeLogClient, opts: RunWriteOptions): Promise<unknown> {
  if (opts.mode === "execute") {
    return client.post(opts.executePath, opts.body);
  }
  // preview: hit the dry validate endpoint; surface failures rather than throwing.
  let validation: Record<string, unknown>;
  try {
    validation = { ok: true, response: await client.post(opts.validatePath, opts.body) };
  } catch (err) {
    validation = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  return { mode: "preview", validation, payload: opts.body };
}
