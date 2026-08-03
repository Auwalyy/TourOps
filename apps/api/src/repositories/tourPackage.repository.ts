import { FilterQuery } from 'mongoose';
import { TourPackage, ITourPackage } from '../models/TourPackage';
import { BaseRepository } from './base.repository';

interface PackageFilter {
  agencyId: string;
  search?: string;
  status?: string;
  category?: string;
  page: number;
  limit: number;
}

class TourPackageRepository extends BaseRepository<ITourPackage> {
  constructor() {
    super(TourPackage);
  }

  async search({ agencyId, search, status, category, page, limit }: PackageFilter) {
    const filter: FilterQuery<ITourPackage> = { agencyId };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { destinations: { $in: [new RegExp(search, 'i')] } },
      ];
    }
    return this.paginate(filter, page, limit, { createdAt: -1 });
  }

  async generateSlug(agencyId: string, title: string): Promise<string> {
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let slug = base;
    let count = 0;
    while (await TourPackage.exists({ agencyId, slug })) {
      count++;
      slug = `${base}-${count}`;
    }
    return slug;
  }
}

export const tourPackageRepository = new TourPackageRepository();
