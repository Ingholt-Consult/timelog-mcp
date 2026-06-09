export interface Config {
  baseUrl: string;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const raw = env.TIMELOG_BASE_URL;
  if (!raw) {
    throw new Error("TIMELOG_BASE_URL is required");
  }
  return { baseUrl: raw.replace(/\/+$/, "") };
}
