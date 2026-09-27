import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerArkReadTools } from "@/lib/mcp/registerArkReadTools";
import { registerArkPreviewSubmitTool } from "@/lib/mcp/registerArkPreviewSubmitTool";
import { verifyArkMcpToken } from "@/lib/mcp/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mcpHandler = createMcpHandler(
  (server) => {
    registerArkReadTools(server);
    registerArkPreviewSubmitTool(server);
  },
  {
    serverInfo: { name: "arbor-ark", version: "0.1.0" },
    instructions: "Authenticated, user-scoped ARK Preview. Reads are safe; the bounded research submit tool only enqueues one task and never starts execution.",
    maxSubscriptions: 0,
  },
);

const handler = withMcpAuth(mcpHandler, verifyArkMcpToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { handler as GET, handler as POST };
