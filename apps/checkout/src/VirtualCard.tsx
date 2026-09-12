import { useState } from "react";
import { last4, prettyPan, type WalletCard } from "./wallets";

type Props = {
  card: WalletCard;
  amount: string;
  disabled?: boolean;
  onBack: () => void;
};

export function VirtualCard({ card, amount, disabled, onBack }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(card.pan);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="wallet-detail">
      <div className="wallet-detail-head">
        <button type="button" className="text-btn" onClick={onBack} disabled={disabled} aria-label="Back to my cards">
          <BackIcon />
        </button>
        <p>Your Virtual Card</p>
        <span className="wallet-head-spacer" />
      </div>

      <div className={`virtual-face theme-${card.theme}`}>
        <p className="virtual-brand">VISA</p>
        <div className="virtual-bottom">
          <p className="virtual-name">{`${card.holder}'s Virtual Card`}</p>
          <p className="virtual-amount">{amount}</p>
        </div>
        <span className="virtual-mark" aria-hidden="true">
          VISA
        </span>
      </div>

      <button type="button" className="copy-card" onClick={copyNumber} disabled={disabled}>
        <CopyIcon />
        {copied ? "Copied" : "Copy Card Number"}
      </button>

      <dl className="virtual-meta">
        <div>
          <dt>Card Number</dt>
          <dd>{prettyPan(card.pan)}</dd>
        </div>
        <div>
          <dt>Expiration Date</dt>
          <dd>{card.expiry.replace(/\s/g, "").replace(/^0/, "")}</dd>
        </div>
        <div>
          <dt>CVC</dt>
          <dd>{card.cvc}</dd>
        </div>
        <div>
          <dt>Zipcode</dt>
          <dd>{card.zip}</dd>
        </div>
        <div>
          <dt>Name on Card</dt>
          <dd>{card.holder}</dd>
        </div>
      </dl>

      <p className="wallet-hint">•••• {last4(card.pan)} · {card.outcome}</p>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M11.5 4.5L6.5 9l5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="4.5" y="4.5" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.5 9.5V3.2A.7.7 0 0 1 3.2 2.5h6.3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
