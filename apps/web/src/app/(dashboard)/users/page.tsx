'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { usersApi } from '@/services/api.service';
import { User } from '@/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge, Avatar } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Label, Select } from '@/components/ui/Input';

const inviteSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['travel_consultant', 'visa_officer', 'finance_officer', 'customer_support', 'system_admin']),
  phone: z.string().optional(),
});
type InviteData = z.infer<typeof inviteSchema>;

export default function UsersPage() {
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', 'staff'],
    queryFn: () => usersApi.listStaff().then((r) => r.data.data),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => {
      toast.success('User deactivated');
      qc.invalidateQueries({ queryKey: ['users'] });
      setDeactivateTarget(null);
    },
    onError: () => toast.error('Failed to deactivate user'),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InviteData>({
    resolver: zodResolver(inviteSchema),
  });

  async function onInvite(data: InviteData) {
    try {
      await usersApi.invite(data);
      toast.success('User invited successfully');
      qc.invalidateQueries({ queryKey: ['users'] });
      reset();
      setShowInvite(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to invite user');
    }
  }

  const roleColors: Record<string, string> = {
    agency_owner: 'purple',
    system_admin: 'red',
    travel_consultant: 'blue',
    visa_officer: 'green',
    finance_officer: 'orange',
    customer_support: 'default',
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Team Member',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.fullName} src={row.avatar} size="sm" />
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{row.fullName}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <Badge variant={roleColors[row.role] || 'default'} className="capitalize">
          {row.role.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    { key: 'phone', header: 'Phone', render: (row) => row.phone || '—' },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => <Badge variant={row.isActive ? 'green' : 'default'}>{row.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    { key: 'lastLogin', header: 'Last Login', render: (row) => row.lastLogin ? formatDate(row.lastLogin) : 'Never' },
    {
      key: 'actions',
      header: '',
      render: (row) => row.isActive ? (
        <button onClick={(e) => { e.stopPropagation(); setDeactivateTarget(row); }} className="rounded p-1 text-gray-400 hover:text-red-500">
          <UserX className="h-4 w-4" />
        </button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Manage your agency staff and their roles"
        actions={<Button onClick={() => setShowInvite(true)}><UserPlus className="h-4 w-4" /> Invite Member</Button>}
      />

      <Card>
        <DataTable
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          total={data?.total}
          keyExtractor={(row) => row._id}
          emptyMessage="No team members found."
        />
      </Card>

      {/* Invite Modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite Team Member" size="md">
        <form onSubmit={handleSubmit(onInvite)} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input error={errors.firstName?.message} {...register('firstName')} />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input error={errors.lastName?.message} {...register('lastName')} />
            </div>
            <div className="col-span-2">
              <Label>Email *</Label>
              <Input type="email" error={errors.email?.message} {...register('email')} />
            </div>
            <div>
              <Label>Role *</Label>
              <Select error={errors.role?.message} {...register('role')}>
                <option value="">Select role</option>
                <option value="travel_consultant">Travel Consultant</option>
                <option value="visa_officer">Visa Officer</option>
                <option value="finance_officer">Finance Officer</option>
                <option value="customer_support">Customer Support</option>
                <option value="system_admin">System Admin</option>
              </Select>
            </div>
            <div>
              <Label>Phone</Label>
              <Input {...register('phone')} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>Send Invite</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget._id)}
        title="Deactivate User"
        description={`Deactivate ${deactivateTarget?.fullName}? They will lose access to TourOps.`}
        confirmLabel="Deactivate"
        loading={deactivateMutation.isPending}
      />
    </div>
  );
}
