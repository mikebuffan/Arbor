import { beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Unit tests must stub their request boundary. Deny accidental provider/DB
// requests before imports as well as between tests; never send test payloads.
const denyNetwork = async () => {
  throw new Error("unit_tests_unexpected_network_request");
};
vi.stubGlobal("fetch", denyNetwork);
beforeEach(() => vi.stubGlobal("fetch", denyNetwork));
