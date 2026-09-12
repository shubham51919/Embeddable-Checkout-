import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import {
  brand,
  formatAmount,
  formatCard,
  formatExpiry,
  luhn,
  validEmail,
  validExpiry,
} from "./card";
import { processor } from "./payment";
import { getProduct } from "./products";
import { onHostClose, postClose, postError, postToHost } from "./bridge";
import { last4, prettyPan, wallet, type WalletCard } from "./wallets";
import { VirtualCard } from "./VirtualCard";
import type { CloseReason } from "@embd/protocol";

type Screen = "form" | "receipt" | "unknown";

const params = new URLSearchParams(window.location.search);
const productId = params.get("productId");
const sessionId = params.get("sessionId") ?? `sess_${crypto.randomUUID()}`;
const product = getProduct(productId);
let announced = false;

export function App() {
  const [screen, setScreen] = useState<Screen>(product ? "form" : "unknown");
  const [email, setEmail] = useState("");
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [payWith, setPayWith] = useState<"new" | "wallet">("new");
  const [picked, setPicked] = useState<WalletCard | null>(null);

  const closed = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  const errorId = useId();
  const titleId = useId();

  const dirty =
    email.trim() !== "" || card !== "" || expiry !== "" || cvc !== "" || picked !== null;
  const amount = product ? formatAmount(product.amountCents) : "";
  const cardBrand = useMemo(() => brand(card), [card]);

  function leave(reason: CloseReason) {
    if (closed.current) return;
    closed.current = true;
    postClose(reason);
  }

  function requestLeave() {
    if (busy) return;
    if (screen === "receipt") {
      leave("completed");
      return;
    }
    if (screen === "unknown") {
      leave("error");
      return;
    }
    if (dirty) {
      setConfirmLeave(true);
      return;
    }
    leave("dismissed");
  }

  const requestLeaveRef = useRef(requestLeave);
  requestLeaveRef.current = requestLeave;

  useEffect(() => {
    if (announced) return;
    announced = true;
    postToHost({ type: "ready" });
    if (!product) {
      postError("unknown_product", "That product does not exist.");
    }
  }, []);

  useEffect(() => onHostClose(() => requestLeaveRef.current()), []);

  useEffect(() => {
    if (screen === "form") {
      emailRef.current?.focus();
    }
  }, [screen]);

  useEffect(() => {
    if (confirmLeave) stayRef.current?.focus();
  }, [confirmLeave]);

  useEffect(() => {
    const selector =
      'button:not([disabled]), input:not([disabled]), [href], select, textarea, [tabindex]:not([tabindex="-1"])';

    function onKey(event: KeyboardEvent) {
      const trapRoot = dialogRef.current;
      if (!trapRoot) return;

      if (event.key === "Escape") {
        event.preventDefault();
        if (confirmLeave) {
          setConfirmLeave(false);
          return;
        }
        requestLeave();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = [...trapRoot.querySelectorAll<HTMLElement>(selector)].filter(
        (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  function applyWallet(next: WalletCard) {
    setPicked(next);
    setCard(prettyPan(next.pan));
    setExpiry(next.expiry);
    setCvc(next.cvc);
    setFieldErrors((prev) => ({ ...prev, card: "", expiry: "", cvc: "" }));
    setError(null);
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!validEmail(email)) next.email = "Enter a valid email.";
    if (payWith === "wallet" && !picked) {
      next.card = "Choose a card.";
    } else {
      if (!luhn(card)) next.card = "Check the card number.";
      if (!validExpiry(expiry)) next.expiry = "Enter a valid expiry.";
      if (!/^\d{3,4}$/.test(cvc)) next.cvc = "Enter the CVC.";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onPay(event: FormEvent) {
    event.preventDefault();
    if (busy || !product) return;
    setError(null);
    setRetryable(false);
    if (!validate()) return;

    setBusy(true);
    const result = await processor.charge(card, sessionId);
    setBusy(false);

    if (result.ok) {
      postToHost({ type: "success", sessionId });
      setScreen("receipt");
      setConfirmLeave(false);
      return;
    }

    postError(result.code, result.message);
    setError(result.message);
    setRetryable(result.code === "payment_failed");
  }

  return (
    <div className="backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) requestLeave();
    }}>
      <div
        className="sheet"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button className="icon-close" type="button" onClick={requestLeave} aria-label="Close checkout">
          <CloseIcon />
        </button>

        {screen === "unknown" && (
          <div className="stack">
            <h1 id={titleId} className="title">This payment link is not valid</h1>
            <p className="copy">The product on this checkout does not exist. Nothing was charged.</p>
            <button className="primary" type="button" onClick={() => leave("error")}>
              Close
            </button>
          </div>
        )}

        {screen === "receipt" && product && (
          <div className="stack">
            <p className="eyebrow">Paid</p>
            <h1 id={titleId} className="title">You are in.</h1>
            <p className="copy">A receipt is on its way to {email}.</p>
            <dl className="receipt">
              <div><dt>Product</dt><dd>{product.name}</dd></div>
              <div><dt>Amount</dt><dd>{amount}</dd></div>
              <div><dt>Session</dt><dd className="mono">{sessionId}</dd></div>
            </dl>
            <button className="primary" type="button" onClick={() => leave("completed")}>
              Done
            </button>
          </div>
        )}

        {screen === "form" && product && (
          <form
            className="stack"
            onSubmit={onPay}
            noValidate
            aria-describedby={error ? errorId : undefined}
          >
            <header className="mast">
              <div>
                <p className="merchant">{product.merchant}</p>
                <h1 id={titleId} className="product">{product.name}</h1>
              </div>
              <p className="amount">{amount}</p>
            </header>

            <label className="field">
              <span>Email</span>
              <input
                ref={emailRef}
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                disabled={busy}
                aria-invalid={Boolean(fieldErrors.email)}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: "" }));
                }}
              />
              {fieldErrors.email && <em>{fieldErrors.email}</em>}
            </label>

            <div className="pay-switch" role="tablist" aria-label="Payment method">
              <button
                type="button"
                role="tab"
                aria-selected={payWith === "new"}
                disabled={busy}
                onClick={() => setPayWith("new")}
              >
                New card
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={payWith === "wallet"}
                disabled={busy}
                onClick={() => setPayWith("wallet")}
              >
                My cards
              </button>
            </div>

            {payWith === "new" && (
              <>
                <label className="field">
                  <span>Card</span>
                  <span className="card-wrap">
                    <input
                      type="text"
                      name="cardnumber"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="1234 1234 1234 1234"
                      value={card}
                      disabled={busy}
                      aria-invalid={Boolean(fieldErrors.card)}
                      onChange={(e) => {
                        setPicked(null);
                        setCard(formatCard(e.target.value));
                        setFieldErrors((prev) => ({ ...prev, card: "" }));
                      }}
                    />
                    <span className="brand" aria-hidden="true">{cardBrand}</span>
                  </span>
                  {fieldErrors.card && <em>{fieldErrors.card}</em>}
                </label>

                <div className="row">
                  <label className="field">
                    <span>Expiry</span>
                    <input
                      type="text"
                      name="cc-exp"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="MM / YY"
                      value={expiry}
                      disabled={busy}
                      aria-invalid={Boolean(fieldErrors.expiry)}
                      onChange={(e) => {
                        setExpiry(formatExpiry(e.target.value));
                        setFieldErrors((prev) => ({ ...prev, expiry: "" }));
                      }}
                    />
                    {fieldErrors.expiry && <em>{fieldErrors.expiry}</em>}
                  </label>
                  <label className="field">
                    <span>CVC</span>
                    <input
                      type="text"
                      name="cvc"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="123"
                      maxLength={4}
                      value={cvc}
                      disabled={busy}
                      aria-invalid={Boolean(fieldErrors.cvc)}
                      onChange={(e) => {
                        setCvc(e.target.value.replace(/\D/g, "").slice(0, 4));
                        setFieldErrors((prev) => ({ ...prev, cvc: "" }));
                      }}
                    />
                    {fieldErrors.cvc && <em>{fieldErrors.cvc}</em>}
                  </label>
                </div>
              </>
            )}

            {payWith === "wallet" && !picked && (
              <div className="wallet-list">
                {wallet.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="wallet-row"
                    disabled={busy}
                    onClick={() => applyWallet(item)}
                  >
                    <span className={`wallet-chip theme-${item.theme}`} aria-hidden="true" />
                    <span className="wallet-row-copy">
                      <strong>{item.holder}</strong>
                      <span>Visa · {last4(item.pan)}</span>
                    </span>
                    <span className="wallet-tag">{item.label}</span>
                  </button>
                ))}
                {fieldErrors.card && <em className="wallet-error">{fieldErrors.card}</em>}
              </div>
            )}

            {payWith === "wallet" && picked && (
              <VirtualCard
                card={picked}
                amount={amount}
                disabled={busy}
                onBack={() => setPicked(null)}
              />
            )}

            {error && (
              <p className={retryable ? "banner warn" : "banner bad"} id={errorId} role="alert">
                {error}
              </p>
            )}

            <button className="primary" type="submit" disabled={busy} aria-busy={busy}>
              {busy ? `Charging ${amount}…` : retryable ? `Try again — ${amount}` : `Pay ${amount}`}
            </button>

            <p className="fineprint">
              <LockIcon /> Card details stay in this window. Vellum never sees them.
            </p>
          </form>
        )}

        {confirmLeave && (
          <div className="confirm" role="alertdialog" aria-labelledby="leave-title" aria-describedby="leave-copy">
            <h2 id="leave-title">Leave checkout?</h2>
            <p id="leave-copy">Your card details will be discarded. Nothing has been charged.</p>
            <div className="confirm-actions">
              <button
                ref={stayRef}
                type="button"
                className="ghost"
                onClick={() => setConfirmLeave(false)}
              >
                Stay
              </button>
              <button type="button" className="danger" onClick={() => leave("dismissed")}>
                Leave
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="2.25" y="5.5" width="7.5" height="5.25" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 5.5V3.8a2 2 0 0 1 4 0V5.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
