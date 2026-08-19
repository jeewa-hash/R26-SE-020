import jwt from "jsonwebtoken";

export const protect = (allowedRoles = []) => (req, res, next) => {
  try {
    const JWT_SECRET = process.env.JWT_SECRET ;
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Missing bearer token.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = decoded.user || decoded;

    if (!user || !user.role) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Invalid token payload.",
      });
    }

    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient role.",
      });
    }

    req.user = {
      id: user.id || user._id,
      role: user.role,
      email: user.email,
      name: user.name,
      ...user,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token is not valid",
      error: error.message,
    });
  }
};
