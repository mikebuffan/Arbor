/**
 * Keep interactive chat execution separate from background ARK canaries.
 * Enabling the heartbeat worker must not automatically replace normal
 * conversational tool execution with durable ARK dispatch.
 */
export function isArkChatExecutionEnabled(flags: {
  ARBOR_ENABLE_ARK_EXECUTION?: string;
  ARBOR_ENABLE_ARK_CHAT_EXECUTION?: string;
}): boolean {
  return flags.ARBOR_ENABLE_ARK_EXECUTION === "true"
    && flags.ARBOR_ENABLE_ARK_CHAT_EXECUTION === "true";
}
