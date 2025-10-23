import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { stripe, STRIPE_WEBHOOK_SECRET } from "./stripe/config";
import { query } from "@/backend/db/pool";

const app = new Hono();

app.use("*", cors());

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
  })
);

app.post("/api/payments/stripe-webhook", async (c) => {
  const sig = c.req.header("stripe-signature");
  if (!sig) return c.text("Missing Stripe signature", 400);
  const buf = Buffer.from(await c.req.arrayBuffer());
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("stripe webhook signature verification failed", err?.message ?? err);
    return c.text("Webhook Error", 400);
  }
  const type = event.type as string;
  const data = event.data?.object as any;
  try {
    if (type === "checkout.session.completed") {
      const metadata = (data?.metadata ?? {}) as Record<string, string>;
      const userId = metadata.userId ?? metadata.user_id ?? "";
      const planRaw = (metadata.plan ?? metadata.tier ?? "free").toLowerCase();
      const plan = (["free", "basic", "pro", "enterprise"] as const).includes(planRaw as any)
        ? (planRaw as "free" | "basic" | "pro" | "enterprise")
        : ("free" as const);
      if (userId) {
        await query("UPDATE users SET subscription = $1, updated_at = NOW() WHERE id = $2", [plan, userId]);
      } else {
        console.warn("checkout.session.completed missing userId metadata");
      }
    } else if (type === "customer.subscription.deleted") {
      console.log("subscription canceled", data?.id ?? "");
    } else if (type === "invoice.payment_failed") {
      console.log("payment failed", data?.id ?? "");
    } else {
      console.log("unhandled stripe event", type);
    }
    return c.json({ received: true });
  } catch (err) {
    console.error("stripe webhook handler error", err);
    return c.text("Internal error", 500);
  }
});

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

export default app;
