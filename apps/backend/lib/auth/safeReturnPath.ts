/**
 * Accept only local relative return paths for login redirects. In particular,
 * a leading slash followed by a backslash is parsed as a host by URL parsers.
 * Never accept encoded separators or control characters in redirect targets.
 */
export function safeArborReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") ||
      /[\\\u0000-\u001f\u007f]|%2f|%5c/i.test(value)) return "/";
  try {
    const url = new URL(value, "https://arbor.invalid");
    if (url.origin !== "https://arbor.invalid" || !url.pathname.startsWith("/")) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
