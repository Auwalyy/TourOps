import { customerRepository } from '../repositories/customer.repository';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { getPaginationParams } from '../utils/helpers';

export const customerService = {
  async list(agencyId: string, query: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(query);
    return customerRepository.search({
      agencyId,
      search: query.search as string,
      status: query.status as string,
      tags: query.tags ? String(query.tags).split(',') : undefined,
      assignedTo: query.assignedTo as string,
      page,
      limit,
    });
  },

  async getById(agencyId: string, id: string) {
    const customer = await customerRepository.findOne({ _id: id, agencyId });
    if (!customer) throw new NotFoundError('Customer');
    return customer;
  },

  async create(agencyId: string, data: Record<string, unknown>) {
    const existing = await customerRepository.findOne({ agencyId, email: data.email });
    if (existing) throw new ConflictError('A customer with this email already exists');
    return customerRepository.create({ ...data, agencyId } as any);
  },

  async update(agencyId: string, id: string, data: Record<string, unknown>) {
    const customer = await customerRepository.findOne({ _id: id, agencyId });
    if (!customer) throw new NotFoundError('Customer');
    return customerRepository.updateById(id, data);
  },

  async archive(agencyId: string, id: string) {
    const customer = await customerRepository.findOne({ _id: id, agencyId });
    if (!customer) throw new NotFoundError('Customer');
    return customerRepository.updateById(id, { status: 'archived' });
  },

  async delete(agencyId: string, id: string) {
    const customer = await customerRepository.findOne({ _id: id, agencyId });
    if (!customer) throw new NotFoundError('Customer');
    return customerRepository.deleteById(id);
  },

  async findDuplicates(agencyId: string, email: string, phone: string) {
    return customerRepository.findDuplicates(agencyId, email, phone);
  },

  async merge(agencyId: string, primaryId: string, secondaryId: string) {
    const [primary, secondary] = await Promise.all([
      customerRepository.findOne({ _id: primaryId, agencyId }),
      customerRepository.findOne({ _id: secondaryId, agencyId }),
    ]);
    if (!primary || !secondary) throw new NotFoundError('Customer');
    return customerRepository.mergeCustomers(primaryId, secondaryId);
  },
};
