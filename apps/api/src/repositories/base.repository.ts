import { Model, Document, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';

export class BaseRepository<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne(filter).exec();
  }

  async find(
    filter: FilterQuery<T>,
    options: QueryOptions = {}
  ): Promise<T[]> {
    return this.model.find(filter, null, options).exec();
  }

  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data);
  }

  async updateById(id: string, update: UpdateQuery<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, update, { new: true, runValidators: true }).exec();
  }

  async deleteById(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  async count(filter: FilterQuery<T>): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async paginate(
    filter: FilterQuery<T>,
    page: number,
    limit: number,
    sort: Record<string, 1 | -1> = { createdAt: -1 },
    populate?: string | string[]
  ): Promise<{ data: T[]; total: number }> {
    const skip = (page - 1) * limit;
    let query = this.model.find(filter).sort(sort).skip(skip).limit(limit);
    if (populate) {
      const fields = Array.isArray(populate) ? populate : [populate];
      fields.forEach((f) => { query = query.populate(f) as typeof query; });
    }
    const [data, total] = await Promise.all([query.exec(), this.model.countDocuments(filter)]);
    return { data, total };
  }
}
