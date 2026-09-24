import express from 'express';
import { requireAuth, requireInstitution, requireRole } from '../middleware/auth.js';
import AttendanceRecord from '../models/AttendanceRecord.js';
import AttendanceSession from '../models/AttendanceSession.js';
import Student from '../models/Student.js';
import Organization from '../models/Organization.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();
router.use(requireAuth);

router.get('/low-attendance', requireInstitution, requireRole('INSTITUTION_ADMIN'), async (req, res, next) => {
  try {
    const org = await Organization.findById(req.user.organizationId).lean();
    const minimum = org?.attendancePolicy?.minimumPercentage ?? 75;
    const students = await Student.find({ organizationId: req.user.organizationId, status: 'ACTIVE' }).populate('userId', 'name email').populate('sectionId', 'name').lean();
    const records = await AttendanceRecord.find({ organizationId: req.user.organizationId }).populate({ path: 'sessionId', select: 'subjectId' }).populate({ path: 'sessionId', populate: { path: 'subjectId', select: 'name code' } }).lean();

    const map = new Map();
    for (const record of records) {
      const student = record.studentId.toString();
      const subjectId = record.sessionId?.subjectId?._id?.toString();
      const subjectName = record.sessionId?.subjectId?.name || 'Unknown';
      if (!map.has(student)) map.set(student, new Map());
      const bySubject = map.get(student);
      if (!bySubject.has(subjectId)) bySubject.set(subjectId, { subject: subjectName, present: 0, total: 0 });
      const x = bySubject.get(subjectId);
      x.total += 1;
      if (record.status === 'PRESENT') x.present += 1;
    }

    const output = [];
    for (const student of students) {
      const bySubject = map.get(student._id.toString()) || new Map();
      for (const stat of bySubject.values()) {
        const percentage = stat.total ? Math.round((stat.present / stat.total) * 100) : 0;
        if (percentage < minimum) output.push({
          studentId: student._id,
          name: student.userId?.name,
          rollNumber: student.rollNumber,
          section: student.sectionId?.name,
          subject: stat.subject,
          percentage,
          present: stat.present,
          total: stat.total,
          minimum
        });
      }
    }

    output.sort((a, b) => a.percentage - b.percentage);
    res.json(output);
  } catch (error) { next(error); }
});

router.get('/audit', requireRole('INSTITUTION_ADMIN', 'PLATFORM_ADMIN'), async (req, res, next) => {
  try {
    const filter = req.user.role === 'PLATFORM_ADMIN' ? {} : { organizationId: req.user.organizationId };
    const logs = await AuditLog.find(filter).populate('actorId', 'name role').sort({ createdAt: -1 }).limit(150).lean();
    res.json(logs);
  } catch (error) { next(error); }
});

export default router;
