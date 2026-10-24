import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    actorEmail: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true,
      enum: [
        "USER_REGISTERED",
        "USER_LOGIN",
        "USER_UPDATED",
        "USER_DELETED"
      ]
    },
    resourceType: {
      type: String,
      required: true
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    targetUserEmail: {
      type: String,
      default: null
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    },
    occurredAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ actorId: 1, occurredAt: -1 });
auditLogSchema.index({ action: 1, occurredAt: -1 });
auditLogSchema.index({ targetUserId: 1, occurredAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;