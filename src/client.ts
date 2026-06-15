export type FetchImpl = typeof fetch;

export interface TimeLogClientOptions {
  baseUrl: string;
  pat: string;
  fetchImpl?: FetchImpl;
}

export type QueryParams = Record<string, string | number | boolean | undefined>;

export class TimeLogClient {
  private readonly baseUrl: string;
  private readonly pat: string;
  private readonly fetchImpl: FetchImpl;

  constructor(opts: TimeLogClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.pat = opts.pat;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private buildUrl(path: string, query?: QueryParams): string {
    let url = `${this.baseUrl}${path}`;
    if (query) {
      const qs = Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
      if (qs) url += `?${qs}`;
    }
    return url;
  }

  private async request<T>(method: string, path: string, query?: QueryParams, body?: unknown): Promise<T> {
    const res = await this.fetchImpl(this.buildUrl(path, query), {
      method,
      headers: {
        Authorization: `Bearer ${this.pat}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`TimeLog API ${method} ${path} failed: ${res.status} ${text}`);
    }
    return (text ? JSON.parse(text) : null) as T;
  }

  get<T = unknown>(path: string, query?: QueryParams): Promise<T> {
    return this.request<T>("GET", path, query);
  }

  put<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", path, undefined, body);
  }

  post<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, undefined, body);
  }
}
