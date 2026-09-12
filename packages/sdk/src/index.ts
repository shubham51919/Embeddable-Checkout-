import {
  CHANNEL,
  isFrameMessage,
  type CloseReason,
  type ErrorCode,
} from "@embd/protocol";

declare const __CHECKOUT_ORIGIN__: string;

export type OpenOptions = {
  productId?: string;
  onSuccess?: (event: { sessionId: string }) => void;
  onClose?: (event: { reason: CloseReason }) => void;
  onError?: (event: { code: ErrorCode; message: string }) => void;
};

export type CheckoutHandle = {
  close: () => void;
};

const CHECKOUT_ORIGIN = __CHECKOUT_ORIGIN__.replace(/\/$/, "");
const READY_MS = 8000;

const IFRAME_STYLE = [
  "position:fixed",
  "inset:0",
  "width:100%",
  "height:100%",
  "border:0",
  "margin:0",
  "padding:0",
  "z-index:2147483646",
  "background:transparent",
  "color-scheme:none",
].join(";");

type Session = {
  iframe: HTMLIFrameElement;
  options: OpenOptions;
  ready: boolean;
  closed: boolean;
  timer: number;
  previousOverflow: string;
  previousFocus: HTMLElement | null;
  onMessage: (event: MessageEvent) => void;
};

let active: Session | null = null;

function emitError(options: OpenOptions, code: ErrorCode, message: string) {
  options.onError?.({ code, message });
}

function teardown(reason: CloseReason) {
  const session = active;
  if (!session || session.closed) return;

  session.closed = true;
  window.clearTimeout(session.timer);
  window.removeEventListener("message", session.onMessage);
  session.iframe.remove();
  document.body.style.overflow = session.previousOverflow;
  active = null;

  const focus = session.previousFocus;
  if (focus && document.contains(focus)) {
    focus.focus();
  }

  session.options.onClose?.({ reason });
}

function requestClose() {
  if (!active || active.closed) return;
  active.iframe.contentWindow?.postMessage(
    { channel: CHANNEL, type: "request-close" },
    CHECKOUT_ORIGIN,
  );
}

export function open(options: OpenOptions = {}): CheckoutHandle {
  if (active) {
    active.iframe.focus();
    return { close: requestClose };
  }

  const productId = options.productId?.trim();
  if (!productId) {
    emitError(options, "invalid_config", "productId is required.");
    return { close() {} };
  }

  const sessionId = `sess_${crypto.randomUUID()}`;
  const url = new URL(CHECKOUT_ORIGIN);
  url.searchParams.set("productId", productId);
  url.searchParams.set("sessionId", sessionId);

  const previousFocus =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  const iframe = document.createElement("iframe");
  iframe.src = url.toString();
  iframe.style.cssText = IFRAME_STYLE;
  iframe.setAttribute("allowtransparency", "true");
  iframe.title = "Secure checkout";
  iframe.setAttribute("role", "dialog");
  iframe.setAttribute("aria-modal", "true");

  const session: Session = {
    iframe,
    options,
    ready: false,
    closed: false,
    timer: 0,
    previousOverflow,
    previousFocus,
    onMessage,
  };

  function onMessage(event: MessageEvent) {
    // Host pages are untrusted. Only the checkout origin, and only this iframe.
    if (event.origin !== CHECKOUT_ORIGIN) return;
    if (event.source !== iframe.contentWindow) return;
    if (!isFrameMessage(event.data)) return;

    const message = event.data;
    if (message.type === "ready") {
      session.ready = true;
      window.clearTimeout(session.timer);
      return;
    }
    if (message.type === "success") {
      options.onSuccess?.({ sessionId: message.sessionId });
      return;
    }
    if (message.type === "error") {
      options.onError?.({ code: message.code, message: message.message });
      return;
    }
    if (message.type === "close") {
      teardown(message.reason);
    }
  }

  session.timer = window.setTimeout(() => {
    if (session.ready || session.closed) return;
    emitError(options, "iframe_timeout", "Checkout did not load. Try again.");
    teardown("error");
  }, READY_MS);

  window.addEventListener("message", onMessage);
  document.body.appendChild(iframe);
  active = session;

  return { close: requestClose };
}

export function close() {
  requestClose();
}
