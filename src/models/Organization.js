import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  type: { type: String, enum: ['SCHOOL', 'COLLEGE'], required: true },
  contactEmail: { type: String, required: true, lowercase: true, trim: true },
  status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
  attendancePolicy: {
    minimumPercentage: { type: Number, min: 0, max: 100, default: 75 },
    warningThreshold: { type: Number, min: 0, max: 100, default: 80 }
  }
}, { timestamps: true });

export default mongoose.model('Organization', organizationSchema);
