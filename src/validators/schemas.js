import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100)
});

export const registerSchema = z.object({
  institutionName: z.string().min(2).max(120),
  institutionType: z.enum(['SCHOOL', 'COLLEGE']),
  adminName: z.string().min(2).max(100),
  adminEmail: z.string().email(),
  password: z.string().min(8).max(100)
});

export const createStudentSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  rollNumber: z.string().min(1).max(30),
  sectionId: z.string().min(1),
  admissionYear: z.coerce.number().int().min(2000).max(2100)
});

export const createDepartmentSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(15)
});

export const createSectionSchema = z.object({
  departmentId: z.string().min(1),
  name: z.string().min(1).max(50),
  semester: z.coerce.number().int().min(1).max(12),
  academicYear: z.string().min(4).max(20)
});

export const createSubjectSchema = z.object({
  departmentId: z.string().min(1),
  sectionId: z.string().min(1),
  name: z.string().min(2).max(120),
  code: z.string().min(2).max(20),
  periodsPerWeek: z.coerce.number().int().min(1).max(20).default(3),
  facultyIds: z.array(z.string().min(1)).default([])
});

export const createFacultySchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  employeeId: z.string().min(1).max(30),
  departmentId: z.string().min(1)
});

export const createAttendanceSchema = z.object({
  sectionId: z.string().min(1),
  subjectId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  topic: z.string().max(200).optional().default(''),
  records: z.array(z.object({
    studentId: z.string().min(1),
    status: z.enum(['PRESENT', 'ABSENT'])
  })).min(1)
});

export const correctionSchema = z.object({
  attendanceRecordId: z.string().min(1),
  requestedStatus: z.enum(['PRESENT', 'ABSENT']),
  reason: z.string().min(5).max(500)
});

export const reviewCorrectionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().max(500).optional().default('')
});

export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    const error = new Error(message);
    error.status = 400;
    throw error;
  }
  return result.data;
}
