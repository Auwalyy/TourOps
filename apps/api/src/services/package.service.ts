import { tourPackageRepository } from '../repositories/tourPackage.repository';
import { NotFoundError } from '../utils/errors';
import { getPaginationParams } from '../utils/helpers';

export const packageService = {
  async list(agencyId: string, query: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(query);
    return tourPackageRepository.search({
      agencyId,
      search: query.search as string,
      status: query.status as string,
      category: query.category as string,
      page,
      limit,
    });
  },

  async getById(agencyId: string, id: string) {
    const pkg = await tourPackageRepository.findOne({ _id: id, agencyId });
    if (!pkg) throw new NotFoundError('Package');
    return pkg;
  },

  async create(agencyId: string, userId: string, data: Record<string, unknown>) {
    const slug = await tourPackageRepository.generateSlug(agencyId, data.title as string);
    return tourPackageRepository.create({ ...data, agencyId, slug, createdBy: userId } as any);
  },

  async update(agencyId: string, id: string, data: Record<string, unknown>) {
    const pkg = await tourPackageRepository.findOne({ _id: id, agencyId });
    if (!pkg) throw new NotFoundError('Package');
    if (data.title && data.title !== pkg.title) {
      (data as any).slug = await tourPackageRepository.generateSlug(agencyId, data.title as string);
    }
    return tourPackageRepository.updateById(id, data);
  },

  async delete(agencyId: string, id: string) {
    const pkg = await tourPackageRepository.findOne({ _id: id, agencyId });
    if (!pkg) throw new NotFoundError('Package');
    return tourPackageRepository.deleteById(id);
  },
};
