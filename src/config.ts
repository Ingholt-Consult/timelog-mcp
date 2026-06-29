export interface Config {
  baseUrl: string;
  // Host allow-list for the Streamable HTTP transport's DNS-rebinding protection.
  // Set via ALLOWED_HOSTS (comma-separated) on a shared deployment; left undefined for
  // local runs, where protection stays off so localhost just works.
  allowedHosts?: string[];
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const raw = env.TIMELOG_BASE_URL;
  if (!raw) {
    throw new Error("TIMELOG_BASE_URL is required");
  }
  const hosts = env.ALLOWED_HOSTS?.split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  return {
    baseUrl: raw.replace(/\/+$/, ""),
    allowedHosts: hosts && hosts.length > 0 ? hosts : undefined,
  };
}
