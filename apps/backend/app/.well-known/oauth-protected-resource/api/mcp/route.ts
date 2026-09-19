import {
  GET as protectedResourceMetadata,
  OPTIONS as protectedResourceMetadataOptions,
} from "@/app/.well-known/oauth-protected-resource/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// RFC 9728's path-specific well-known location for /api/mcp.
export const GET = protectedResourceMetadata;
export const OPTIONS = protectedResourceMetadataOptions;
