// snake_case (DB) ↔ camelCase (wire/TS) mapping. Per the architecture, this conversion
// lives ONLY in the repository layer and never leaks snake_case to clients.

function toCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** Convert a DB row (snake_case keys) to a camelCase object. */
export function rowToCamel<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v;
  return out as T;
}

/** Convert a camelCase object to snake_case keys for SQL. */
export function camelToRow(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[toSnake(k)] = v;
  return out;
}
