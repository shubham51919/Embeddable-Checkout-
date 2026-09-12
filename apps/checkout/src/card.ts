export function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function luhn(pan: string): boolean {
  const numbers = digits(pan);
  if (numbers.length < 13 || numbers.length > 19) return false;

  let sum = 0;
  let doubleIt = false;
  for (let i = numbers.length - 1; i >= 0; i--) {
    let n = Number(numbers[i]);
    if (doubleIt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    doubleIt = !doubleIt;
  }
  return sum % 10 === 0;
}

export function brand(pan: string): "visa" | "mastercard" | "amex" | "card" {
  const numbers = digits(pan);
  if (numbers.startsWith("4")) return "visa";
  if (/^5[1-5]/.test(numbers) || /^2[2-7]/.test(numbers)) return "mastercard";
  if (/^3[47]/.test(numbers)) return "amex";
  return "card";
}

export function formatCard(value: string) {
  const numbers = digits(value).slice(0, 16);
  return numbers.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function formatExpiry(value: string) {
  const numbers = digits(value).slice(0, 4);
  if (numbers.length <= 2) return numbers;
  return `${numbers.slice(0, 2)} / ${numbers.slice(2)}`;
}

export function validExpiry(value: string): boolean {
  const match = digits(value).match(/^(\d{2})(\d{2})$/);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const end = new Date(year, month, 0);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return end >= startOfMonth;
}

export function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function formatAmount(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
