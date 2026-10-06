import { isContinuityCue } from "./continuityAnchorRetriever";

/** Orient retrieval only. A saved goal is context, not new authorization. */
export function memoryRecallQuery(userText: string, currentGoal?: string | null): string {
  const query = userText.trim();
  const acknowledgment = /^(?:ok(?:ay)?|yes|yeah|yep|sure|go|sounds good|all right|alright|kk)[.!\s]*$/i.test(query);
  const goal = currentGoal?.trim();
  if (goal && (acknowledgment || isContinuityCue(query)))
    return `${goal.slice(0, 600)}\n${query.slice(0, 1400)}`;
  return query.slice(0, 2000);
}
