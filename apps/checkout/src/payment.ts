export type Delay = (ms: number) => Promise<void>;

export type ChargeResult =
  | { ok: true }
  | {
      ok: false;
      code: "payment_declined" | "payment_failed";
      message: string;
    };

const SUCCESS = "4242424242424242";
const DECLINE = "4000000000000002";
const RETRY_THEN_OK = "4000000000000341";

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function createProcessor(options?: { delay?: Delay }) {
  const delay = options?.delay ?? wait;
  const seen = new Set<string>();

  return {
    async charge(card: string, sessionId: string): Promise<ChargeResult> {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return {
          ok: false,
          code: "payment_failed",
          message: "You're offline. Nothing was charged.",
        };
      }

      await delay(1400);

      const pan = card.replace(/\D/g, "");

      if (pan === SUCCESS) return { ok: true };

      if (pan === DECLINE) {
        return {
          ok: false,
          code: "payment_declined",
          message:
            "Your bank declined this card. Nothing was charged. Try a different card.",
        };
      }

      if (pan === RETRY_THEN_OK) {
        const key = `${sessionId}:${RETRY_THEN_OK}`;
        if (!seen.has(key)) {
          seen.add(key);
          return {
            ok: false,
            code: "payment_failed",
            message: "We couldn't reach your bank. Nothing was charged.",
          };
        }
        return { ok: true };
      }

      return {
        ok: false,
        code: "payment_declined",
        message: "This card isn't supported here. Use one of the test cards.",
      };
    },
  };
}

export const processor = createProcessor();
