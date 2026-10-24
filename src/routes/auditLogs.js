import express from "express";
import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { userId, action, from, to } = req.query;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const filter = {};

    if (userId) {
      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID"
        });
      }

      filter.$or = [
        { actorId: userId },
        { targetUserId: userId }
      ];
    }

    if (action) {
      filter.action = action;
    }

    if (from || to) {
      filter.occurredAt = {};

      if (from) {
        const fromDate = new Date(from);

        if (Number.isNaN(fromDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date"
          });
        }

        filter.occurredAt.$gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);

        if (Number.isNaN(toDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date"
          });
        }

        filter.occurredAt.$lte = toDate;
      }

      if (
        filter.occurredAt.$gte &&
        filter.occurredAt.$lte &&
        filter.occurredAt.$gte > filter.occurredAt.$lte
      ) {
        return res.status(400).json({
          success: false,
          message: "Start date cannot be later than end date"
        });
      }
    }

    const logs = await AuditLog.find(filter)
      .sort({ occurredAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await AuditLog.countDocuments(filter);

    res.json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      logs
    });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid audit log ID"
      });
    }

    const log = await AuditLog.findById(req.params.id).lean();

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found"
      });
    }

    res.json({
      success: true,
      log
    });
  })
);

export default router;