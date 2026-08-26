import Stripe from "stripe";
import AdPost from "../models/AdPost.js";

// Initialize Stripe with your secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const calculateBoostFee = (amount) => {
  const baseRate = 100; // LKR 100 per step
  const rawTotal = amount * baseRate;
  const discountTier = Math.floor(amount / 5);
  const discountPercentage = discountTier * 0.05;
  const finalFee = rawTotal - rawTotal * discountPercentage;

  return Math.round(finalFee);
};

export const createBoostCheckoutSession = async (req, res) => {
  try {
    // Read optional redirect scheme from app, or default to custom scheme
    const redirectScheme = req.body?.redirectScheme || "myapp://";
    const cleanScheme = redirectScheme.replace(/\/$/, "");

    const boostAmount = Number(req.body?.amount) || 1;
    if (boostAmount <= 0 || !Number.isInteger(boostAmount)) {
      return res.status(400).json({ success: false, message: "Amount must be a positive integer." });
    }

    const post = await AdPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const totalFeeLkr = calculateBoostFee(boostAmount);

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
            unit_amount: totalFeeLkr * 100,
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
      // Uses the mobile deep link scheme directly without process.env.CLIENT_URL
      success_url: `${cleanScheme}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cleanScheme}/payment-cancelled`,
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};