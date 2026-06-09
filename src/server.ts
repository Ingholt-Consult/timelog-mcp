import express, { type Request, type Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { TimeLogClient } from "./client.js";
import { loadConfig } from "./config.js";
import { registerTools } from "./registerTools.js";

export function resolvePat(
  authHeader: string | undefined,
  env: Record<string, string | undefined>,
): string | null {
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  return env.TIMELOG_PAT ?? null;
}

export function createApp() {
  const config = loadConfig();
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req: Request, res: Response) => {
    const pat = resolvePat(req.header("authorization"), process.env);
    if (!pat) {
      res.status(401).json({ error: "No PAT: set TIMELOG_PAT or send Authorization: Bearer <pat>." });
      return;
    }

    const client = new TimeLogClient({ baseUrl: config.baseUrl, pat });
    const server = new McpServer({ name: "timelog-mcp", version: "0.1.0" });
    registerTools(server, client);

    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  return app;
}
