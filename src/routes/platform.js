import express from 'express';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import AttendanceSession from '../models/AttendanceSession.js';
import AuditLog from '../models/AuditLog.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth, requireRole('PLATFORM_ADMIN'));

router.get('/institutions', async (req, res, next) => {
  try {
    const orgs = await Organization.find().sort({ createdAt: -1 }).lean();
    res.json(orgs);
  } catch (error) { next(error); }
});

router.get('/overview', async (req, res, next) => {
  try {
    const [institutions, students, faculty, sessions, audit] = await Promise.all([
      Organization.countDocuments(),
      Student.countDocuments(),
      User.countDocuments({ role: 'FACULTY' }),
      AttendanceSession.countDocuments(),
      AuditLog.find().sort({ createdAt: -1 }).limit(20).populate('actorId', 'name role').lean()
    ]);
    res.json({ institutions, students, faculty, sessions, audit });
  } catch (error) { next(error); }
});

export default router;
