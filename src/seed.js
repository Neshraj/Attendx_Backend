import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Organization from './models/Organization.js';
import User from './models/User.js';
import Department from './models/Department.js';
import Section from './models/Section.js';
import Subject from './models/Subject.js';
import Student from './models/Student.js';
import AttendanceSession from './models/AttendanceSession.js';
import AttendanceRecord from './models/AttendanceRecord.js';
import CorrectionRequest from './models/CorrectionRequest.js';
import AuditLog from './models/AuditLog.js';

async function user(name, email, password, role, organizationId, extra = {}) {
  return User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role, organizationId, ...extra });
}

async function seed() {
  await connectDB();
  await Promise.all([
    AuditLog.deleteMany({}), CorrectionRequest.deleteMany({}), AttendanceRecord.deleteMany({}), AttendanceSession.deleteMany({}),
    Student.deleteMany({}), Subject.deleteMany({}), Section.deleteMany({}), Department.deleteMany({}), User.deleteMany({}), Organization.deleteMany({})
  ]);

  const [abc, green] = await Organization.create([
    { name: 'SVPCET Engineering College', slug: 'svpcet-engineering-college', type: 'COLLEGE', contactEmail: 'admin@svpcet.edu', attendancePolicy: { minimumPercentage: 75, warningThreshold: 80 } },
    { name: 'Green Valley School', slug: 'green-valley-school', type: 'SCHOOL', contactEmail: 'admin@greenvalley.edu', attendancePolicy: { minimumPercentage: 80, warningThreshold: 85 } }
  ]);

  const platform = await user('Platform Admin', 'platform@attendx.dev', 'Admin@123', 'PLATFORM_ADMIN', null);
  const admin = await user('S Neshraj', 'admin@svpcet.edu', 'Admin@123', 'INSTITUTION_ADMIN', abc._id);

  const [cse, ece, mech] = await Department.create([
    { organizationId: abc._id, name: 'Computer Science & Engineering', code: 'CSE' },
    { organizationId: abc._id, name: 'Electronics & Communication', code: 'ECE' },
    { organizationId: abc._id, name: 'Mechanical Engineering', code: 'MECH' }
  ]);

  const [cseA, cseB] = await Section.create([
    { organizationId: abc._id, departmentId: cse._id, name: 'CSE-A', semester: 8, academicYear: '2025-2026' },
    { organizationId: abc._id, departmentId: cse._id, name: 'CSE-B', semester: 8, academicYear: '2025-2026' }
  ]);

  const facultyUser = await user('Dr. Priya Kumar', 'faculty@svpcet.edu', 'Faculty@123', 'FACULTY', abc._id, { employeeId: 'FAC-021', departmentId: cse._id });
  const faculty2 = await user('Arun Raj', 'faculty2@svpcet.edu', 'Faculty@123', 'FACULTY', abc._id, { employeeId: 'FAC-033', departmentId: ece._id });

  const subjects = await Subject.create([
    { organizationId: abc._id, departmentId: cse._id, sectionId: cseA._id, name: 'Web Technology', code: 'WT801', facultyIds: [facultyUser._id], periodsPerWeek: 4 },
    { organizationId: abc._id, departmentId: cse._id, sectionId: cseA._id, name: 'Database Management', code: 'DB802', facultyIds: [facultyUser._id], periodsPerWeek: 4 },
    { organizationId: abc._id, departmentId: cse._id, sectionId: cseA._id, name: 'Python Programming', code: 'PY803', facultyIds: [facultyUser._id], periodsPerWeek: 3 },
    { organizationId: abc._id, departmentId: cse._id, sectionId: cseB._id, name: 'Web Technology', code: 'WT801', facultyIds: [facultyUser._id], periodsPerWeek: 4 },
    { organizationId: abc._id, departmentId: ece._id, sectionId: cseB._id, name: 'Signals & Systems', code: 'SS804', facultyIds: [faculty2._id], periodsPerWeek: 4 }
  ]);

  const names = ['Rahul Kumar', 'Ananya Sharma', 'Arjun Reddy', 'Meena Devi', 'Vikram Singh', 'Divya Rao', 'Karthik Anand', 'Pooja Ramesh', 'Sai Teja', 'Harini Lakshmi', 'Nikhil Varma', 'Keerthi Naidu'];
  const students = [];
  for (let i = 0; i < names.length; i++) {
    const email = `student${String(i + 1).padStart(2, '0')}@svpcet.edu`;
    const studentUser = await user(names[i], email, 'Student@123', 'STUDENT', abc._id);
    students.push(await Student.create({ organizationId: abc._id, userId: studentUser._id, rollNumber: `23CSE${String(i + 101).padStart(3, '0')}`, sectionId: cseA._id, admissionYear: 2023 }));
  }

  // Make the first four accounts easy to demo.
  const firstStudentUser = await User.findOne({ email: 'student01@svpcet.edu' });
  await User.updateOne({ _id: firstStudentUser._id }, { $set: { email: 'student@svpcet.edu' } });

  const sessions = [];
  const subjectList = subjects.slice(0, 3);
  const startDates = ['2026-09-01', '2026-09-03', '2026-09-05', '2026-09-08', '2026-09-10', '2026-09-12', '2026-09-15', '2026-09-17', '2026-09-19', '2026-09-22'];

  for (let s = 0; s < subjectList.length; s++) {
    for (let d = 0; d < startDates.length; d++) {
      const sessionDoc = await AttendanceSession.create({
        organizationId: abc._id,
        sectionId: cseA._id,
        subjectId: subjectList[s]._id,
        date: new Date(`${startDates[d]}T00:00:00.000Z`),
        startTime: ['10:00', '11:00', '14:00'][s],
        topic: ['React components and state', 'Joins and normalization', 'Python functions and modules'][s],
        markedBy: facultyUser._id,
        status: 'FINALIZED',
        finalizedAt: new Date(`${startDates[d]}T15:00:00.000Z`)
      });
      sessions.push(sessionDoc);

      const records = students.map((student, index) => {
        let present = true;
        if (index === 0 && s === 2 && d < 3) present = false; // student01 low in Python
        if (index === 2 && s === 0 && d % 3 !== 0) present = false; // student03 low in Web Tech
        if (index === 4 && s === 0 && d % 2 === 0) present = false; // student05 watchlist
        if ((index + d + s) % 11 === 0) present = false;
        return { organizationId: abc._id, sessionId: sessionDoc._id, studentId: student._id, status: present ? 'PRESENT' : 'ABSENT', markedBy: facultyUser._id };
      });
      await AttendanceRecord.insertMany(records);
    }
  }

  const rahul = students[0];
  const rahulPythonRecord = await AttendanceRecord.findOne({ studentId: rahul._id }).populate({ path: 'sessionId', match: { subjectId: subjectList[2]._id } });
  const correctionRecord = await AttendanceRecord.findOne({ studentId: rahul._id }).sort({ createdAt: -1 });
  await CorrectionRequest.create({
    organizationId: abc._id,
    attendanceRecordId: correctionRecord._id,
    studentId: rahul._id,
    requestedStatus: correctionRecord.status === 'PRESENT' ? 'ABSENT' : 'PRESENT',
    reason: 'I attended the class and would like the attendance record reviewed.',
    status: 'PENDING'
  });

  const auditEvents = [
    { organizationId: abc._id, actorId: admin._id, action: 'INSTITUTION_SETUP', entityType: 'Organization', entityId: abc._id, details: { note: 'Demo institution initialized' } },
    { organizationId: abc._id, actorId: facultyUser._id, action: 'ATTENDANCE_MARKED', entityType: 'AttendanceSession', entityId: sessions.at(-1)._id, details: { sample: true } },
    { organizationId: abc._id, actorId: rahul.userId, action: 'CORRECTION_REQUESTED', entityType: 'CorrectionRequest', details: { sample: true } },
    { organizationId: null, actorId: platform._id, action: 'PLATFORM_SEEDED', entityType: 'Organization', entityId: abc._id, details: { note: 'Platform demo data' } }
  ];
  await AuditLog.insertMany(auditEvents);

  // Keep Green Valley intentionally small to show tenant isolation.
  const greenAdmin = await user('Green Valley Admin', 'admin@greenvalley.edu', 'Admin@123', 'INSTITUTION_ADMIN', green._id);
  const greenDept = await Department.create({ organizationId: green._id, name: 'Secondary School', code: 'SECONDARY' });
  const greenSection = await Section.create({ organizationId: green._id, departmentId: greenDept._id, name: 'Grade 10-A', semester: 10, academicYear: '2026-2027' });
  const greenFaculty = await user('Ravi Menon', 'faculty@greenvalley.edu', 'Faculty@123', 'FACULTY', green._id, { employeeId: 'GV-F01', departmentId: greenDept._id });
  await Subject.create({ organizationId: green._id, departmentId: greenDept._id, sectionId: greenSection._id, name: 'Mathematics', code: 'MATH10', facultyIds: [greenFaculty._id], periodsPerWeek: 6 });
  const greenStudentUser = await user('Aarav Shah', 'student@greenvalley.edu', 'Student@123', 'STUDENT', green._id);
  await Student.create({ organizationId: green._id, userId: greenStudentUser._id, rollNumber: 'GV10A01', sectionId: greenSection._id, admissionYear: 2025 });
  await AuditLog.create({ organizationId: green._id, actorId: greenAdmin._id, action: 'INSTITUTION_SETUP', entityType: 'Organization', entityId: green._id, details: { note: 'Second tenant for isolation demo' } });

  console.log('\nAttendX seed complete.');
  console.log('Platform Admin: platform@attendx.dev / Admin@123');
  console.log('Institution Admin: admin@svpcet.edu / Admin@123');
  console.log('Faculty: faculty@svpcet.edu / Faculty@123');
  console.log('Student: student@svpcet.edu / Student@123');
  console.log('Second tenant admin: admin@greenvalley.edu / Admin@123');
  await mongoose.connection.close();
}

seed().catch(async error => {
  console.error(error);
  await mongoose.connection.close();
  process.exit(1);
});
