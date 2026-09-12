export type Product = {
  id: string;
  merchant: string;
  name: string;
  amountCents: number;
};

const catalog: Record<string, Product> = {
  prod_demo_lifetime: {
    id: "prod_demo_lifetime",
    merchant: "Vellum",
    name: "Pro subscription",
    amountCents: 2900,
  },
};

export function getProduct(productId: string | null): Product | null {
  if (!productId) return null;
  return catalog[productId] ?? null;
}
