import express from 'express';
import mongoose from 'mongoose';
import AttendanceSession from '../models/AttendanceSession.js';
import AttendanceRecord from '../models/AttendanceRecord.js';
import Student from '../models/Student.js';
import Subject from '../models/Subject.js';
import Section from '../models/Section.js';
import CorrectionRequest from '../models/CorrectionRequest.js';
import { requireAuth, requireInstitution, requireRole } from '../middleware/auth.js';
import { createAttendanceSchema, parse } from '../validators/schemas.js';
import { writeAudit } from '../utils/audit.js';

const router = express.Router();
router.use(requireAuth, requireInstitution);

router.get('/sessions', requireRole('FACULTY', 'INSTITUTION_ADMIN'), async (req, res, next) => {
  try {
    const filter = { organizationId: req.user.organizationId };
    if (req.user.role === 'FACULTY') filter.markedBy = req.user._id;
    const sessions = await AttendanceSession.find(filter)
      .populate('subjectId', 'name code')
      .populate('sectionId', 'name semester')
      .populate('markedBy', 'name')
      .sort({ date: -1, startTime: -1 })
      .limit(100)
      .lean();
    res.json(sessions);
  } catch (error) { next(error); }
});

router.get('/session/:sessionId', requireRole('FACULTY', 'INSTITUTION_ADMIN'), async (req, res, next) => {
  try {
    const session = await AttendanceSession.findOne({ _id: req.params.sessionId, organizationId: req.user.organizationId })
      .populate('subjectId', 'name code')
      .populate('sectionId', 'name semester')
      .lean();
    if (!session) return res.status(404).json({ message: 'Attendance session not found' });
    const records = await AttendanceRecord.find({ organizationId: req.user.organizationId, sessionId: session._id }).populate({ path: 'studentId', populate: { path: 'userId', select: 'name email' } }).lean();
    res.json({ session, records });
  } catch (error) { next(error); }
});

router.post('/sessions', requireRole('FACULTY'), async (req, res, next) => {
  const data = parse(createAttendanceSchema, req.body);
  const mongoSession = await mongoose.startSession();
  try {
    mongoSession.startTransaction();

    const subject = await Subject.findOne({ _id: data.subjectId, organizationId: req.user.organizationId, facultyIds: req.user._id }).session(mongoSession);
    if (!subject) return res.status(403).json({ message: 'You are not assigned to this subject' });

    const section = await Section.findOne({ _id: data.sectionId, organizationId: req.user.organizationId }).session(mongoSession);
    if (!section) return res.status(400).json({ message: 'Invalid section' });

    const studentIds = data.records.map(x => x.studentId);
    const students = await Student.find({ organizationId: req.user.organizationId, sectionId: section._id, _id: { $in: studentIds }, status: 'ACTIVE' }).session(mongoSession);
    if (students.length !== data.records.length) return res.status(400).json({ message: 'Every attendance record must belong to an active student in the selected section' });

    const sessionDoc = await AttendanceSession.create([{
      organizationId: req.user.organizationId,
      sectionId: section._id,
      subjectId: subject._id,
      date: new Date(`${data.date}T00:00:00.000Z`),
      startTime: data.startTime,
      topic: data.topic,
      markedBy: req.user._id,
      status: 'FINALIZED',
      finalizedAt: new Date()
    }], { session: mongoSession });

    await AttendanceRecord.insertMany(data.records.map(record => ({
      organizationId: req.user.organizationId,
      sessionId: sessionDoc[0]._id,
      studentId: record.studentId,
      status: record.status,
      markedBy: req.user._id
    })), { session: mongoSession });

    await mongoSession.commitTransaction();
    await writeAudit({ req, action: 'ATTENDANCE_MARKED', entityType: 'AttendanceSession', entityId: sessionDoc[0]._id, details: { subjectId: subject._id, sectionId: section._id, count: data.records.length } });

    res.status(201).json({ id: sessionDoc[0]._id, message: 'Attendance saved successfully' });
  } catch (error) {
    await mongoSession.abortTransaction();
    if (error?.code === 11000) return res.status(409).json({ message: 'Attendance already exists for this subject, section, date and time' });
    next(error);
  } finally {
    await mongoSession.endSession();
  }
});

router.get('/student/records', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const student = await Student.findOne({ organizationId: req.user.organizationId, userId: req.user._id }).lean();
    if (!student) return res.status(404).json({ message: 'Student profile not found' });

    const records = await AttendanceRecord.find({ organizationId: req.user.organizationId, studentId: student._id })
      .populate({ path: 'sessionId', populate: [{ path: 'subjectId', select: 'name code' }, { path: 'markedBy', select: 'name' }] })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json(records);
  } catch (error) { next(error); }
});

router.post('/student/corrections', requireRole('STUDENT'), async (req, res, next) => {
  try {
    const data = parse((await import('../validators/schemas.js')).correctionSchema, req.body);
    const student = await Student.findOne({ organizationId: req.user.organizationId, userId: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student profile not found' });

    const record = await AttendanceRecord.findOne({ _id: data.attendanceRecordId, organizationId: req.user.organizationId, studentId: student._id });
    if (!record) return res.status(404).json({ message: 'Attendance record not found' });
    if (record.status === data.requestedStatus) return res.status(400).json({ message: 'Requested status is already the current status' });
    if (await CorrectionRequest.exists({ attendanceRecordId: record._id, status: 'PENDING' })) return res.status(409).json({ message: 'A correction request is already pending for this attendance record' });

    const request = await CorrectionRequest.create({
      organizationId: req.user.organizationId,
      attendanceRecordId: record._id,
      studentId: student._id,
      requestedStatus: data.requestedStatus,
      reason: data.reason,
      status: 'PENDING'
    });

    await writeAudit({ req, action: 'CORRECTION_REQUESTED', entityType: 'CorrectionRequest', entityId: request._id, details: { attendanceRecordId: record._id, requestedStatus: data.requestedStatus } });
    res.status(201).json(request);
  } catch (error) { next(error); }
});

router.get('/corrections', requireRole('STUDENT', 'FACULTY', 'INSTITUTION_ADMIN'), async (req, res, next) => {
  try {
    const filter = { organizationId: req.user.organizationId };
    if (req.user.role === 'STUDENT') {
      const student = await Student.findOne({ organizationId: req.user.organizationId, userId: req.user._id }).lean();
      filter.studentId = student?._id;
    }
    const requests = await CorrectionRequest.find(filter)
      .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email' } })
      .populate({ path: 'attendanceRecordId', populate: { path: 'sessionId', populate: { path: 'subjectId', select: 'name code' } } })
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(requests);
  } catch (error) { next(error); }
});

router.patch('/corrections/:id', requireRole('INSTITUTION_ADMIN'), async (req, res, next) => {
  try {
    const { reviewCorrectionSchema, parse } = await import('../validators/schemas.js');
    const data = parse(reviewCorrectionSchema, req.body);
    const request = await CorrectionRequest.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!request) return res.status(404).json({ message: 'Correction request not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ message: 'Only pending corrections can be reviewed' });

    const record = await AttendanceRecord.findOne({ _id: request.attendanceRecordId, organizationId: req.user.organizationId });
    if (!record) return res.status(404).json({ message: 'Attendance record not found' });

    request.status = data.status;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.reviewNote = data.reviewNote || '';
    await request.save();

    if (data.status === 'APPROVED') {
      const oldStatus = record.status;
      record.status = request.requestedStatus;
      await record.save();
      await writeAudit({ req, action: 'ATTENDANCE_CORRECTED', entityType: 'AttendanceRecord', entityId: record._id, details: { oldStatus, newStatus: record.status, correctionRequestId: request._id } });
    } else {
      await writeAudit({ req, action: 'CORRECTION_REJECTED', entityType: 'CorrectionRequest', entityId: request._id, details: { note: request.reviewNote } });
    }

    res.json({ message: `Correction ${data.status.toLowerCase()}` });
  } catch (error) { next(error); }
});

export default router;
