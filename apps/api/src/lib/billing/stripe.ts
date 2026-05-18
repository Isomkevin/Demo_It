import Stripe from "stripe";

function createStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key);
}

let stripeClient: ReturnType<typeof createStripeClient> | null = null;

export function getStripe() {
  if (!stripeClient) {
    stripeClient = createStripeClient();
  }
  return stripeClient;
}

export function getWebUrl(): string {
  return process.env.WEB_URL || "http://localhost:3000";
}

export type StripeClient = ReturnType<typeof getStripe>;
export type StripeSubscription = Awaited<
  ReturnType<StripeClient["subscriptions"]["retrieve"]>
>;
export type StripeCheckoutSession = Awaited<
  ReturnType<StripeClient["checkout"]["sessions"]["retrieve"]>
>;
export type StripeInvoice = Awaited<ReturnType<StripeClient["invoices"]["retrieve"]>>;
export type StripeEvent = ReturnType<StripeClient["webhooks"]["constructEvent"]>;
