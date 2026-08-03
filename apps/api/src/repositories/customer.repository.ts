import { FilterQuery } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer';
import { BaseRepository } from './base.repository';

interface CustomerFilter {
  agencyId: string;
  search?: string;
  status?: string;
  tags?: string[];
  assignedTo?: string;
  page: number;
  limit: number;
}

class CustomerRepository extends BaseRepository<ICustomer> {
  constructor() {
    super(Customer);
  }

  async search({ agencyId, search, status, tags, assignedTo, page, limit }: CustomerFilter) {
    const filter: FilterQuery<ICustomer> = { agencyId };
    if (status) filter.status = status;
    if (tags?.length) filter.tags = { $in: tags };
    if (assignedTo) filter.assignedTo = assignedTo;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    return this.paginate(filter, page, limit, { createdAt: -1 }, 'assignedTo');
  }

  async findDuplicates(agencyId: string, email: string, phone: string): Promise<ICustomer[]> {
    return Customer.find({
      agencyId,
      $or: [{ email }, { phone }],
    }).exec();
  }

  async mergeCustomers(primaryId: string, secondaryId: string): Promise<ICustomer | null> {
    const secondary = await Customer.findById(secondaryId);
    if (!secondary) return null;
    await Customer.findByIdAndDelete(secondaryId);
    return Customer.findByIdAndUpdate(
      primaryId,
      { $addToSet: { tags: { $each: secondary.tags } } },
      { new: true }
    ).exec();
  }
}

export const customerRepository = new CustomerRepository();
