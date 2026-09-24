import AuditLog from '../models/AuditLog.js';

export async function writeAudit({ req, action, entityType, entityId = null, details = {} }) {
  await AuditLog.create({
    organizationId: req.user.organizationId || null,
    actorId: req.user._id,
    action,
    entityType,
    entityId,
    details
  });
}
