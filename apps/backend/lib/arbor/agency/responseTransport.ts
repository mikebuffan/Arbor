import type { Response, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";

// An invocation-scoped transport seam. Production callers keep the existing
// client; isolated evaluation can capture every generation and verification call.
export type AgencyResponseCreate = (request: ResponseCreateParamsNonStreaming) => Promise<Response>;
