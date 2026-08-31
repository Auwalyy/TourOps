'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRef, useState } from 'react';
import { Loader2, ScanLine, UploadCloud, X } from 'lucide-react';
import { travelFilesApi, customersApi, packagesApi, usersApi, aiApi } from '@/services/api.service';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().optional(),
  passportNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),

  travelType: z.enum(['umrah', 'hajj', 'study_abroad', 'tourist_visa', 'business', 'medical']),
  destination: z.string().min(1, 'Destination is required'),
  departureGroup: z.string().optional(),
  packageId: z.string().optional(),
  assignedConsultant: z.string().optional(),
  assignedVisaOfficer: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),

  totalCost: z.coerce.number().min(0).default(0),
  initialDeposit: z.coerce.number().min(0).default(0),
  depositMethod: z.enum(['cash', 'bank_transfer', 'card', 'other']).default('cash'),
  depositReference: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props { open: boolean; onClose: () => void; }

export function TravelFileFormModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);

  const { data: packages } = useQuery({
    queryKey: ['packages', 'active'],
    queryFn: () => packagesApi.list({ status: 'active', limit: 100 }).then((r) => r.data.data.data ?? r.data.data),
    enabled: open,
  });

  const { data: staff } = useQuery({
    queryKey: ['users', 'staff'],
    queryFn: () => usersApi.listStaff().then((r) => r.data.data.data ?? r.data.data),
    enabled: open,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { travelType: 'umrah', priority: 'normal', totalCost: 0, initialDeposit: 0, depositMethod: 'cash' },
  });

  const totalCost = watch('totalCost') || 0;
  const initialDeposit = watch('initialDeposit') || 0;
  const balance = Number(totalCost) - Number(initialDeposit);

  async function handlePassportUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPassportPreview(URL.createObjectURL(file));
    setScanning(true);

    try {
      const fd = new FormData();
      fd.append('passport', file);
      const res = await aiApi.extractPassport(fd);
      const data = res.data.data;

      if (data.firstName) setValue('firstName', data.firstName);
      if (data.lastName) setValue('lastName', data.lastName);
      if (data.passportNumber) setValue('passportNumber', data.passportNumber);
      if (data.dateOfBirth) setValue('dateOfBirth', data.dateOfBirth);
      if (data.nationality) setValue('nationality', data.nationality);

      toast.success('Passport scanned — please verify the details');
    } catch {
      toast.error('Could not extract passport data, please fill in manually');
    } finally {
      setScanning(false);
    }
  }

  function clearPassport() {
    setPassportPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function onSubmit(data: FormData) {
    try {
      // Upsert customer by passport number or create new
      let customerId: string;
      const customerRes = await customersApi.create({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || `${Date.now()}@placeholder.com`,
        phone: data.phone,
        ...(data.dateOfBirth && { dateOfBirth: data.dateOfBirth }),
        ...(data.nationality && { nationality: data.nationality }),
        ...(data.passportNumber && { passport: { number: data.passportNumber } }),
      });
      customerId = customerRes.data.data._id;

      const file = await travelFilesApi.create({
        customerId,
        travelType: data.travelType,
        destination: data.destination,
        departureGroup: data.departureGroup || undefined,
        packageId: data.packageId || undefined,
        assignedConsultant: data.assignedConsultant || undefined,
        assignedVisaOfficer: data.assignedVisaOfficer || undefined,
        priority: data.priority,
        totalCost: data.totalCost,
      });

      if (data.initialDeposit > 0) {
        await travelFilesApi.addPayment(file.data.data._id, {
          amount: data.initialDeposit,
          method: data.depositMethod,
          reference: data.depositReference || undefined,
          note: 'Initial deposit',
        });
      }

      toast.success('Travel file created');
      qc.invalidateQueries({ queryKey: ['travel-files'] });
      reset();
      clearPassport();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create travel file');
    }
  }

  function handleClose() { reset(); clearPassport(); onClose(); }

  const consultants = Array.isArray(staff) ? staff.filter((u: any) => ['travel_consultant', 'agency_owner', 'system_admin'].includes(u.role)) : [];
  const officers = Array.isArray(staff) ? staff.filter((u: any) => ['visa_officer', 'agency_owner', 'system_admin'].includes(u.role)) : [];

  return (
    <Modal open={open} onClose={handleClose} title="New Travel File" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">

        {/* ── Passport Scan ── */}
        <div>
          <Label>Customer Passport</Label>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handlePassportUpload} />

          {!passportPreview ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 w-full flex flex-col items-center gap-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 bg-gray-50 dark:bg-gray-800/50 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-all text-gray-400"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Upload Customer Passport</p>
                <p className="text-xs text-gray-400 mt-0.5">AI will auto-fill name, passport number & date of birth</p>
                <p className="text-xs text-gray-300 mt-1">JPG, PNG or PDF · Max 10MB</p>
              </div>
              <span className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700">
                Choose File
              </span>
            </button>
          ) : (
            <div className="mt-1 relative border rounded-lg overflow-hidden">
              <img src={passportPreview} alt="Passport" className="w-full max-h-40 object-cover" />
              {scanning && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 text-white">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm flex items-center gap-1"><ScanLine className="w-4 h-4" /> Scanning passport...</span>
                </div>
              )}
              {!scanning && (
                <button type="button" onClick={clearPassport}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Customer Details (auto-filled or manual) ── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>First Name *</Label>
            <Input placeholder="First name" error={errors.firstName?.message} {...register('firstName')} />
          </div>
          <div>
            <Label>Last Name *</Label>
            <Input placeholder="Last name" error={errors.lastName?.message} {...register('lastName')} />
          </div>
          <div>
            <Label>Phone *</Label>
            <Input placeholder="+234..." error={errors.phone?.message} {...register('phone')} />
          </div>
          <div>
            <Label>Email</Label>
            <Input placeholder="optional" {...register('email')} />
          </div>
          <div>
            <Label>Passport Number</Label>
            <Input placeholder="Auto-filled from scan" {...register('passportNumber')} />
          </div>
          <div>
            <Label>Date of Birth</Label>
            <Input type="date" {...register('dateOfBirth')} />
          </div>
          <div>
            <Label>Nationality</Label>
            <Input placeholder="Auto-filled from scan" {...register('nationality')} />
          </div>
        </div>

        {/* ── Travel Details ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Travel Type *</Label>
            <Select {...register('travelType')}>
              <option value="umrah">Umrah</option>
              <option value="hajj">Hajj</option>
              <option value="study_abroad">Study Abroad</option>
              <option value="tourist_visa">Tourist Visa</option>
              <option value="business">Business</option>
              <option value="medical">Medical</option>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select {...register('priority')}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>
          <div>
            <Label>Destination *</Label>
            <Input placeholder="e.g. Saudi Arabia" error={errors.destination?.message} {...register('destination')} />
          </div>
          <div>
            <Label>Departure Group</Label>
            <Input placeholder="e.g. Group A — Jan 2025" {...register('departureGroup')} />
          </div>
          <div className="col-span-2">
            <Label>Package (optional)</Label>
            <Select {...register('packageId')}>
              <option value="">None</option>
              {Array.isArray(packages) && packages.map((p: any) => (
                <option key={p._id} value={p._id}>{p.title}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Assigned Consultant</Label>
            <Select {...register('assignedConsultant')}>
              <option value="">Unassigned</option>
              {consultants.map((u: any) => (
                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Assigned Visa Officer</Label>
            <Select {...register('assignedVisaOfficer')}>
              <option value="">Unassigned</option>
              {officers.map((u: any) => (
                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* ── Payment ── */}
        <div className="border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">Payment</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Total Cost</Label>
              <Input type="number" min="0" placeholder="0" {...register('totalCost')} />
            </div>
            <div>
              <Label>Initial Deposit</Label>
              <Input type="number" min="0" placeholder="0" {...register('initialDeposit')} />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select {...register('depositMethod')}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <Label>Reference / Receipt No.</Label>
              <Input placeholder="optional" {...register('depositReference')} />
            </div>
          </div>
          {(totalCost > 0 || initialDeposit > 0) && (
            <div className="flex justify-between text-sm pt-1 border-t">
              <span className="text-muted-foreground">Balance remaining</span>
              <span className={balance < 0 ? 'text-destructive font-semibold' : 'font-semibold'}>
                {balance.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Create Travel File</Button>
        </div>
      </form>
    </Modal>
  );
}
