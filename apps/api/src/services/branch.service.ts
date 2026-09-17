import { Branch } from '../models/Branch';
import { TravelFile } from '../models/TravelFile';
import { NotFoundError, AppError } from '../utils/errors';

export const branchService = {
  async list(agencyId: string) {
    return Branch.find({ agencyId }).sort({ name: 1 }).lean();
  },

  async getById(agencyId: string, id: string) {
    const branch = await Branch.findOne({ _id: id, agencyId });
    if (!branch) throw new NotFoundError('Branch');
    return branch;
  },

  async create(agencyId: string, data: Record<string, unknown>) {
    if (!data.name || !String(data.name).trim()) throw new AppError('A branch name is required', 400);
    return Branch.create({
      agencyId,
      name: String(data.name).trim(),
      address: data.address,
      phone: data.phone,
    });
  },

  async update(agencyId: string, id: string, data: Record<string, unknown>) {
    const branch = await Branch.findOneAndUpdate(
      { _id: id, agencyId },
      { $set: { name: data.name, address: data.address, phone: data.phone, isActive: data.isActive } },
      { new: true, runValidators: true }
    );
    if (!branch) throw new NotFoundError('Branch');
    return branch;
  },

  async delete(agencyId: string, id: string) {
    const branch = await Branch.findOne({ _id: id, agencyId });
    if (!branch) throw new NotFoundError('Branch');

    const inUse = await TravelFile.countDocuments({ agencyId, branchId: id });
    if (inUse > 0) {
      throw new AppError(`This branch is assigned to ${inUse} travel file(s) — deactivate it instead`, 400);
    }
    return Branch.findByIdAndDelete(id);
  },
};
