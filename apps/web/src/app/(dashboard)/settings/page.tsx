'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { authApi, usersApi } from '@/services/api.service';
import { useAuthStore } from '@/stores/auth.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must include uppercase, lowercase, number'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type ProfileData = z.infer<typeof profileSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName, lastName: user?.lastName, phone: user?.phone },
  });

  const passwordForm = useForm<PasswordData>({ resolver: zodResolver(passwordSchema) });

  async function onProfileSave(data: ProfileData) {
    try {
      const res = await usersApi.updateProfile(data);
      updateUser(res.data.data);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
  }

  async function onPasswordChange(data: PasswordData) {
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword);
      toast.success('Password changed successfully');
      passwordForm.reset();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account and preferences" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(onProfileSave)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input error={profileForm.formState.errors.firstName?.message} {...profileForm.register('firstName')} />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input error={profileForm.formState.errors.lastName?.message} {...profileForm.register('lastName')} />
                </div>
                <div className="col-span-2">
                  <Label>Email</Label>
                  <Input value={user?.email} disabled className="opacity-60" />
                </div>
                <div className="col-span-2">
                  <Label>Phone</Label>
                  <Input {...profileForm.register('phone')} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={profileForm.formState.isSubmitting}>Save Changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onPasswordChange)} className="space-y-4">
              <div>
                <Label>Current Password</Label>
                <Input type="password" error={passwordForm.formState.errors.currentPassword?.message} {...passwordForm.register('currentPassword')} />
              </div>
              <div>
                <Label>New Password</Label>
                <Input type="password" error={passwordForm.formState.errors.newPassword?.message} {...passwordForm.register('newPassword')} />
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input type="password" error={passwordForm.formState.errors.confirmPassword?.message} {...passwordForm.register('confirmPassword')} />
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={passwordForm.formState.isSubmitting}>Change Password</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader><CardTitle>Account Information</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Role" value={user?.role?.replace(/_/g, ' ') || '—'} />
            <Row label="Account Status" value={user?.isActive ? 'Active' : 'Inactive'} />
            <Row label="Last Login" value={user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium capitalize text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  );
}
