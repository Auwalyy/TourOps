import { userRepository } from '../repositories/user.repository';
import { emailService } from './email.service';
import { Agency } from '../models/Agency';
import { NotFoundError, ConflictError } from '../utils/errors';
import { getPaginationParams } from '../utils/helpers';
import { UserRole } from '../types/roles';

export const userService = {
  async listStaff(agencyId: string, query: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(query);
    const users = await userRepository.findByAgency(agencyId);
    return { data: users, total: users.length };
  },

  async getById(agencyId: string, id: string) {
    const user = await userRepository.findOne({ _id: id, agencyId });
    if (!user) throw new NotFoundError('User');
    return user;
  },

  async invite(agencyId: string, data: { firstName: string; lastName: string; email: string; role: UserRole; phone?: string }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw new ConflictError('Email already registered');

    const agency = await Agency.findById(agencyId);
    if (!agency) throw new NotFoundError('Agency');

    const tempPassword = `TourOps@${Math.random().toString(36).slice(-8)}`;
    const user = await userRepository.create({
      ...data,
      agencyId,
      password: tempPassword,
      isEmailVerified: true,
    } as any);

    await emailService.sendWelcome(user.email, user.firstName, agency.name);
    return user;
  },

  async update(agencyId: string, id: string, data: Record<string, unknown>) {
    const user = await userRepository.findOne({ _id: id, agencyId });
    if (!user) throw new NotFoundError('User');
    return userRepository.updateById(id, data);
  },

  async deactivate(agencyId: string, id: string) {
    const user = await userRepository.findOne({ _id: id, agencyId });
    if (!user) throw new NotFoundError('User');
    return userRepository.updateById(id, { isActive: false });
  },

  async updateProfile(userId: string, data: Record<string, unknown>) {
    return userRepository.updateById(userId, data);
  },
};
