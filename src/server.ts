import express, { type Request, type Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { TimeLogClient } from "./client.js";
import { loadConfig, type Config } from "./config.js";
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

// Stateless transport options. On a shared deployment, ALLOWED_HOSTS turns on the SDK's
// DNS-rebinding protection (rejects requests whose Host header isn't allow-listed); with
// no allowedHosts the protection stays off so local runs on localhost just work.
export function transportOptions(config: Config) {
  if (config.allowedHosts) {
    return {
      sessionIdGenerator: undefined,
      enableDnsRebindingProtection: true,
      allowedHosts: config.allowedHosts,
    };
  }
  return { sessionIdGenerator: undefined };
}

export function createApp() {
  const config = loadConfig();
  const app = express();
  app.use(express.json());

  // Liveness probe for the Windows service / Docker healthcheck / load balancer.
  // No PAT required — it touches nothing and reveals nothing sensitive.
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.post("/mcp", async (req: Request, res: Response) => {
    const pat = resolvePat(req.header("authorization"), process.env);
    if (!pat) {
      res.status(401).json({ error: "No PAT: set TIMELOG_PAT or send Authorization: Bearer <pat>." });
      return;
    }

    const client = new TimeLogClient({ baseUrl: config.baseUrl, pat });
    const server = new McpServer({ name: "timelog-mcp", version: "0.1.0" });
    registerTools(server, client);

    const transport = new StreamableHTTPServerTransport(transportOptions(config));
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  return app;
}
