import { createApp } from "./server.js";

const port = Number(process.env.PORT ?? 8787);
createApp().listen(port, () => {
  console.error(`TimeLog MCP listening on http://localhost:${port}/mcp`);
});
