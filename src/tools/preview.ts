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

export interface RunBookingOptions {
  mode: WriteMode;
  bookPath: string;
  body: Record<string, unknown>;
  // Synthetic-preview source: read capacity for the period. /workload/book has no
  // validate-* twin (see ADR 0007), so preview surfaces capacity instead — the one
  // "dry" signal the API offers. It does NOT re-resolve Task/Employee names (ADR 0006).
  previewCapacity: () => Promise<unknown>;
}

const BOOKING_IRREVERSIBLE_NOTE =
  "En Booking kan IKKE fortrydes via API'et — der er ingen DELETE. Bekræft før du kører execute.";

export async function runBooking(client: TimeLogClient, opts: RunBookingOptions): Promise<unknown> {
  if (opts.mode === "execute") {
    return client.post(opts.bookPath, opts.body);
  }
  // preview: read capacity for the period; surface failures rather than throwing.
  let capacity: Record<string, unknown>;
  try {
    capacity = { ok: true, projection: await opts.previewCapacity() };
  } catch (err) {
    capacity = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  return { mode: "preview", capacity, note: BOOKING_IRREVERSIBLE_NOTE, payload: opts.body };
}
