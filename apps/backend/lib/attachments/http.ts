import { NextResponse } from "next/server";
import { z } from "zod";
import {
  RouteAccessError,
  routeErrorResponse,
} from "@/lib/auth/routeAuthorization";

export const AttachmentScopeBody = z
  .object({
    attachmentId: z.string().uuid(),
    projectId: z.string().uuid(),
    conversationId: z.string().uuid(),
  })
  .strict();

export const AttachmentDeleteBody = AttachmentScopeBody.extend({
  reason: z.string().trim().min(1).max(240).optional(),
}).strict();

function responseHeaders(req: Request): Record<string, string> {
  return {
    "access-control-allow-origin": req.headers.get("origin") ?? "*",
    vary: "origin",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers":
      "content-type, authorization, apikey, x-client-info",
    "access-control-max-age": "86400",
    "cache-control": "no-store",
  };
}

function applyResponseHeaders(req: Request, response: NextResponse): NextResponse {
  for (const [name, value] of Object.entries(responseHeaders(req))) {
    response.headers.set(name, value);
  }
  return response;
}

export function attachmentJsonResponse(
  req: Request,
  body: unknown,
  status: number,
): NextResponse {
  return applyResponseHeaders(req, NextResponse.json(body, { status }));
}

export function attachmentErrorResponse(
  req: Request,
  error: unknown,
): NextResponse {
  let normalizedError = error;
  if (error instanceof RouteAccessError && error.status === 401) {
    normalizedError = new RouteAccessError(401, "invalid_token");
  } else if (error instanceof RouteAccessError && error.status === 404) {
    normalizedError = new RouteAccessError(404, "attachment_not_found");
  } else if (error instanceof RouteAccessError && error.status === 500) {
    normalizedError = new RouteAccessError(500, "server_error");
  }

  return applyResponseHeaders(req, routeErrorResponse(normalizedError));
}

export function attachmentOptionsResponse(req: Request): Response {
  return new Response(null, { status: 204, headers: responseHeaders(req) });
}
