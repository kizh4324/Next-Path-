/** Join class names, dropping falsy values. Keeps conditional classes readable. */
export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}
