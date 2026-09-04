'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { receiptsApi, customersApi, invoicesApi, travelFilesApi } from '@/services/api.service';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { UserPlus, Users } from 'lucide-react';

// ─── Schemas ──────────────────────────────────────────────────────────────────
const existingCustomerSchema = z.object({
  customerMode: z.literal('existing'),
  customerId: z.string().min(1, 'Select a customer'),
  // new customer fields — ignored in this mode
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
});

const newCustomerSchema = z.object({
  customerMode: z.literal('new'),
  customerId: z.string().optional(),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
});

const baseSchema = z.object({
  amount: z.coerce.number().min(1, 'Amount required'),
  currency: z.string().default('NGN'),
  method: z.enum(['cash', 'bank_transfer', 'card', 'mobile_money', 'other']),
  reference: z.string().optional(),
  description: z.string().min(2, 'Description required'),
  notes: z.string().optional(),
  paidAt: z.string().optional(),
  invoiceId: z.string().optional(),
  travelFileId: z.string().optional(),
});

const schema = z.discriminatedUnion('customerMode', [
  existingCustomerSchema.merge(baseSchema),
  newCustomerSchema.merge(baseSchema),
]);

type FormData = z.infer<typeof schema>;

interface Props { open: boolean; onClose: () => void; }

export function ReceiptFormModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');

  const { data: customers } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => customersApi.list({ limit: 200 }).then((r) => r.data.data),
    enabled: open,
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<any>({
    defaultValues: {
      customerMode: 'existing',
      currency: 'NGN',
      method: 'cash',
      paidAt: new Date().toISOString().split('T')[0],
    },
  });

  const selectedCustomer = watch('customerId');

  const { data: customerInvoices } = useQuery({
    queryKey: ['invoices', 'customer', selectedCustomer],
    queryFn: () => invoicesApi.list({ customerId: selectedCustomer, limit: 50 }).then((r) => r.data.data),
    enabled: !!selectedCustomer && customerMode === 'existing',
  });

  const { data: customerFiles } = useQuery({
    queryKey: ['travel-files', 'customer', selectedCustomer],
    queryFn: () => travelFilesApi.list({ customerId: selectedCustomer, limit: 50 }).then((r) => r.data.data),
    enabled: !!selectedCustomer && customerMode === 'existing',
  });

  // Create new customer then receipt
  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => customersApi.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || undefined,
      phone: data.phone || undefined,
      status: 'active',
    }),
  });

  const createReceiptMutation = useMutation({
    mutationFn: (data: any) => receiptsApi.create(data),
    onSuccess: () => {
      toast.success('Receipt created');
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      reset();
      setCustomerMode('existing');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create receipt'),
  });

  const isSubmitting = createCustomerMutation.isPending || createReceiptMutation.isPending;

  async function onSubmit(data: any) {
    let customerId = data.customerId;

    // If new customer mode, create customer first
    if (customerMode === 'new') {
      try {
        const res = await createCustomerMutation.mutateAsync(data);
        customerId = res.data.data._id;
        toast.success(`Customer "${data.firstName} ${data.lastName}" created`);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to create customer');
        return;
      }
    }

    createReceiptMutation.mutate({
      customerId,
      amount: data.amount,
      currency: data.currency,
      method: data.method,
      reference: data.reference || undefined,
      description: data.description,
      notes: data.notes || undefined,
      paidAt: data.paidAt || undefined,
      invoiceId: data.invoiceId || undefined,
      travelFileId: data.travelFileId || undefined,
    });
  }

  function switchMode(mode: 'existing' | 'new') {
    setCustomerMode(mode);
    setValue('customerMode', mode);
    setValue('customerId', '');
    setValue('firstName', '');
    setValue('lastName', '');
    setValue('email', '');
    setValue('phone', '');
  }

  function handleClose() {
    reset();
    setCustomerMode('existing');
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Receipt" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">

        {/* Customer mode toggle */}
        <div>
          <Label>Customer *</Label>
          <div className="mt-1.5 flex rounded-xl border border-gray-200 p-1 gap-1 bg-gray-50">
            <button
              type="button"
              onClick={() => switchMode('existing')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                customerMode === 'existing'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-4 w-4" /> Select Existing
            </button>
            <button
              type="button"
              onClick={() => switchMode('new')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                customerMode === 'new'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserPlus className="h-4 w-4" /> Add New Customer
            </button>
          </div>
        </div>

        {/* Existing customer select */}
        {customerMode === 'existing' && (
          <div>
            <Select {...register('customerId')}>
              <option value="">Select customer...</option>
              {(customers || []).map((c: any) => (
                <option key={c._id} value={c._id}>
                  {c.fullName || `${c.firstName} ${c.lastName}`}
                  {c.phone ? ` — ${c.phone}` : ''}
                </option>
              ))}
            </Select>
            {errors.customerId && (
              <p className="mt-1 text-xs text-red-500">{errors.customerId.message as string}</p>
            )}
          </div>
        )}

        {/* New customer fields */}
        {customerMode === 'new' && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">New Customer Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name *</Label>
                <Input
                  placeholder="John"
                  error={errors.firstName?.message as string}
                  {...register('firstName')}
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input
                  placeholder="Doe"
                  error={errors.lastName?.message as string}
                  {...register('lastName')}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input placeholder="+234 800 000 0000" {...register('phone')} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="john@example.com" {...register('email')} />
              </div>
            </div>
          </div>
        )}

        {/* Payment details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Amount *</Label>
            <Input
              type="number" min={0} step="0.01" placeholder="0.00"
              error={errors.amount?.message as string}
              {...register('amount')}
            />
          </div>
          <div>
            <Label>Currency</Label>
            <Select {...register('currency')}>
              <option value="NGN">NGN — Naira</option>
              <option value="USD">USD</option>
              <option value="GHS">GHS</option>
              <option value="KES">KES</option>
              <option value="ZAR">ZAR</option>
            </Select>
          </div>

          <div>
            <Label>Payment Method *</Label>
            <Select {...register('method')}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <Label>Payment Date</Label>
            <Input type="date" {...register('paidAt')} />
          </div>

          <div className="col-span-2">
            <Label>Reference / Transaction ID</Label>
            <Input placeholder="e.g. TRF-123456" {...register('reference')} />
          </div>

          <div className="col-span-2">
            <Label>Description *</Label>
            <Input
              placeholder="e.g. Payment for Umrah package — 2 pax"
              error={errors.description?.message as string}
              {...register('description')}
            />
          </div>

          {/* Link to invoice — only for existing customers */}
          {customerMode === 'existing' && customerInvoices?.length > 0 && (
            <div>
              <Label>Link to Invoice (optional)</Label>
              <Select {...register('invoiceId')}>
                <option value="">None</option>
                {customerInvoices.map((inv: any) => (
                  <option key={inv._id} value={inv._id}>
                    {inv.invoiceNumber} — {inv.currency} {inv.totalAmount?.toLocaleString()}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Link to travel file — only for existing customers */}
          {customerMode === 'existing' && customerFiles?.length > 0 && (
            <div>
              <Label>Link to Travel File (optional)</Label>
              <Select {...register('travelFileId')}>
                <option value="">None</option>
                {customerFiles.map((f: any) => (
                  <option key={f._id} value={f._id}>
                    {f.fileNumber} — {f.destination}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="col-span-2">
            <Label>Notes (optional)</Label>
            <Textarea placeholder="Any additional notes..." rows={2} {...register('notes')} />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>
            {customerMode === 'new' ? 'Create Customer & Receipt' : 'Create Receipt'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
