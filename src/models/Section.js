import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
  name: { type: String, required: true, trim: true },
  semester: { type: Number, min: 1, max: 12, required: true },
  academicYear: { type: String, required: true, trim: true }
}, { timestamps: true });

schema.index({ organizationId: 1, departmentId: 1, name: 1, academicYear: 1 }, { unique: true });

export default mongoose.model('Section', schema);
