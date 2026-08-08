import { createHash } from "node:crypto";

const CHAT_TURN_NAMESPACE = "3ab7ec5e-d63f-5f68-b9aa-8efbb0a57e21";

type TurnPurpose = "conversation" | "user-message" | "assistant-message";

function uuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replaceAll("-", ""), "hex");
}

function bytesToUuid(bytes: Buffer): string {
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function uuidV5(namespace: string, name: string): string {
  const digest = createHash("sha1")
    .update(uuidToBytes(namespace))
    .update(name, "utf8")
    .digest()
    .subarray(0, 16);

  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  return bytesToUuid(digest);
}

function deriveTurnUuid(params: {
  userId: string;
  turnId: string;
  purpose: TurnPurpose;
}): string {
  const { userId, turnId, purpose } = params;
  return uuidV5(
    CHAT_TURN_NAMESPACE,
    `arbor.chat:${userId}:${turnId}:${purpose}`,
  );
}

export function deriveChatTurnIds(params: {
  userId: string;
  turnId: string;
}) {
  const { userId, turnId } = params;
  return {
    conversationId: deriveTurnUuid({ userId, turnId, purpose: "conversation" }),
    userMessageId: deriveTurnUuid({ userId, turnId, purpose: "user-message" }),
    assistantMessageId: deriveTurnUuid({
      userId,
      turnId,
      purpose: "assistant-message",
    }),
  };
}
