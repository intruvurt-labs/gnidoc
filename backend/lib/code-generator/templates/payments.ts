export const paymentTemplates = {
  stripe: {
    config: `import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;`,

    routes: `import express from 'express';
import { stripe, STRIPE_WEBHOOK_SECRET } from './config/stripe';
import { authMiddleware, AuthRequest } from './middleware/auth';
import { prisma } from './db';

const router = express.Router();

router.post('/create-checkout-session', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { priceId } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: \`\${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}\`,
      cancel_url: \`\${process.env.CLIENT_URL}/cancel\`,
      client_reference_id: String(req.user.id),
      metadata: { userId: String(req.user.id) },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    return res.status(400).send('No signature');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(\`Webhook Error: \${err.message}\`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = Number(session.metadata?.userId || session.client_reference_id);
        
        if (!userId) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        await prisma.subscriptions.create({
          data: {
            user_id: userId,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            plan: subscription.items.data[0].price.id,
            current_period_end: new Date(subscription.current_period_end * 1000),
          },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        await prisma.subscriptions.updateMany({
          where: { stripe_subscription_id: subscription.id },
          data: {
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000),
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        await prisma.subscriptions.updateMany({
          where: { stripe_subscription_id: subscription.id },
          data: { status: 'canceled' },
        });
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const userId = Number(paymentIntent.metadata?.userId);
        
        if (!userId) break;

        await prisma.payments.create({
          data: {
            user_id: userId,
            stripe_payment_id: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: 'succeeded',
          },
        });
        break;
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/subscription', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await prisma.subscriptions.findFirst({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
    });

    res.json({ subscription });
  } catch (error: any) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/cancel-subscription', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await prisma.subscriptions.findFirst({
      where: { user_id: req.user.id, status: 'active' },
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;`,

    plans: `export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      '10 requests per day',
      'Basic features',
      'Community support',
    ],
  },
  pro: {
    name: 'Pro',
    price: 29,
    priceId: 'price_1234567890',
    features: [
      'Unlimited requests',
      'All features',
      'Priority support',
      'Advanced analytics',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 99,
    priceId: 'price_0987654321',
    features: [
      'Everything in Pro',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
} as const;`,
  },
};
