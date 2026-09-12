import { describe, expect, it } from "vitest";
import { luhn } from "./card";
import { createProcessor } from "./payment";

const instant = { delay: async () => {} };

describe("luhn", () => {
  it("accepts the success test card", () => {
    expect(luhn("4242424242424242")).toBe(true);
  });

  it("accepts the decline and retry cards", () => {
    expect(luhn("4000000000000002")).toBe(true);
    expect(luhn("4000000000000341")).toBe(true);
  });

  it("rejects a transposed number", () => {
    expect(luhn("4242424242424241")).toBe(false);
  });
});

describe("processor", () => {
  it("charges the success card", async () => {
    const pay = createProcessor(instant);
    await expect(pay.charge("4242 4242 4242 4242", "sess_1")).resolves.toEqual({
      ok: true,
    });
  });

  it("hard-declines 0002", async () => {
    const pay = createProcessor(instant);
    const result = await pay.charge("4000000000000002", "sess_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("payment_declined");
  });

  it("fails 0341 once, then succeeds on the same session", async () => {
    const pay = createProcessor(instant);
    const first = await pay.charge("4000000000000341", "sess_retry");
    const second = await pay.charge("4000000000000341", "sess_retry");
    expect(first).toMatchObject({ ok: false, code: "payment_failed" });
    expect(second).toEqual({ ok: true });
  });

  it("does not share the 0341 retry across sessions", async () => {
    const pay = createProcessor(instant);
    const a = await pay.charge("4000000000000341", "sess_a");
    const b = await pay.charge("4000000000000341", "sess_b");
    expect(a).toMatchObject({ ok: false, code: "payment_failed" });
    expect(b).toMatchObject({ ok: false, code: "payment_failed" });
  });
});
