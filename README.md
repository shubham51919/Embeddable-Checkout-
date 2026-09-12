# Embeddable checkout

one script, one function, card details never touch the host page.

## Live demo

- **Demo store (open this):** [https://embd-demo.vercel.app](https://embd-demo.vercel.app)
- **Checkout host (iframe origin):** [https://embeddable-checkout-sdk.vercel.app](https://embeddable-checkout-sdk.vercel.app)
- **Source:** [https://github.com/shubham51919/Embeddable-Checkout-](https://github.com/shubham51919/Embeddable-Checkout-)

The demo page loads `embd-checkout.js`, which opens checkout in an iframe from the checkout host. Card details never touch the demo origin.

## Add checkout to your site

One script tag, then call `EmbdCheckout.open` from a button (or anywhere). The SDK paints a full-viewport iframe; your page never sees the card form.

```html
<script src="https://embd-demo.vercel.app/embd-checkout.js"></script>

<button id="buy">Buy Pro — $29/mo</button>

<script>
  document.getElementById("buy").addEventListener("click", () => {
    EmbdCheckout.open({
      productId: "prod_demo_lifetime",
      onSuccess: ({ sessionId }) => {
        console.log("paid", sessionId);
      },
      onClose: ({ reason }) => {
        console.log("closed", reason);
      },
      onError: ({ code, message }) => {
        console.error(code, message);
      },
    });
  });
</script>
```

Notes:

- `productId` is required. Demo catalog id: `prod_demo_lifetime` (Vellum Pro, $29/mo). Unknown ids fire `onError` with `unknown_product`.
- Price comes from the checkout catalog, not from your page — hosts cannot underpay by passing a cheaper amount.
- Self-host the script if you prefer: build with `VITE_CHECKOUT_ORIGIN` set to your checkout origin, then serve `embd-checkout.js` from your CDN. The origin is baked in at build time.

## Run it locally

```bash
npm install
npm run dev
```

Open [http://localhost:5273](http://localhost:5273). The demo store (Vellum) loads the SDK. The checkout UI lives on `http://localhost:5274` and only appears inside an iframe the SDK creates.

```bash
npm test          # Luhn + the three test cards
npm run build     # SDK script, checkout app, demo
```

## Deploy

Two Vercel projects (two origins):

1. **Checkout** — build `npm run build -w checkout`, output `apps/checkout/dist`  
   Live: `https://embeddable-checkout-sdk.vercel.app`

2. **Demo** — build with the checkout origin baked into the SDK:

```bash
VITE_CHECKOUT_ORIGIN=https://embeddable-checkout-sdk.vercel.app npm run build -w @embd/sdk && npm run build -w demo
```

Output: `apps/demo/dist`  
Live: `https://embd-demo.vercel.app`

The demo page expects `/embd-checkout.js` next to it (the SDK build writes that file into `apps/demo/public`).

## How the pieces talk

The host page never mounts a card form. `EmbdCheckout.open({ productId })` creates a full-viewport iframe pointed at the checkout app, with `productId` and a `sessionId` on the query string.

The iframe posts messages on a named channel (`embd-checkout`): `ready`, `success`, `error`, `close`. The SDK ignores anything that is not from the checkout origin and not from that iframe’s `contentWindow`. Card number, expiry, and CVC are not in that channel. `onSuccess` is `{ sessionId }` and nothing else.

Price is not a host argument. The checkout app looks up `productId` in its own catalog. An unknown id fires `onError({ code: "unknown_product" })` and shows a dead-end state instead of an empty form.

If the iframe never says `ready` (8s), the SDK tears itself down and reports `iframe_timeout`. A second `open` while one is up is a no-op: same overlay, no second charge.

## Two decisions I went back and forth on

**1. last4 to the host, or not.**

The brief’s success payload is `{ sessionId }`. Sending last4 (or brand, or email) would make a merchant receipt trivial, and plenty of real checkouts do it. I left it out. The host asked whether they got paid, not for card metadata, and it is a short walk from last4 to “just the expiry too.” If Vellum needs a receipt later, it looks up the session on a server that actually saw the charge.

**2. Confirm on close.**

Instant dismiss feels faster. Losing a half-typed card feels worse, and I did not want a confirm on every accidental overlay click. Compromise: empty form closes immediately. Once email or card has anything in it, checkout asks. The receipt does not ask — they already paid.

## Test cards

- `4242 4242 4242 4242` succeeds
- `4000 0000 0000 0002` declines (stay, try another card)
- `4000 0000 0000 0341` fails once, then succeeds on retry
