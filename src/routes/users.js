import express from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";
import writeAuditLog from "../utils/WriteAuditLog.js";

const router = express.Router();

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt
      }
    });
  })
);

router.patch(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const isOwnAccount = req.user._id.toString() === id;

    if (!isOwnAccount && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You cannot update another user's account"
      });
    }

    const allowedFields = ["name", "email"];
    const submittedFields = Object.keys(req.body);

    if (
      submittedFields.length === 0 ||
      submittedFields.some((field) => !allowedFields.includes(field))
    ) {
      return res.status(400).json({
        success: false,
        message: "Only name and email can be updated"
      });
    }

    const updates = {};

    if (Object.hasOwn(req.body, "name")) {
      if (
        typeof req.body.name !== "string" ||
        req.body.name.trim().length < 2
      ) {
        return res.status(400).json({
          success: false,
          message: "Name must contain at least 2 characters"
        });
      }

      updates.name = req.body.name.trim();
    }

    if (Object.hasOwn(req.body, "email")) {
      if (
        typeof req.body.email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: "A valid email address is required"
        });
      }

      updates.email = req.body.email.trim().toLowerCase();
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const previousValues = {
      name: user.name,
      email: user.email
    };

    Object.assign(user, updates);

    await user.save();

    await writeAuditLog(req, {
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: "USER_UPDATED",
      resourceType: "User",
      resourceId: user._id,
      targetUserId: user._id,
      targetUserEmail: user.email,
      details: {
        previousValues,
        updatedFields: Object.keys(updates)
      }
    });

    res.json({
      success: true,
      message: "User updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  })
);

router.delete(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const isOwnAccount = req.user._id.toString() === id;

    if (!isOwnAccount && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You cannot delete another user's account"
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const targetUserId = user._id;
    const targetUserEmail = user.email;

    await user.deleteOne();

    await writeAuditLog(req, {
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: "USER_DELETED",
      resourceType: "User",
      resourceId: targetUserId,
      targetUserId,
      targetUserEmail,
      details: {
        deletedName: user.name
      }
    });

    res.json({
      success: true,
      message: "User deleted successfully"
    });
  })
);

router.get(
  "/",
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    );

    const users = await User.find()
      .select("name email role isBlocked createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      users
    });
  })
);

export default router;