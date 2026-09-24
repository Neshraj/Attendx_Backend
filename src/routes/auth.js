import express from 'express';
import bcrypt from 'bcryptjs';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import { clearAuthCookie, setAuthCookie, signToken } from '../utils/auth.js';
import { loginSchema, parse, registerSchema } from '../validators/schemas.js';
import { requireAuth } from '../middleware/auth.js';
import { writeAudit } from '../utils/audit.js';

const router = express.Router();

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

router.post('/register-institution', async (req, res, next) => {
  try {
    const data = parse(registerSchema, req.body);
    const existingUser = await User.findOne({ email: data.adminEmail.toLowerCase() });
    if (existingUser) return res.status(409).json({ message: 'An account with this email already exists' });

    let slug = slugify(data.institutionName);
    if (!slug) slug = `institution-${Date.now()}`;
    if (await Organization.exists({ slug })) slug = `${slug}-${Date.now().toString().slice(-5)}`;

    const organization = await Organization.create({
      name: data.institutionName,
      slug,
      type: data.institutionType,
      contactEmail: data.adminEmail,
      attendancePolicy: { minimumPercentage: 75, warningThreshold: 80 }
    });

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({
      organizationId: organization._id,
      name: data.adminName,
      email: data.adminEmail,
      passwordHash,
      role: 'INSTITUTION_ADMIN'
    });

    const token = signToken(user);
    setAuthCookie(res, token);

    await writeAudit({
      req: { user: { _id: user._id, organizationId: organization._id } },
      action: 'INSTITUTION_CREATED',
      entityType: 'Organization',
      entityId: organization._id,
      details: { name: organization.name }
    });

    res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId } });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const data = parse(loginSchema, req.body);
    const user = await User.findOne({ email: data.email.toLowerCase() }).select('+passwordHash');
    if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid email or password' });

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid email or password' });

    const token = signToken(user);
    setAuthCookie(res, token);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      }
    });
  } catch (error) { next(error); }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Signed out' });
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      organizationId: req.user.organizationId,
      departmentId: req.user.departmentId,
      employeeId: req.user.employeeId
    }
  });
});

export default router;
