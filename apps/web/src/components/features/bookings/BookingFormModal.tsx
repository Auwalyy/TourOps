'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { bookingsApi, customersApi, packagesApi } from '@/services/api.service';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';

const schema = z.discriminatedUnion('customerMode', [
  z.object({
    customerMode: z.literal('existing'),
    customerId: z.string().min(1, 'Please select a customer'),
    bookingType: z.enum(['package', 'visa', 'custom']),
    packageId: z.string().optional(),
    travelDate: z.string().optional(),
    returnDate: z.string().optional(),
    numberOfTravelers: z.coerce.number().min(1),
    totalAmount: z.coerce.number().min(0),
    currency: z.string().default('USD'),
    notes: z.string().optional(),
  }),
  z.object({
    customerMode: z.literal('new'),
    customerFirstName: z.string().min(1, 'First name required'),
    customerLastName: z.string().min(1, 'Last name required'),
    customerEmail: z.string().email('Valid email required'),
    bookingType: z.enum(['package', 'visa', 'custom']),
    packageId: z.string().optional(),
    travelDate: z.string().optional(),
    returnDate: z.string().optional(),
    numberOfTravelers: z.coerce.number().min(1),
    totalAmount: z.coerce.number().min(0),
    currency: z.string().default('USD'),
    notes: z.string().optional(),
  }),
]);

type FormData = z.infer<typeof schema>;

interface Props { open: boolean; onClose: () => void; }

export function BookingFormModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');

  const { data: customers } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => customersApi.list({ limit: 100 }).then((r) => r.data.data),
    enabled: open,
  });

  const { data: packages } = useQuery({
    queryKey: ['packages', 'active'],
    queryFn: () => packagesApi.list({ status: 'active', limit: 100 }).then((r) => r.data.data),
    enabled: open,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { customerMode: 'existing', bookingType: 'custom', numberOfTravelers: 1, currency: 'USD' } as any,
  });

  async function onSubmit(data: FormData) {
    try {
      await bookingsApi.create({ ...data, customerMode });
      toast.success('Booking created');
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create booking');
    }
  }

  function handleClose() {
    reset();
    setCustomerMode('existing');
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Booking" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
        {/* Customer mode toggle */}
        <div>
          <Label>Customer</Label>
          <div className="mt-1 flex rounded-lg border border-gray-200 p-1 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setCustomerMode('existing')}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                customerMode === 'existing'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Select Existing
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode('new')}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                customerMode === 'new'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Add New Customer
            </button>
          </div>
        </div>

        <input type="hidden" value={customerMode} {...register('customerMode')} />

        {customerMode === 'existing' ? (
          <div>
            <Select error={(errors as any).customerId?.message} {...register('customerId')}>
              <option value="">Select customer...</option>
              {customers?.map((c: any) => (
                <option key={c._id} value={c._id}>{c.fullName} — {c.email}</option>
              ))}
            </Select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First Name *</Label>
              <Input
                placeholder="John"
                error={(errors as any).customerFirstName?.message}
                {...register('customerFirstName')}
              />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input
                placeholder="Doe"
                error={(errors as any).customerLastName?.message}
                {...register('customerLastName')}
              />
            </div>
            <div className="col-span-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                error={(errors as any).customerEmail?.message}
                {...register('customerEmail')}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Booking Type *</Label>
            <Select {...register('bookingType')}>
              <option value="custom">Custom</option>
              <option value="package">Package</option>
              <option value="visa">Visa</option>
            </Select>
          </div>
          <div>
            <Label>Package (optional)</Label>
            <Select {...register('packageId')}>
              <option value="">None</option>
              {packages?.map((p: any) => (
                <option key={p._id} value={p._id}>{p.title}</option>
              ))}
            </Select>
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
            <Label>Travelers</Label>
            <Input type="number" min={1} {...register('numberOfTravelers')} />
          </div>
          <div>
            <Label>Total Amount</Label>
            <Input type="number" min={0} step="0.01" {...register('totalAmount')} />
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
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea {...register('notes')} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Create Booking</Button>
        </div>
      </form>
    </Modal>
  );
}
