'use client';
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { invoicesApi, customersApi } from '@/services/api.service';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Required'),
  quantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
});

const baseSchema = z.object({
  lineItems: z.array(lineItemSchema).min(1, 'At least one item required'),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  discount: z.coerce.number().min(0).default(0),
  currency: z.string().default('USD'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

const existingSchema = baseSchema.extend({
  customerMode: z.literal('existing'),
  customerId: z.string().min(1, 'Please select a customer'),
});

const newSchema = baseSchema.extend({
  customerMode: z.literal('new'),
  customerFirstName: z.string().min(1, 'First name required'),
  customerLastName: z.string().min(1, 'Last name required'),
  customerEmail: z.string().email('Valid email required'),
});

const schema = z.discriminatedUnion('customerMode', [existingSchema, newSchema]);
type FormData = z.infer<typeof schema>;

interface Props { open: boolean; onClose: () => void; }

export function InvoiceFormModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');

  const { data: customers } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => customersApi.list({ limit: 100 }).then((r) => r.data.data),
    enabled: open,
  });

  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerMode: 'existing',
      lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
      taxRate: 0,
      discount: 0,
      currency: 'USD',
    } as any,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });
  const lineItems = watch('lineItems');
  const taxRate = watch('taxRate') || 0;
  const discount = watch('discount') || 0;

  const subtotal = lineItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax - Number(discount);

  async function onSubmit(data: FormData) {
    try {
      await invoicesApi.create({ ...data, customerMode });
      toast.success('Invoice created');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      reset();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    }
  }

  function handleClose() {
    reset();
    setCustomerMode('existing');
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Invoice" size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">

        {/* Customer toggle */}
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
          <Select error={(errors as any).customerId?.message} {...register('customerId')}>
            <option value="">Select customer...</option>
            {customers?.map((c: any) => (
              <option key={c._id} value={c._id}>{c.fullName} — {c.email}</option>
            ))}
          </Select>
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
            <Label>Currency</Label>
            <Select {...register('currency')}>
              <option value="USD">USD</option>
              <option value="NGN">NGN</option>
              <option value="GHS">GHS</option>
              <option value="KES">KES</option>
              <option value="ZAR">ZAR</option>
            </Select>
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" {...register('dueDate')} />
          </div>
        </div>

        {/* Line items */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>Line Items *</Label>
            <Button type="button" variant="ghost" size="sm" onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}>
              <Plus className="h-3 w-3" /> Add Item
            </Button>
          </div>
          <div className="space-y-2">
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-12 items-start gap-2">
                <div className="col-span-6">
                  <Input placeholder="Description" {...register(`lineItems.${i}.description`)} />
                </div>
                <div className="col-span-2">
                  <Input type="number" min={1} placeholder="Qty" {...register(`lineItems.${i}.quantity`)} />
                </div>
                <div className="col-span-3">
                  <Input type="number" min={0} step="0.01" placeholder="Unit Price" {...register(`lineItems.${i}.unitPrice`)} />
                </div>
                <div className="col-span-1 flex justify-center pt-2">
                  <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tax Rate (%)</Label>
            <Input type="number" min={0} max={100} step="0.1" {...register('taxRate')} />
          </div>
          <div>
            <Label>Discount</Label>
            <Input type="number" min={0} step="0.01" {...register('discount')} />
          </div>
        </div>

        {/* Totals */}
        <div className="rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-800">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Tax ({taxRate}%)</span><span>${tax.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>-${Number(discount).toFixed(2)}</span></div>
          <div className="flex justify-between border-t border-gray-200 pt-2 font-bold dark:border-gray-700">
            <span>Total</span><span>${total.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea {...register('notes')} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Create Invoice</Button>
        </div>
      </form>
    </Modal>
  );
}
