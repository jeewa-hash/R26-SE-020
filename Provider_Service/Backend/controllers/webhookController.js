// controllers/webhookController.js
import Stripe from "stripe";
import Transaction from "../models/Transaction.js";
import AdPost from "../models/AdPost.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // Verify Stripe signature using raw body
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`❌ Webhook Signature Verification Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful checkout completion
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { adPostId, providerId, boostAmount, totalCharged } = session.metadata;

    try {
      // 1. Prevent duplicate logs using Stripe Session ID
      const existingTx = await Transaction.findOne({ stripeSessionId: session.id });

      if (!existingTx) {
        // 2. Save transaction ledger
        await Transaction.create({
          adPostId,
          providerId,
          stripeSessionId: session.id,
          boostAmount: Number(boostAmount),
          amountPaid: Number(totalCharged),
          currency: session.currency,
          status: "completed",
        });

        // 3. Update ad post priority
        await AdPost.findByIdAndUpdate(adPostId, {
          $inc: { priority: Number(boostAmount) },
        });

        console.log(`✅ Transaction logged & priority boosted for Post ${adPostId}`);
      }
    } catch (dbError) {
      console.error("❌ Database Update Error in Webhook:", dbError.message);
      return res.status(500).json({ error: "Database update failed" });
    }
  }

  res.json({ received: true });
};