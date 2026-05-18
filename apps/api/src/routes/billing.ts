import type { FastifyInstance } from "fastify";
import type { BillingProduct, PlanTier } from "@demo-copilot/types";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  downgradeToFree,
  getBillingStatus,
  getOrCreateOrg,
  grantCredits,
  monthlyCreditsForPlan,
  setPlan,
} from "../lib/billing/credits";
import {
  clampTeamQuantity,
  creditsForProduct,
  defaultQuantityForProduct,
  getPriceId,
  isSubscriptionProduct,
  planTierFromMetadata,
  productToPlanTier,
} from "../lib/billing/plans";
import {
  getStripe,
  getWebUrl,
  type StripeCheckoutSession,
  type StripeEvent,
  type StripeInvoice,
  type StripeSubscription,
} from "../lib/billing/stripe";

const CheckoutBody = z.object({
  product: z.enum([
    "video_single",
    "video_pack_5",
    "starter",
    "pro",
    "team",
    "agency",
  ]),
  quantity: z.number().int().min(1).max(10).optional(),
});

async function ensureStripeCustomer(orgId: string): Promise<string> {
  const org = await getOrCreateOrg(orgId);
  if (org.stripeCustomerId) return org.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    metadata: { orgId },
  });

  await prisma.organization.update({
    where: { id: orgId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

async function resolvePlanFromSubscription(
  subscription: StripeSubscription
): Promise<PlanTier | null> {
  const price = subscription.items.data[0]?.price;
  const metaTier = planTierFromMetadata(price?.metadata?.plan_tier);
  if (metaTier) return metaTier;

  const priceIds: Array<{ env: string | undefined; tier: PlanTier }> = [
    { env: process.env.STRIPE_PRICE_STARTER, tier: "STARTER" },
    { env: process.env.STRIPE_PRICE_PRO, tier: "PRO" },
    { env: process.env.STRIPE_PRICE_TEAM, tier: "TEAM" },
    { env: process.env.STRIPE_PRICE_AGENCY, tier: "AGENCY" },
  ];

  for (const { env, tier } of priceIds) {
    if (env && price?.id === env) return tier;
  }

  return null;
}

export async function billingRoutes(fastify: FastifyInstance) {
  fastify.get("/api/v1/billing/status", async (request) => {
    return getBillingStatus(request.orgId);
  });

  fastify.post("/api/v1/billing/checkout", async (request, reply) => {
    const body = CheckoutBody.parse(request.body);
    const orgId = request.orgId;
    const stripe = getStripe();
    const customerId = await ensureStripeCustomer(orgId);
    const priceId = getPriceId(body.product);
    const webUrl = getWebUrl();

    let quantity = body.quantity ?? defaultQuantityForProduct(body.product);
    if (body.product === "team") {
      quantity = clampTeamQuantity(quantity);
    }

    const tier = productToPlanTier(body.product);
    const session = await stripe.checkout.sessions.create(
      isSubscriptionProduct(body.product) && tier
        ? {
            mode: "subscription",
            customer: customerId,
            client_reference_id: orgId,
            success_url: `${webUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${webUrl}/billing/cancel`,
            metadata: { orgId, product: body.product },
            line_items: [{ price: priceId, quantity }],
            subscription_data: {
              metadata: { orgId, plan_tier: tier },
            },
          }
        : {
            mode: "payment",
            customer: customerId,
            client_reference_id: orgId,
            success_url: `${webUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${webUrl}/billing/cancel`,
            metadata: { orgId, product: body.product },
            line_items: [{ price: priceId, quantity: 1 }],
          }
    );
    if (!session.url) {
      return reply.status(500).send({ error: "Failed to create checkout session" });
    }

    return { url: session.url };
  });

  fastify.post("/api/v1/billing/portal", async (request, reply) => {
    const org = await getOrCreateOrg(request.orgId);
    if (!org.stripeCustomerId) {
      return reply.status(400).send({
        error: "No billing account yet. Purchase a plan first.",
        code: "NO_CUSTOMER",
      });
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${getWebUrl()}/pricing`,
    });

    return { url: session.url };
  });

  fastify.post(
    "/api/v1/billing/webhook",
    { config: { rawBody: true } },
    async (request, reply) => {
      const stripe = getStripe();
      const sig = request.headers["stripe-signature"];
      const secret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!secret || typeof sig !== "string") {
        return reply.status(400).send({ error: "Webhook not configured" });
      }

      const rawBody = (request as { rawBody?: Buffer }).rawBody;
      if (!rawBody) {
        return reply.status(400).send({ error: "Missing raw body" });
      }

      let event: StripeEvent;
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, secret);
      } catch (err) {
        request.log.warn(err, "stripe webhook signature failed");
        return reply.status(400).send({ error: "Invalid signature" });
      }

      try {
        await handleStripeEvent(event);
      } catch (err) {
        request.log.error(err, "stripe webhook handler failed");
        return reply.status(500).send({ error: "Webhook handler failed" });
      }

      return { received: true };
    }
  );
}

async function handleStripeEvent(event: StripeEvent): Promise<void> {
  const stripe = getStripe();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as StripeCheckoutSession;
      const orgId = session.metadata?.orgId ?? session.client_reference_id;
      if (!orgId) break;

      const product = session.metadata?.product as BillingProduct | undefined;

      if (session.mode === "payment" && product) {
        const credits = creditsForProduct(product);
        await grantCredits(orgId, credits, "purchase", event.id);
        break;
      }

      if (session.mode === "subscription" && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const tier = await resolvePlanFromSubscription(sub);
        if (!tier) break;

        const quantity = sub.items.data[0]?.quantity ?? 1;
        const grant = monthlyCreditsForPlan(tier);

        await setPlan(orgId, tier, {
          subscriptionId: sub.id,
          subscriptionStatus: sub.status,
          periodEnd: subscriptionPeriodEnd(sub),
          seatLimit: tier === "TEAM" ? quantity : 1,
          grantCredits: grant,
          stripeEventId: event.id,
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as StripeSubscription;
      const orgId = sub.metadata?.orgId;
      if (!orgId) break;

      const tier = await resolvePlanFromSubscription(sub);
      if (!tier) break;

      const quantity = sub.items.data[0]?.quantity ?? 1;

      await prisma.organization.update({
        where: { id: orgId },
        data: {
          plan: tier,
          subscriptionId: sub.id,
          subscriptionStatus: sub.status,
          periodEnd: subscriptionPeriodEnd(sub),
          seatLimit: tier === "TEAM" ? quantity : 1,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as StripeSubscription;
      const orgId = sub.metadata?.orgId;
      if (!orgId) break;
      await downgradeToFree(orgId);
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as StripeInvoice;
      const subscriptionId = invoiceSubscriptionId(invoice);
      if (!subscriptionId || invoice.billing_reason === "subscription_create") {
        break;
      }

      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const orgId = sub.metadata?.orgId;
      if (!orgId) break;

      const tier = await resolvePlanFromSubscription(sub);
      if (!tier) break;

      const grant = monthlyCreditsForPlan(tier);
      await setPlan(orgId, tier, {
        subscriptionId: sub.id,
        subscriptionStatus: sub.status,
        periodEnd: subscriptionPeriodEnd(sub),
        seatLimit: tier === "TEAM" ? (sub.items.data[0]?.quantity ?? 1) : 1,
        grantCredits: grant,
        stripeEventId: event.id,
      });
      break;
    }

    default:
      break;
  }
}

function subscriptionPeriodEnd(sub: StripeSubscription): Date {
  const end = (sub as { current_period_end?: number }).current_period_end;
  return end ? new Date(end * 1000) : new Date();
}

function invoiceSubscriptionId(invoice: StripeInvoice): string | null {
  const sub = (invoice as { subscription?: string | { id: string } | null }).subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}
