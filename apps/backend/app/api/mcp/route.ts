import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerArkReadTools } from "@/lib/mcp/registerArkReadTools";
import { registerArkSubmissionTool } from "@/lib/mcp/registerArkSubmissionTool";
import { verifyArkMcpToken } from "@/lib/mcp/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mcpHandler = createMcpHandler(
  (server) => {
    registerArkReadTools(server);
    registerArkSubmissionTool(server);
  },
  {
    serverInfo: { name: "arbor-ark", version: "0.2.0" },
    instructions: "Authenticated, user-scoped access to Arbor's ARK status and continuity. A separately gated Preview tool may enqueue bounded research, but it never starts execution.",
    maxSubscriptions: 0,
  },
);

const handler = withMcpAuth(mcpHandler, verifyArkMcpToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { handler as GET, handler as POST };
