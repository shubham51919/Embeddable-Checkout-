# Tiny embeddable checkout

A checkout a stranger’s site can drop in: one script, one function, card details never touch the host page.

This is the take-home. Three pieces, no server.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:5273](http://localhost:5273). The demo store (Vellum) loads the SDK. The checkout UI lives on `http://localhost:5274` and only appears inside an iframe the SDK creates.

```bash
npm test          # Luhn + the three test cards
npm run build     # SDK script, checkout app, demo
```

To point the SDK at a hosted checkout origin instead of localhost:

```bash
VITE_CHECKOUT_ORIGIN=https://your-checkout.example npm run build -w @embd/sdk
```

Then serve `apps/checkout/dist` at that origin and `apps/demo/dist` as the storefront. The demo page expects `/embd-checkout.js` next to it (the SDK build writes that file into `apps/demo/public`).

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

## What I would explore next

- Server-minted, signed checkout sessions so a random page cannot open `prod_demo_lifetime` with a stolen script tag. The catalog-on-the-checkout-origin trick stops price tampering; it does not stop unpaid product access.
- 3DS / SCA, and a real processor behind the same iframe boundary.
- Theme tokens issued by a dashboard, not by host JavaScript. Hosts that can inject CSS can phish.
- An idempotency key on Pay so a double-click after a dropped response cannot charge twice. The UI already locks; the processor should too.

## Test cards

- `4242 4242 4242 4242` succeeds
- `4000 0000 0000 0002` declines (stay, try another card)
- `4000 0000 0000 0341` fails once, then succeeds on retry
