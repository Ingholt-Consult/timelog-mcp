export type FetchImpl = typeof fetch;

export interface TimeLogClientOptions {
  baseUrl: string;
  pat: string;
  fetchImpl?: FetchImpl;
}

export type QueryParams = Record<string, string | number | boolean | undefined>;

export class TimeLogClient {
  private readonly baseUrl: string;
  // The V2 surface (.../api/v2) is derived from the v1 base by swapping the version
  // segment. The Resource Planner (ADR 0009) lives here; v1 stays the default.
  private readonly baseUrlV2: string;
  private readonly pat: string;
  private readonly fetchImpl: FetchImpl;

  constructor(opts: TimeLogClientOptions) {
    this.baseUrl = opts.baseUrl;
    this.baseUrlV2 = opts.baseUrl.replace(/\/v\d+$/, "/v2");
    this.pat = opts.pat;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private buildUrl(base: string, path: string, query?: QueryParams): string {
    let url = `${base}${path}`;
    if (query) {
      const qs = Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
      if (qs) url += `?${qs}`;
    }
    return url;
  }

  private async request<T>(
    method: string,
    base: string,
    path: string,
    query?: QueryParams,
    body?: unknown,
  ): Promise<T> {
    const res = await this.fetchImpl(this.buildUrl(base, path, query), {
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
    return this.request<T>("GET", this.baseUrl, path, query);
  }

  put<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", this.baseUrl, path, undefined, body);
  }

  post<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", this.baseUrl, path, undefined, body);
  }

  // POST against the V2 surface. The Resource Planner reads pass their params in the
  // query with an empty body; book-hours passes a JSON body and no query.
  postV2<T = unknown>(path: string, body?: unknown, query?: QueryParams): Promise<T> {
    return this.request<T>("POST", this.baseUrlV2, path, query, body);
  }
}
