'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { packagesApi } from '@/services/api.service';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';

const schema = z.object({
  title: z.string().min(2, 'Required'),
  description: z.string().min(10, 'Required'),
  category: z.enum(['tour', 'hajj_umrah', 'study_abroad', 'visa', 'custom']),
  destinations: z.string().min(1, 'Required'),
  durationDays: z.coerce.number().min(1),
  durationNights: z.coerce.number().min(0),
  basePrice: z.coerce.number().min(0),
  currency: z.string().default('USD'),
  status: z.enum(['draft', 'active', 'inactive']).default('draft'),
});

type FormData = z.infer<typeof schema>;

interface Props { open: boolean; onClose: () => void; }

export function PackageFormModal({ open, onClose }: Props) {
  const qc = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'tour', currency: 'USD', status: 'draft', durationNights: 0 },
  });

  async function onSubmit(data: FormData) {
    try {
      await packagesApi.create({
        title: data.title,
        description: data.description,
        category: data.category,
        destinations: data.destinations.split(',').map((d) => d.trim()),
        duration: { days: data.durationDays, nights: data.durationNights },
        pricing: { basePrice: data.basePrice, currency: data.currency, pricePerPerson: true },
        status: data.status,
      });
      toast.success('Package created');
      qc.invalidateQueries({ queryKey: ['packages'] });
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create package');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Tour Package" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Title *</Label>
            <Input error={errors.title?.message} {...register('title')} />
          </div>
          <div>
            <Label>Category *</Label>
            <Select {...register('category')}>
              <option value="tour">Tour</option>
              <option value="hajj_umrah">Hajj & Umrah</option>
              <option value="study_abroad">Study Abroad</option>
              <option value="visa">Visa</option>
              <option value="custom">Custom</option>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select {...register('status')}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Destinations * (comma-separated)</Label>
            <Input placeholder="Dubai, Abu Dhabi" error={errors.destinations?.message} {...register('destinations')} />
          </div>
          <div>
            <Label>Duration (Days) *</Label>
            <Input type="number" min={1} {...register('durationDays')} />
          </div>
          <div>
            <Label>Duration (Nights)</Label>
            <Input type="number" min={0} {...register('durationNights')} />
          </div>
          <div>
            <Label>Base Price *</Label>
            <Input type="number" min={0} step="0.01" {...register('basePrice')} />
          </div>
          <div>
            <Label>Currency</Label>
            <Select {...register('currency')}>
              <option value="USD">USD</option>
              <option value="NGN">NGN</option>
              <option value="GHS">GHS</option>
              <option value="KES">KES</option>
              <option value="ZAR">ZAR</option>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Description *</Label>
            <Textarea error={errors.description?.message} {...register('description')} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Create Package</Button>
        </div>
      </form>
    </Modal>
  );
}
