import express from 'express';
import { requireAuth, requireInstitution } from '../middleware/auth.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import AttendanceSession from '../models/AttendanceSession.js';
import AttendanceRecord from '../models/AttendanceRecord.js';
import CorrectionRequest from '../models/CorrectionRequest.js';
import Organization from '../models/Organization.js';
import Subject from '../models/Subject.js';

const router = express.Router();

router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'PLATFORM_ADMIN') {
      const [institutions, students, faculty, sessions] = await Promise.all([
        Organization.countDocuments(),
        Student.countDocuments(),
        User.countDocuments({ role: 'FACULTY' }),
        AttendanceSession.countDocuments()
      ]);
      return res.json({ institutions, students, faculty, sessions });
    }

    requireInstitution(req, res, async () => {
      if (req.user.role === 'STUDENT') {
        const [student, org] = await Promise.all([
          Student.findOne({ organizationId: req.user.organizationId, userId: req.user._id }).lean(),
          Organization.findById(req.user.organizationId).lean()
        ]);
        const records = await AttendanceRecord.find({ organizationId: req.user.organizationId, studentId: student?._id }).populate({ path: 'sessionId', populate: { path: 'subjectId' } }).lean();
        const grouped = {};
        for (const r of records) {
          const subjectName = r.sessionId?.subjectId?.name || 'Unknown';
          if (!grouped[subjectName]) grouped[subjectName] = { present: 0, total: 0 };
          grouped[subjectName].total += 1;
          if (r.status === 'PRESENT') grouped[subjectName].present += 1;
        }
        const attendance = Object.entries(grouped).map(([subject, x]) => ({ subject, percentage: x.total ? Math.round((x.present / x.total) * 100) : 0, present: x.present, total: x.total }));
        return res.json({ attendance, minimumPercentage: org?.attendancePolicy?.minimumPercentage || 75 });
      }

      const org = await Organization.findById(req.user.organizationId).lean();
      const [students, faculty, corrections, todaySessions] = await Promise.all([
        Student.countDocuments({ organizationId: req.user.organizationId, status: 'ACTIVE' }),
        User.countDocuments({ organizationId: req.user.organizationId, role: 'FACULTY', isActive: true }),
        CorrectionRequest.countDocuments({ organizationId: req.user.organizationId, status: 'PENDING' }),
        AttendanceSession.countDocuments({ organizationId: req.user.organizationId, date: { $gte: new Date(new Date().setHours(0,0,0,0)), $lt: new Date(new Date().setHours(24,0,0,0)) } })
      ]);

      if (req.user.role === 'FACULTY') {
        const subjects = await Subject.find({ organizationId: req.user.organizationId, facultyIds: req.user._id }).lean();
        return res.json({ students, faculty, corrections, todaySessions, subjects });
      }
      return res.json({ students, faculty, corrections, todaySessions, minimumPercentage: org?.attendancePolicy?.minimumPercentage || 75 });
    });
  } catch (error) { next(error); }
});

export default router;
