import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  topic: { type: String, trim: true, maxlength: 200, default: '' },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['DRAFT', 'FINALIZED'], default: 'FINALIZED' },
  finalizedAt: { type: Date, default: Date.now }
}, { timestamps: true });

schema.index({ organizationId: 1, sectionId: 1, subjectId: 1, date: 1, startTime: 1 }, { unique: true });

export default mongoose.model('AttendanceSession', schema);
