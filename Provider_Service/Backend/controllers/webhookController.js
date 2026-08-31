// controllers/webhookController.js
import Stripe from "stripe";
import Transaction from "../models/Transaction.js";
import AdPost from "../models/AdPost.js";
import { processBillPaymentSuccess } from "../services/commissionBillingService.js";

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
    const metadata = session.metadata || {};

    try {
      if (metadata.type === "COMMISSION_SERVICE_CHARGE") {
        // Handle commission service charge payment
        await processBillPaymentSuccess(session.id, session);
        console.log(`✅ Commission bill payment processed via Webhook for session ${session.id}`);
      } else {
        // Handle Ad post boost payment
        const { adPostId, providerId, boostAmount, totalCharged } = metadata;

        const existingTx = await Transaction.findOne({ stripeSessionId: session.id });

        if (!existingTx && adPostId) {
          await Transaction.create({
            type: "boost",
            adPostId,
            providerId,
            stripeSessionId: session.id,
            boostAmount: Number(boostAmount) || 0,
            amountPaid: Number(totalCharged) || 0,
            currency: session.currency || "lkr",
            status: "completed",
          });

          await AdPost.findByIdAndUpdate(adPostId, {
            $inc: { priority: Number(boostAmount) || 0 },
          });

          console.log(`✅ Transaction logged & priority boosted for Post ${adPostId}`);
        }
      }
    } catch (dbError) {
      console.error("❌ Database Update Error in Webhook:", dbError.message);
      return res.status(500).json({ error: "Database update failed" });
    }
  }

  res.json({ received: true });
};