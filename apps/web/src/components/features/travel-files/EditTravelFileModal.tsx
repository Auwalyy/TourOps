'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { travelFilesApi, usersApi } from '@/services/api.service';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { TravelFile } from '@/types';

const schema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  departureGroup: z.string().optional(),
  departureDate: z.string().optional(),
  returnDate: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  totalCost: z.coerce.number().min(0),
  assignedConsultant: z.string().optional(),
  assignedVisaOfficer: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  file: TravelFile;
}

export function EditTravelFileModal({ open, onClose, file }: Props) {
  const qc = useQueryClient();

  const { data: staff } = useQuery({
    queryKey: ['users', 'staff'],
    queryFn: () => usersApi.listStaff().then((r) => r.data.data.data ?? r.data.data),
    enabled: open,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!open) return;
    const consultant = file.assignedConsultant as any;
    const officer = file.assignedVisaOfficer as any;
    reset({
      destination: file.destination,
      departureGroup: file.departureGroup || '',
      departureDate: file.departureDate ? file.departureDate.slice(0, 10) : '',
      returnDate: file.returnDate ? file.returnDate.slice(0, 10) : '',
      priority: file.priority,
      totalCost: file.totalCost,
      assignedConsultant: typeof consultant === 'object' ? consultant?._id : consultant || '',
      assignedVisaOfficer: typeof officer === 'object' ? officer?._id : officer || '',
    });
  }, [open, file, reset]);

  async function onSubmit(data: FormData) {
    try {
      await travelFilesApi.update(file._id, {
        destination: data.destination,
        departureGroup: data.departureGroup || undefined,
        departureDate: data.departureDate || undefined,
        returnDate: data.returnDate || undefined,
        priority: data.priority,
        totalCost: data.totalCost,
        assignedConsultant: data.assignedConsultant || undefined,
        assignedVisaOfficer: data.assignedVisaOfficer || undefined,
      });
      toast.success('Travel file updated');
      qc.invalidateQueries({ queryKey: ['travel-files', file._id] });
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update travel file');
    }
  }

  const consultants = Array.isArray(staff) ? staff.filter((u: any) => ['travel_consultant', 'agency_owner', 'system_admin'].includes(u.role)) : [];
  const officers = Array.isArray(staff) ? staff.filter((u: any) => ['visa_officer', 'agency_owner', 'system_admin'].includes(u.role)) : [];

  return (
    <Modal open={open} onClose={onClose} title="Edit Travel File" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Destination *</Label>
            <Input placeholder="e.g. Saudi Arabia" error={errors.destination?.message} {...register('destination')} />
          </div>
          <div>
            <Label>Departure Group</Label>
            <Input placeholder="e.g. Group A — Jan 2025" {...register('departureGroup')} />
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
            <Label>Departure Date</Label>
            <Input type="date" {...register('departureDate')} />
          </div>
          <div>
            <Label>Return Date</Label>
            <Input type="date" {...register('returnDate')} />
          </div>
          <div>
            <Label>Total Cost</Label>
            <Input type="number" min="0" {...register('totalCost')} />
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
          <div className="col-span-2">
            <Label>Assigned Visa Officer</Label>
            <Select {...register('assignedVisaOfficer')}>
              <option value="">Unassigned</option>
              {officers.map((u: any) => (
                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
}
