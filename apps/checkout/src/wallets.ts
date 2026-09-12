import { formatCard } from "./card";

export type WalletCard = {
  id: "pays" | "declines" | "retries";
  holder: string;
  label: string;
  pan: string;
  expiry: string;
  cvc: string;
  zip: string;
  theme: "navy" | "wine" | "pine";
  outcome: string;
};

export const wallet: WalletCard[] = [
  {
    id: "pays",
    holder: "Ada Chen",
    label: "Pays",
    pan: "4242424242424242",
    expiry: "12 / 29",
    cvc: "123",
    zip: "10001",
    theme: "navy",
    outcome: "This charge will go through.",
  },
  {
    id: "declines",
    holder: "Jules Park",
    label: "Declines",
    pan: "4000000000000002",
    expiry: "08 / 28",
    cvc: "298",
    zip: "10001",
    theme: "wine",
    outcome: "The bank will decline this card.",
  },
  {
    id: "retries",
    holder: "Sam Okonkwo",
    label: "Retries",
    pan: "4000000000000341",
    expiry: "04 / 30",
    cvc: "456",
    zip: "94107",
    theme: "pine",
    outcome: "Fails once, then succeeds if you pay again.",
  },
];

export function last4(pan: string) {
  return pan.slice(-4);
}

export function prettyPan(pan: string) {
  return formatCard(pan);
}
