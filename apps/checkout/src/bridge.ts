import {
  CHANNEL,
  isHostMessage,
  type CloseReason,
  type ErrorCode,
} from "@embd/protocol";

type Outgoing =
  | { type: "ready" }
  | { type: "success"; sessionId: string }
  | { type: "error"; code: ErrorCode; message: string }
  | { type: "close"; reason: CloseReason };

export function postToHost(message: Outgoing) {
  window.parent.postMessage({ channel: CHANNEL, ...message }, "*");
}

export function onHostClose(handler: () => void) {
  function onMessage(event: MessageEvent) {
    if (event.source !== window.parent) return;
    if (!isHostMessage(event.data)) return;
    handler();
  }

  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}

export function postError(code: ErrorCode, message: string) {
  postToHost({ type: "error", code, message });
}

export function postClose(reason: CloseReason) {
  postToHost({ type: "close", reason });
}
