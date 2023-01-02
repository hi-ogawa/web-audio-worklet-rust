export function cls(...values: unknown[]): string {
  return values.filter(Boolean).join(" ");
}
