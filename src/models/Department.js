import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true }
}, { timestamps: true });

schema.index({ organizationId: 1, code: 1 }, { unique: true });

export default mongoose.model('Department', schema);
