import { z } from "zod";
import type { TimeLogClient } from "../client.js";

export interface ToolDef {
  name: string;
  description: string;
  // zod raw shape; empty object for tools with no input
  inputSchema: z.ZodRawShape;
  handler: (client: TimeLogClient, args: Record<string, unknown>) => Promise<unknown>;
}
