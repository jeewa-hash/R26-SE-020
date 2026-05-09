import jwt from "jsonwebtoken";

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.substring("Bearer ".length);
};

export const requireAuth = (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: "JWT_SECRET is not configured in ServiceCoordinationService",
    });
  }
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authorization token is required",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded?.user || null;
    if (!req.user?.id || !req.user?.role) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token is not valid",
    });
  }
};

export const requireRole = (allowedRoles) => (req, res, next) => {
  const userRole = req.user?.role;
  if (!userRole || !allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: "Access denied for this role",
    });
  }
  return next();
};
