import jwt from "jsonwebtoken";

/**
 * Verifies the bearer token issued by authService and exposes its user on req.
 */
export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Missing bearer token.",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: "JWT_SECRET is not configured.",
    });
  }

  try {
    const token = authHeader.slice("Bearer ".length);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = decoded.user || decoded;
    const id = user.id || user._id || user.userId || user.sub;

    if (!id || !user.role) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Invalid token payload.",
      });
    }

    req.user = { id, ...user };
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

/** Restricts a route to administrators after authMiddleware has run. */
export const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Administrator role required.",
    });
  }

  return next();
};
