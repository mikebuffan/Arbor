import type { IncomingMessage } from "node:http";

export function requireControlAuth(
  req: IncomingMessage,
): void {
  const expected = process.env.ARBOR_CONTROL_TOKEN;

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("control_token_not_configured");
    }

    return;
  }

  const header = req.headers.authorization;
  const supplied = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : "";

  if (supplied.length !== expected.length) {
    throw new Error("unauthorized");
  }

  let mismatch = 0;

  for (let index = 0; index < expected.length; index += 1) {
    mismatch |=
      expected.charCodeAt(index) ^
      supplied.charCodeAt(index);
  }

  if (mismatch !== 0) {
    throw new Error("unauthorized");
  }
}
