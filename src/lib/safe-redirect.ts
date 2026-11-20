/** Returns a same-origin relative path, or "/" when the value is unsafe. */
export function safeRedirect(value: string | undefined | null): string {
  if (!value || typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
