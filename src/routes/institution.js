import express from 'express';
import bcrypt from 'bcryptjs';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Department from '../models/Department.js';
import Section from '../models/Section.js';
import Subject from '../models/Subject.js';
import { requireAuth, requireInstitution, requireRole } from '../middleware/auth.js';
import { createDepartmentSchema, createFacultySchema, createSectionSchema, createStudentSchema, createSubjectSchema, parse } from '../validators/schemas.js';
import { writeAudit } from '../utils/audit.js';

const router = express.Router();
router.use(requireAuth, requireInstitution);

router.get('/profile', async (req, res, next) => {
  try {
    const org = await Organization.findById(req.user.organizationId).lean();
    res.json(org);
  } catch (error) { next(error); }
});

router.get('/catalog', async (req, res, next) => {
  try {
    const departments = await Department.find({
      organizationId: req.user.organizationId,
    })
      .sort({ name: 1 })
      .lean();

    let sections;
    let subjects;

    if (req.user.role === 'FACULTY') {
      // Faculty only sees subjects assigned to them.
      subjects = await Subject.find({
        organizationId: req.user.organizationId,
        facultyIds: req.user._id,
      })
        .populate('departmentId', 'name')
        .populate('sectionId', 'name semester')
        .sort({ name: 1 })
        .lean();

      // Only show sections that contain the faculty's assigned subjects.
      const sectionIds = [
        ...new Set(subjects.map((subject) => String(subject.sectionId?._id))),
      ];

      sections = await Section.find({
        organizationId: req.user.organizationId,
        _id: { $in: sectionIds },
      })
        .sort({ name: 1 })
        .lean();
    } else {
      sections = await Section.find({
        organizationId: req.user.organizationId,
      })
        .sort({ name: 1 })
        .lean();

      subjects = await Subject.find({
        organizationId: req.user.organizationId,
      })
        .populate('departmentId', 'name')
        .populate('sectionId', 'name semester')
        .sort({ name: 1 })
        .lean();
    }

    const faculty = await User.find({
      organizationId: req.user.organizationId,
      role: 'FACULTY',
      isActive: true,
    })
      .select('name email departmentId employeeId')
      .sort({ name: 1 })
      .lean();

    res.json({
      departments,
      sections,
      subjects,
      faculty,
    });
  } catch (error) {
    next(error);
  }
});


router.post('/departments', requireRole('INSTITUTION_ADMIN'), async (req, res, next) => {
  try {
    const data = parse(createDepartmentSchema, req.body);
    const department = await Department.create({ organizationId: req.user.organizationId, name: data.name, code: data.code });
    await writeAudit({ req, action: 'DEPARTMENT_CREATED', entityType: 'Department', entityId: department._id, details: { name: department.name, code: department.code } });
    res.status(201).json(department);
  } catch (error) { next(error); }
});

router.post('/sections', requireRole('INSTITUTION_ADMIN'), async (req, res, next) => {
  try {
    const data = parse(createSectionSchema, req.body);
    const department = await Department.findOne({ _id: data.departmentId, organizationId: req.user.organizationId });
    if (!department) return res.status(400).json({ message: 'Invalid department for this institution' });
    const section = await Section.create({ organizationId: req.user.organizationId, departmentId: department._id, name: data.name, semester: data.semester, academicYear: data.academicYear });
    await writeAudit({ req, action: 'SECTION_CREATED', entityType: 'Section', entityId: section._id, details: { name: section.name, departmentId: section.departmentId } });
    res.status(201).json(section);
  } catch (error) { next(error); }
});

router.post('/subjects', requireRole('INSTITUTION_ADMIN'), async (req, res, next) => {
  try {
    const data = parse(createSubjectSchema, req.body);
    const [department, section] = await Promise.all([
      Department.findOne({ _id: data.departmentId, organizationId: req.user.organizationId }),
      Section.findOne({ _id: data.sectionId, organizationId: req.user.organizationId, departmentId: data.departmentId })
    ]);
    if (!department || !section) return res.status(400).json({ message: 'Invalid department or section for this institution' });
    if (data.facultyIds.length) {
      const count = await User.countDocuments({ _id: { $in: data.facultyIds }, organizationId: req.user.organizationId, role: 'FACULTY', isActive: true });
      if (count !== data.facultyIds.length) return res.status(400).json({ message: 'One or more faculty assignments are invalid' });
    }
    const subject = await Subject.create({ organizationId: req.user.organizationId, departmentId: department._id, sectionId: section._id, name: data.name, code: data.code, periodsPerWeek: data.periodsPerWeek, facultyIds: data.facultyIds });
    await writeAudit({ req, action: 'SUBJECT_CREATED', entityType: 'Subject', entityId: subject._id, details: { name: subject.name, code: subject.code } });
    res.status(201).json(subject);
  } catch (error) { next(error); }
});

router.get('/students', requireRole('INSTITUTION_ADMIN', 'FACULTY'), async (req, res, next) => {
  try {
    const filter = {
      organizationId: req.user.organizationId,
      status: 'ACTIVE',
    };

    // Institution admins can see all students in their institution.
    // Faculty can only see students belonging to a section
    // for which they are assigned at least one subject.
    if (req.user.role === 'FACULTY') {
      const { sectionId, subjectId } = req.query;

      if (!sectionId || !subjectId) {
        return res.status(400).json({
          message: 'sectionId and subjectId are required for faculty access',
        });
      }

      const subject = await Subject.findOne({
        _id: subjectId,
        organizationId: req.user.organizationId,
        sectionId,
        facultyIds: req.user._id,
      }).lean();

      if (!subject) {
        return res.status(403).json({
          message: 'You are not assigned to this subject or section',
        });
      }

      filter.sectionId = sectionId;
    }

    const students = await Student.find(filter)
      .populate('userId', 'name email')
      .populate({
        path: 'sectionId',
        select: 'name semester departmentId',
        populate: {
          path: 'departmentId',
          select: 'name code',
        },
      })
      .sort({ rollNumber: 1 })
      .lean();

    res.json(students);
  } catch (error) {
    next(error);
  }
});

router.post('/students', requireRole('INSTITUTION_ADMIN'), async (req, res, next) => {
  try {
    const data = parse(createStudentSchema, req.body);
    const section = await Section.findOne({ _id: data.sectionId, organizationId: req.user.organizationId });
    if (!section) return res.status(400).json({ message: 'Invalid section for this institution' });
    if (await User.exists({ email: data.email.toLowerCase() })) return res.status(409).json({ message: 'Email already exists' });
    if (await Student.exists({ organizationId: req.user.organizationId, rollNumber: data.rollNumber.toUpperCase() })) return res.status(409).json({ message: 'Roll number already exists' });

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({ organizationId: req.user.organizationId, name: data.name, email: data.email, passwordHash, role: 'STUDENT' });
    const student = await Student.create({ organizationId: req.user.organizationId, userId: user._id, rollNumber: data.rollNumber, sectionId: section._id, admissionYear: data.admissionYear });
    await writeAudit({ req, action: 'STUDENT_CREATED', entityType: 'Student', entityId: student._id, details: { rollNumber: student.rollNumber } });

    res.status(201).json({ id: student._id, name: user.name, rollNumber: student.rollNumber, email: user.email });
  } catch (error) { next(error); }
});

router.get('/faculty', requireRole('INSTITUTION_ADMIN'), async (req, res, next) => {
  try {
    const faculty = await User.find({ organizationId: req.user.organizationId, role: 'FACULTY', isActive: true }).select('name email employeeId departmentId').populate('departmentId', 'name code').sort({ name: 1 }).lean();
    res.json(faculty);
  } catch (error) { next(error); }
});

router.post('/faculty', requireRole('INSTITUTION_ADMIN'), async (req, res, next) => {
  try {
    const data = parse(createFacultySchema, req.body);
    const department = await Department.findOne({ _id: data.departmentId, organizationId: req.user.organizationId });
    if (!department) return res.status(400).json({ message: 'Invalid department for this institution' });
    if (await User.exists({ email: data.email.toLowerCase() })) return res.status(409).json({ message: 'Email already exists' });

    const passwordHash = await bcrypt.hash(data.password, 12);
    const faculty = await User.create({ organizationId: req.user.organizationId, name: data.name, email: data.email, passwordHash, role: 'FACULTY', employeeId: data.employeeId, departmentId: data.departmentId });
    await writeAudit({ req, action: 'FACULTY_CREATED', entityType: 'User', entityId: faculty._id, details: { email: faculty.email } });
    res.status(201).json({ id: faculty._id, name: faculty.name, email: faculty.email, employeeId: faculty.employeeId });
  } catch (error) { next(error); }
});

export default router;
