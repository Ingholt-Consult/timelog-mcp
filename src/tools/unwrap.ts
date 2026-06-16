// TimeLog list ("TAFList") endpoints wrap rows as { Entities: [{ Properties: {...} }] }.
// A few endpoints are mis-typed in the swagger and return a plain array instead.
// This normalises both into a flat row array; unknown shapes yield [].
export function unwrapList(resp: unknown): Record<string, unknown>[] {
  const entities = (resp as { Entities?: { Properties?: Record<string, unknown> }[] })?.Entities;
  if (Array.isArray(entities)) {
    return entities.map((e) => (e.Properties ?? e)) as Record<string, unknown>[];
  }
  if (Array.isArray(resp)) return resp as Record<string, unknown>[];
  return [];
}
