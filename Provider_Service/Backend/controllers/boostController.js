import Stripe from "stripe";

import AdPost from "../models/AdPost.js";

// Initialize Stripe with your secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const calculateBoostFee = (amount) => {
  const baseRate = 200; // LKR 100 per step
  const rawTotal = amount * baseRate;
  const discountTier = Math.floor(amount / 5);
  const discountPercentage = discountTier * 0.05;
  const finalFee = rawTotal - rawTotal * discountPercentage;

  return Math.round(finalFee);
};

export const createBoostCheckoutSession = async (req, res) => {
  console.log('BOOST SESSION — user:', req.user, 'body:', req.body, 'params:', req.params);
  try {
    // Stripe Checkout requires valid HTTP(S) return URLs.
    const checkoutBaseUrl = (process.env.CLIENT_URL || "http://localhost:3002").replace(/\/$/, "");

    const boostAmount = Number(req.body?.amount) || 1;
    if (boostAmount <= 0 || !Number.isInteger(boostAmount)) {
      return res.status(400).json({ success: false, message: "Amount must be a positive integer." });
    }

    const post = await AdPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const totalFeeLkr = calculateBoostFee(boostAmount);
    const MIN_CHARGE_LKR = 200; // adjust based on current LKR/USD rate, with margin
    if (totalFeeLkr < MIN_CHARGE_LKR) {
      return res.status(400).json({
        success: false,
        message: `Minimum boost charge is LKR ${MIN_CHARGE_LKR}. Please increase the boost amount.`,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "lkr",
            product_data: {
              name: `Boost Ad Priority by ${boostAmount} Steps`,
              description: `Post ID: ${post._id}`,
            },
            unit_amount: totalFeeLkr * 200,
          },
          quantity: 1,
        },
      ],
      metadata: {
        adPostId: post._id.toString(),
        providerId: post.providerId,
        boostAmount: boostAmount.toString(),
        totalCharged: totalFeeLkr.toString(),
      },
      success_url: `${checkoutBaseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${checkoutBaseUrl}/payment-cancelled`,
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('BOOST SESSION ERROR:', err); 
    res.status(500).json({ success: false, error: err.message });
  }
};
