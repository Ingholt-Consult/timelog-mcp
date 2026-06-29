import { existsSync } from "node:fs";
import { createApp } from "./server.js";

// Load .env for local runs; multitenant deploys set env vars directly
// (and send the PAT via the Authorization header). Node's parser also
// strips surrounding quotes, so a quoted token in .env is tolerated.
if (existsSync(".env")) {
  process.loadEnvFile();
}

const port = Number(process.env.PORT ?? 8787);
createApp().listen(port, () => {
  console.error(`TimeLog MCP listening on http://localhost:${port}/mcp`);
});
