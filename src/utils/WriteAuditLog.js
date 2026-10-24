import AuditLog from "../models/AuditLog.js";

const writeAuditLog = async (req, data) => {
  const log = {
    ...data,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") || null
  };

  return await AuditLog.create(log);
};

export default writeAuditLog;