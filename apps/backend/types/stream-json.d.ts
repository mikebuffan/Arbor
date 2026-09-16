declare module "stream-json" {
  import type { Transform } from "node:stream";
  export function parser(options?: Record<string, unknown>): Transform;
  const pkg: { parser: typeof parser };
  export default pkg;
}

declare module "stream-json/streamers/StreamArray" {
  import type { Transform } from "node:stream";
  export function streamArray(options?: Record<string, unknown>): Transform;
  const pkg: { streamArray: typeof streamArray };
  export default pkg;
}
