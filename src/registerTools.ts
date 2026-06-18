import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TimeLogClient } from "./client.js";
import type { ToolDef } from "./tools/types.js";
import { projectReadTools } from "./tools/projectReads.js";
import { relationReadTools } from "./tools/relationReads.js";
import { projectWriteTools } from "./tools/projectWrites.js";
import { constructionReadTools } from "./tools/constructionReads.js";
import { constructionWriteTools } from "./tools/constructionWrites.js";
import { resourceReadTools } from "./tools/resourceReads.js";
import { resourceWriteTools } from "./tools/resourceWrites.js";

export const allTools: ToolDef[] = [
  ...projectReadTools,
  ...relationReadTools,
  ...projectWriteTools,
  ...constructionReadTools,
  ...constructionWriteTools,
  ...resourceReadTools,
  ...resourceWriteTools,
];

export function registerTools(server: McpServer, client: TimeLogClient, tools: ToolDef[] = allTools): void {
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      async (args: Record<string, unknown>) => {
        try {
          const data = await tool.handler(client, args ?? {});
          return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { content: [{ type: "text" as const, text: message }], isError: true };
        }
      },
    );
  }
}
