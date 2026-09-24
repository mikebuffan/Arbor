/**
 * Manual read-only test of a separately deployed Preview MCP endpoint.
 * Usage (from repository root):
 *   corepack pnpm --filter firefly-backend exec tsx scripts/ark/check-preview-mcp-host.ts https://HOST/api/mcp
 * Never pass an OAuth token or service-role key to this program.
 */
import { checkArkPreviewMcpHost } from "../../lib/mcp/previewHostAcceptance";

async function main() {
  const url = process.argv[2] ?? "";
  if (process.argv.length !== 3) {
    throw new Error("ark_preview_mcp_host_url_required");
  }
  const result = await checkArkPreviewMcpHost(url);
  process.stdout.write(JSON.stringify(result) + "\n");
}

void main().catch((error: unknown) => {
  const message = error instanceof Error &&
    /^ark_preview_mcp_[a-z_]+$/.test(error.message)
    ? error.message : "ark_preview_mcp_network_or_response_failed";
  process.stderr.write(message + "\n");
  process.exitCode = 1;
});
