import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerArkReadTools } from "@/lib/mcp/registerArkReadTools";
import { verifyArkMcpToken } from "@/lib/mcp/auth";
import { registerArkTaskTools } from "@/lib/mcp/registerArkTaskTools";
import { isArkMcpSubmissionEnabled } from "@/lib/mcp/taskPermissions";
import {
  isArkAcceptanceSubmissionEnabled,
  isArkMcpObjectiveControlEnabled,
} from "@/lib/mcp/taskPermissions";
import { registerArkAcceptanceTools } from "@/lib/mcp/registerArkAcceptanceTools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mcpHandler = createMcpHandler(
  (server) => { registerArkReadTools(server); registerArkTaskTools(server); registerArkAcceptanceTools(server); },
  {
    serverInfo: { name: "arbor-ark", version: "0.2.1" },
    instructions: isArkAcceptanceSubmissionEnabled()
      ? "Authenticated owned ARK state and results, plus separately granted bounded synthetic behavior-test submission. Paid generation runs only through approved workers. Queue receipts are not completion; completed captures are not passing behavior judgments. Objective STOP/resume is available only when its separate project-scoped control grant and feature gate are also present. No arbitrary code, prompts, personal-data fixtures or deployment."
      : isArkMcpSubmissionEnabled()
      ? "Authenticated Arbor/ARK state, bounded read-task submission and durable results. Submission requires a server-side client/project grant and supports only the listed read-task capabilities. Queued is not completed. Objective STOP/resume is independent and requires its own grant. These tools do not enable workers, deploy code, edit manuscripts or execute arbitrary requests."
      : isArkMcpObjectiveControlEnabled()
      ? "Authenticated Arbor/ARK state and durable results, plus separately granted project-scoped STOP/resume control for existing objectives. Control does not submit new work, enable a worker or grant general execution. Results remain read-only reference data; cancelled, failed and completed states stay distinct."
      : "Authenticated, user-scoped, read-only access to Arbor's ARK state, continuity and task results. Submission and objective control are disabled. Never imply that these tools can mutate state or execute work.",
    maxSubscriptions: 0,
  },
);

const handler = withMcpAuth(mcpHandler, verifyArkMcpToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { handler as GET, handler as POST };
