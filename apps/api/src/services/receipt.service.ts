import { receiptRepository } from '../repositories/receipt.repository';
import { Agency } from '../models/Agency';
import { NotFoundError } from '../utils/errors';
import { getPaginationParams, generateReceiptNumber } from '../utils/helpers';
import { generateStandaloneReceiptPDF } from './pdf.service';

export const receiptService = {
  async list(agencyId: string, query: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(query);
    return receiptRepository.search({
      agencyId,
      customerId: query.customerId as string,
      search: query.search as string,
      page,
      limit,
    });
  },

  async getById(agencyId: string, id: string) {
    const receipt = await receiptRepository.findOne({ _id: id, agencyId });
    if (!receipt) throw new NotFoundError('Receipt');
    return receipt;
  },

  async create(agencyId: string, userId: string, data: Record<string, unknown>) {
    const receiptNumber = generateReceiptNumber();
    return receiptRepository.create({
      ...data,
      agencyId,
      receiptNumber,
      issuedBy: userId,
    } as any);
  },

  async delete(agencyId: string, id: string) {
    const receipt = await receiptRepository.findOne({ _id: id, agencyId });
    if (!receipt) throw new NotFoundError('Receipt');
    return receiptRepository.deleteById(id);
  },

  async generatePDF(agencyId: string, id: string): Promise<Buffer> {
    const [receipt, agency] = await Promise.all([
      receiptRepository.findOne({ _id: id, agencyId }),
      Agency.findById(agencyId),
    ]);
    if (!receipt) throw new NotFoundError('Receipt');
    if (!agency) throw new NotFoundError('Agency');

    // Populate customer, issuedBy, invoiceId, travelFileId for PDF
    const populated = await (receipt as any).constructor
      .findById(receipt._id)
      .populate('customerId', 'firstName lastName fullName email phone')
      .populate('issuedBy', 'firstName lastName')
      .populate('invoiceId', 'invoiceNumber')
      .populate('travelFileId', 'fileNumber')
      .lean();

    return generateStandaloneReceiptPDF(populated, agency);
  },
};
