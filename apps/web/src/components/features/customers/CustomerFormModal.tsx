'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { customersApi } from '@/services/api.service';
import { Customer } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(7, 'Required'),
  nationality: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dateOfBirth: z.string().optional(),
  notes: z.string().optional(),
  'passport.number': z.string().optional(),
  'passport.expiryDate': z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  customer?: Customer;
}

export function CustomerFormModal({ open, onClose, customer }: Props) {
  const qc = useQueryClient();
  const isEdit = !!customer;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: customer ? {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      nationality: customer.nationality,
      gender: customer.gender as any,
      notes: customer.notes,
    } : {},
  });

  async function onSubmit(data: FormData) {
    try {
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        nationality: data.nationality,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        notes: data.notes,
        passport: {
          number: data['passport.number'],
          expiryDate: data['passport.expiryDate'],
        },
      };

      if (isEdit) {
        await customersApi.update(customer!._id, payload);
        toast.success('Customer updated');
      } else {
        await customersApi.create(payload);
        toast.success('Customer created');
      }

      qc.invalidateQueries({ queryKey: ['customers'] });
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save customer');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Customer' : 'Add Customer'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>First Name *</Label>
            <Input error={errors.firstName?.message} {...register('firstName')} />
          </div>
          <div>
            <Label>Last Name *</Label>
            <Input error={errors.lastName?.message} {...register('lastName')} />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" error={errors.email?.message} {...register('email')} />
          </div>
          <div>
            <Label>Phone *</Label>
            <Input error={errors.phone?.message} {...register('phone')} />
          </div>
          <div>
            <Label>Nationality</Label>
            <Input {...register('nationality')} />
          </div>
          <div>
            <Label>Gender</Label>
            <Select {...register('gender')}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <Label>Date of Birth</Label>
            <Input type="date" {...register('dateOfBirth')} />
          </div>
          <div>
            <Label>Passport Number</Label>
            <Input {...register('passport.number')} />
          </div>
          <div>
            <Label>Passport Expiry</Label>
            <Input type="date" {...register('passport.expiryDate')} />
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea {...register('notes')} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Save Changes' : 'Create Customer'}</Button>
        </div>
      </form>
    </Modal>
  );
}
