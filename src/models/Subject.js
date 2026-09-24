import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  facultyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  periodsPerWeek: { type: Number, min: 1, max: 20, default: 3 }
}, { timestamps: true });

schema.index({ organizationId: 1, code: 1, sectionId: 1 }, { unique: true });

export default mongoose.model('Subject', schema);
