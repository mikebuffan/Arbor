/**
 * Release cutover lock: remain fail-closed even if older ARK environment
 * switches happen to be enabled in a Vercel environment we cannot inspect.
 * This new variable must be deliberately enabled only after the live canary
 * has received separate user approval.
 */
export function isArkLiveExecutionUnlocked(value?: string): boolean {
  return value === "true";
}

/**
 * Keep interactive chat execution separate from background ARK canaries.
 * Enabling the heartbeat worker must not automatically replace normal
 * conversational tool execution with durable ARK dispatch.
 */
export function isArkChatExecutionEnabled(flags: {
  ARBOR_ARK_ENABLE_LIVE_EXECUTION?: string;
  ARBOR_ENABLE_ARK_EXECUTION?: string;
  ARBOR_ENABLE_ARK_CHAT_EXECUTION?: string;
}): boolean {
  return isArkLiveExecutionUnlocked(flags.ARBOR_ARK_ENABLE_LIVE_EXECUTION)
    && flags.ARBOR_ENABLE_ARK_EXECUTION === "true"
    && flags.ARBOR_ENABLE_ARK_CHAT_EXECUTION === "true";
}
