'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { visasApi, customersApi } from '@/services/api.service';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';

const schema = z.object({
  customerId: z.string().min(1, 'Customer required'),
  visaType: z.string().min(1, 'Visa type required'),
  destinationCountry: z.string().min(1, 'Country required'),
  purposeOfTravel: z.string().min(1, 'Purpose required'),
  travelDate: z.string().optional(),
  returnDate: z.string().optional(),
  dueDate: z.string().optional(),
  fees: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props { open: boolean; onClose: () => void; }

export function VisaFormModal({ open, onClose }: Props) {
  const qc = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => customersApi.list({ limit: 100 }).then((r) => r.data.data),
    enabled: open,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      await visasApi.create(data);
      toast.success('Visa application created');
      qc.invalidateQueries({ queryKey: ['visas'] });
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create application');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Visa Application" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Customer *</Label>
            <Select error={errors.customerId?.message} {...register('customerId')}>
              <option value="">Select customer</option>
              {customers?.map((c: any) => (
                <option key={c._id} value={c._id}>{c.fullName} — {c.email}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Destination Country *</Label>
            <Input error={errors.destinationCountry?.message} {...register('destinationCountry')} />
          </div>
          <div>
            <Label>Visa Type *</Label>
            <Input placeholder="Tourist, Business, Student..." error={errors.visaType?.message} {...register('visaType')} />
          </div>
          <div className="col-span-2">
            <Label>Purpose of Travel *</Label>
            <Input error={errors.purposeOfTravel?.message} {...register('purposeOfTravel')} />
          </div>
          <div>
            <Label>Travel Date</Label>
            <Input type="date" {...register('travelDate')} />
          </div>
          <div>
            <Label>Return Date</Label>
            <Input type="date" {...register('returnDate')} />
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" {...register('dueDate')} />
          </div>
          <div>
            <Label>Fees</Label>
            <Input type="number" min={0} step="0.01" {...register('fees')} />
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea {...register('notes')} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Create Application</Button>
        </div>
      </form>
    </Modal>
  );
}
