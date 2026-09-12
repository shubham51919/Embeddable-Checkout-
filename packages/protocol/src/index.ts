export const CHANNEL = "embd-checkout";

export type CloseReason = "dismissed" | "completed" | "error";

export type ErrorCode =
  | "invalid_config"
  | "unknown_product"
  | "iframe_timeout"
  | "payment_declined"
  | "payment_failed";

export type FrameMessage =
  | { channel: typeof CHANNEL; type: "ready" }
  | { channel: typeof CHANNEL; type: "success"; sessionId: string }
  | { channel: typeof CHANNEL; type: "error"; code: ErrorCode; message: string }
  | { channel: typeof CHANNEL; type: "close"; reason: CloseReason };

export type HostMessage = {
  channel: typeof CHANNEL;
  type: "request-close";
};

export function isFrameMessage(data: unknown): data is FrameMessage {
  if (!data || typeof data !== "object") return false;
  const message = data as Record<string, unknown>;
  if (message.channel !== CHANNEL) return false;
  if (message.type === "ready") return true;
  if (message.type === "success" && typeof message.sessionId === "string") return true;
  if (
    message.type === "error" &&
    typeof message.code === "string" &&
    typeof message.message === "string"
  ) {
    return true;
  }
  if (message.type === "close" && typeof message.reason === "string") return true;
  return false;
}

export function isHostMessage(data: unknown): data is HostMessage {
  if (!data || typeof data !== "object") return false;
  const message = data as Record<string, unknown>;
  return message.channel === CHANNEL && message.type === "request-close";
}
