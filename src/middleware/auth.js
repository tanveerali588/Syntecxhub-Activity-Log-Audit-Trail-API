import jwt from "jsonwebtoken";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";

export const authenticate = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required"
    });
  }

  const token = authorization.split(" ")[1];

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }

  const user = await User.findById(decoded.sub);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "User account not found"
    });
  }

  if (user.isBlocked) {
    return res.status(403).json({
      success: false,
      message: "Your account is blocked"
    });
  }

  req.user = user;

  next();
});

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Administrator access required"
    });
  }

  next();
};