import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export class RouteAccessError extends Error {
  constructor(
    readonly status: 401 | 403 | 404 | 409 | 500,
    readonly code: string,
  ) {
    super(code);
    this.name = "RouteAccessError";
  }
}

function constantTimeEquals(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || null;
}

export function requireAdminAuthorization(req: Request): void {
  const expected = process.env.ARBOR_ADMIN_TOKEN?.trim() ?? "";
  if (!expected) {
    throw new RouteAccessError(500, "admin_auth_not_configured");
  }

  const actual = req.headers.get("x-admin-token")?.trim() ?? "";

  if (!actual || !constantTimeEquals(actual, expected)) {
    throw new RouteAccessError(403, "admin_forbidden");
  }
}

export function requireMachineAuthorization(req: Request): void {
  const expected = process.env.CRON_SECRET?.trim() ?? "";
  if (!expected) {
    throw new RouteAccessError(500, "machine_auth_not_configured");
  }

  const actual = bearerToken(req);
  if (!actual || !constantTimeEquals(actual, expected)) {
    throw new RouteAccessError(401, "machine_auth_required");
  }
}

export function routeErrorResponse(error: unknown): NextResponse {
  if (error instanceof RouteAccessError) {
    return NextResponse.json(
      { ok: false, error: error.code },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { ok: false, error: "server_error" },
    { status: 500 },
  );
}
