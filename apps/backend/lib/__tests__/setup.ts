import { vi } from "vitest";

vi.mock("server-only", () => ({}));

// Unit checks must never send fixture or repository content to providers.
vi.stubGlobal("fetch", vi.fn(async () => {
  throw new Error("test_external_fetch_forbidden");
}));
