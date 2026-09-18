import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerArkReadTools } from "@/lib/mcp/registerArkReadTools";
import { verifyArkMcpToken } from "@/lib/mcp/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mcpHandler = createMcpHandler(
  (server) => registerArkReadTools(server),
  {
    serverInfo: { name: "arbor-ark", version: "0.1.0" },
    instructions: "Authenticated, user-scoped, read-only access to Arbor's ARK status and continuity. Never imply that these tools can mutate state or execute work.",
    maxSubscriptions: 0,
  },
);

const handler = withMcpAuth(mcpHandler, verifyArkMcpToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { handler as GET, handler as POST };
