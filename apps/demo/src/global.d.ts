import type { CheckoutHandle, OpenOptions } from "@embd/sdk";

declare global {
  interface Window {
    EmbdCheckout?: {
      open: (options: OpenOptions) => CheckoutHandle;
      close: () => void;
    };
  }
}

export {};
