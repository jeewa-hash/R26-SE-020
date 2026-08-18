import jwt from "jsonwebtoken";

export const protect = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Authorization token is required",
        });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Support nested token payload: { user: { id, role } }
      const userId =
        decoded.user?.id ||
        decoded.user?._id ||
        decoded.id ||
        decoded._id ||
        decoded.userId ||
        decoded.providerId ||
        decoded.seekerId ||
        decoded.adminId ||
        decoded.sub;

      const role =
        decoded.user?.role ||
        decoded.role ||
        decoded.userRole ||
        decoded.type ||
        decoded.accountType;

      if (!userId || !role) {
        return res.status(401).json({
          success: false,
          message: "Invalid token payload",
        });
      }

      req.user = {
        id: userId,
        role,
        email: decoded.user?.email || decoded.email || "",
      };

      if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied for this role",
          userRole: req.user.role,
          allowedRoles,
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
        error: error.message,
      });
    }
  };
};