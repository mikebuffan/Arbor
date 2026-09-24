/**
 * Read-only external verification of an independently deployed ARK Preview MCP
 * host. Does not authorize, send OAuth tokens, invoke tools, or mutate ARK.
 */
const PREVIEW_REF = "tzbpjbhroxiqftqwatnb";
const PREVIEW_AUTH_ISSUER = `https://${PREVIEW_REF}.supabase.co/auth/v1`;

export type PreviewMcpHostProof = {
  resource: string;
  issuer: string;
  unauthenticatedStatus: 401;
  readOnlyHostGate: true;
};

type FetchOnly = (url: string, init: RequestInit) => Promise<Response>;

function approvedMcpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("ark_preview_mcp_invalid_url");
  }
  if (
    url.protocol !== "https:" ||
    url.pathname !== "/api/mcp" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("ark_preview_mcp_invalid_url");
  }
  return url;
}

export async function checkArkPreviewMcpHost(
  rawUrl: string,
  fetchOnly: FetchOnly = (url, init) => fetch(url, init),
): Promise<PreviewMcpHostProof> {
  const url = approvedMcpUrl(rawUrl);
  const resource = url.toString();
  const metadataUrl = new URL("/.well-known/oauth-protected-resource", url);
  const metadataResponse = await fetchOnly(metadataUrl.toString(), {
    redirect: "manual",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!metadataResponse.ok || metadataResponse.status !== 200) {
    throw new Error("ark_preview_mcp_metadata_unavailable");
  }
  let data: unknown;
  try {
    data = await metadataResponse.json();
  } catch {
    throw new Error("ark_preview_mcp_metadata_invalid");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("ark_preview_mcp_metadata_invalid");
  }
  const metadata = data as Record<string, unknown>;
  if (
    metadata.resource !== resource ||
    !Array.isArray(metadata.authorization_servers) ||
    metadata.authorization_servers.length !== 1 ||
    metadata.authorization_servers[0] !== PREVIEW_AUTH_ISSUER
  ) {
    throw new Error("ark_preview_mcp_wrong_resource_or_issuer");
  }
  // Reject a server that accidentally exposes MCP without authentication.
  const unauthenticated = await fetchOnly(resource, {
    redirect: "manual",
    headers: { Accept: "application/json, text/event-stream" },
    signal: AbortSignal.timeout(10_000),
  });
  if (unauthenticated.status !== 401) {
    throw new Error("ark_preview_mcp_auth_not_enforced");
  }
  return {
    resource,
    issuer: PREVIEW_AUTH_ISSUER,
    unauthenticatedStatus: 401,
    readOnlyHostGate: true,
  };
}
