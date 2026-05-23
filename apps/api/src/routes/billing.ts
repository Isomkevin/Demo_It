import type { FastifyInstance } from "fastify";
import type { PlanTier } from "@demo-copilot/types";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  downgradeToFree,
  getBillingStatus,
  getOrCreateOrg,
  setPlan,
} from "../lib/billing/credits";
import { monthlyCreditsForPlan } from "../lib/billing/plans";
import { fulfillCheckoutSession } from "../lib/billing/fulfill-checkout";
import {
  clampTeamQuantity,
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

const ConfirmCheckoutBody = z.object({
  sessionId: z.string().min(1),
});

const CheckoutBody = z.object({
  product: z.enum([
    "video_single",
    "video_pack_5",
    "starter",
    "pro",
    "team",
    "enterprise",
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
    {
      env: process.env.STRIPE_PRICE_ENTERPRISE ?? process.env.STRIPE_PRICE_AGENCY,
      tier: "ENTERPRISE",
    },
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

  /** Fulfill credits when Stripe Checkout succeeded but webhook did not run (common in local dev). */
  fastify.post("/api/v1/billing/confirm-checkout", async (request, reply) => {
    const { sessionId } = ConfirmCheckoutBody.parse(request.body);
    const orgId = request.orgId;

    const stripe = getStripe();
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (err) {
      request.log.warn({ err, sessionId }, "confirm-checkout retrieve failed");
      return reply.status(400).send({ error: "Invalid checkout session", code: "SESSION_NOT_FOUND" });
    }

    const sessionOrgId = session.metadata?.orgId ?? session.client_reference_id;
    if (!sessionOrgId || sessionOrgId !== orgId) {
      return reply.status(403).send({
        error: "This checkout session belongs to a different browser session. Use the same device/browser you paid with.",
        code: "ORG_MISMATCH",
      });
    }

    const result = await fulfillCheckoutSession(session);
    if (!result.fulfilled) {
      request.log.warn({ sessionId, orgId, reason: result.reason }, "confirm-checkout not fulfilled");
      return reply.status(400).send({
        error: `Could not apply purchase (${result.reason ?? "unknown"})`,
        code: "FULFILL_FAILED",
        reason: result.reason,
      });
    }

    return getBillingStatus(orgId);
  });

  fastify.post("/api/v1/billing/checkout", async (request, reply) => {
    const body = CheckoutBody.parse(request.body);
    const orgId = request.orgId;

    let priceId: string;
    try {
      priceId = getPriceId(body.product);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Billing not configured";
      return reply.status(503).send({ error: message, code: "STRIPE_PRICE_MISSING" });
    }

    const stripe = getStripe();
    const customerId = await ensureStripeCustomer(orgId);
    const webUrl = getWebUrl();

    let quantity = body.quantity ?? defaultQuantityForProduct(body.product);
    if (body.product === "team") {
      quantity = clampTeamQuantity(quantity);
    }

    const tier = productToPlanTier(body.product);
    let session;
    try {
      session = await stripe.checkout.sessions.create(
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stripe checkout failed";
      request.log.warn({ err, product: body.product, priceId }, "checkout session failed");
      if (message.includes("No such price")) {
        return reply.status(503).send({
          error: `Stripe price not found (${priceId}). Run: pnpm --filter=api stripe:setup`,
          code: "STRIPE_PRICE_INVALID",
        });
      }
      return reply.status(502).send({ error: message, code: "STRIPE_CHECKOUT_FAILED" });
    }
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
      const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

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
      const result = await fulfillCheckoutSession(session);
      if (!result.fulfilled) {
        console.warn(
          `[Billing] checkout.session.completed not fulfilled: ${result.reason ?? "unknown"} session=${session.id}`
        );
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
        ...(grant > 0 ? { grantCredits: grant, stripeEventId: event.id } : {}),
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
