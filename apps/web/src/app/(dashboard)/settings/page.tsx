'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { authApi, usersApi, agencyApi } from '@/services/api.service';
import { useAuthStore } from '@/stores/auth.store';
import { useBrandingStore } from '@/stores/branding.store';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Label, Textarea } from '@/components/ui/Input';

// ─── Schemas ──────────────────────────────────────────────────────────────────
const companySchema = z.object({
  name: z.string().min(2, 'Required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(7, 'Required'),
  address: z.string().min(5, 'Required'),
  country: z.string().min(2, 'Required'),
  website: z.string().optional(),
  licenseNumber: z.string().optional(),
  rcNumber: z.string().optional(),
  whatsappNumber: z.string().optional(),
  bankName: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
});

const brandingSchema = z.object({
  companyName: z.string().min(1, 'Required'),
  tagline: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex e.g. #2563eb'),
  logoUrl: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  faviconUrl: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
});

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

type CompanyData = z.infer<typeof companySchema>;
type BrandingData = z.infer<typeof brandingSchema>;
type ProfileData = z.infer<typeof profileSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { branding, update: updateBranding } = useBrandingStore();
  const isOwner = user?.role === 'agency_owner' || user?.role === 'system_admin';

  // ─── Company form ────────────────────────────────────────────────────────
  const companyForm = useForm<CompanyData>({ resolver: zodResolver(companySchema) });

  useEffect(() => {
    if (!isOwner) return;
    agencyApi.getProfile().then((res) => {
      const a = res.data.data;
      if (!a) return;
      companyForm.reset({
        name: a.name || '',
        email: a.email || '',
        phone: a.phone || '',
        address: a.address || '',
        country: a.country || '',
        website: a.website || '',
        licenseNumber: a.licenseNumber || '',
        rcNumber: a.rcNumber || '',
        whatsappNumber: a.whatsappNumber || '',
        bankName: a.bankDetails?.bankName || '',
        accountName: a.bankDetails?.accountName || '',
        accountNumber: a.bankDetails?.accountNumber || '',
      });
    }).catch(() => {});
  }, [isOwner]);

  async function onCompanySave(data: CompanyData) {
    try {
      await agencyApi.updateProfile({
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        country: data.country,
        website: data.website,
        licenseNumber: data.licenseNumber,
        rcNumber: data.rcNumber,
        whatsappNumber: data.whatsappNumber,
        bankDetails: {
          bankName: data.bankName,
          accountName: data.accountName,
          accountNumber: data.accountNumber,
        },
      });
      toast.success('Company details updated');
    } catch { toast.error('Failed to update company details'); }
  }

  // ─── Branding form ───────────────────────────────────────────────────────
  const brandingForm = useForm<BrandingData>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      companyName: branding.companyName,
      tagline: branding.tagline,
      primaryColor: branding.primaryColor,
      logoUrl: branding.logoUrl,
      faviconUrl: branding.faviconUrl,
    },
  });

  async function onBrandingSave(data: BrandingData) {
    try {
      await agencyApi.updateBranding(data);
      updateBranding(data);
      document.documentElement.style.setProperty('--color-primary', data.primaryColor);
      toast.success('Branding updated');
    } catch { toast.error('Failed to update branding'); }
  }

  // ─── Profile form ────────────────────────────────────────────────────────
  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName, lastName: user?.lastName, phone: user?.phone },
  });

  async function onProfileSave(data: ProfileData) {
    try {
      const res = await usersApi.updateProfile(data);
      updateUser(res.data.data);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
  }

  // ─── Password form ───────────────────────────────────────────────────────
  const passwordForm = useForm<PasswordData>({ resolver: zodResolver(passwordSchema) });

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
    <div className="space-y-8">
      <PageHeader title="Settings" description="Manage your company, branding, and account preferences" />

      {isOwner && (
        <>
          {/* ── Company Details ── */}
          <section>
            <SectionLabel>Company Details</SectionLabel>
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={companyForm.handleSubmit(onCompanySave)} className="space-y-6">
                  {/* Basic info */}
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Basic Information</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label>Company / Agency Name *</Label>
                        <Input placeholder="Sunrise Travel Agency" error={companyForm.formState.errors.name?.message} {...companyForm.register('name')} />
                      </div>
                      <div>
                        <Label>Business Email *</Label>
                        <Input type="email" placeholder="info@agency.com" error={companyForm.formState.errors.email?.message} {...companyForm.register('email')} />
                      </div>
                      <div>
                        <Label>Phone Number *</Label>
                        <Input placeholder="+234 800 000 0000" error={companyForm.formState.errors.phone?.message} {...companyForm.register('phone')} />
                      </div>
                      <div>
                        <Label>WhatsApp Number</Label>
                        <Input placeholder="+234 800 000 0000" {...companyForm.register('whatsappNumber')} />
                        <p className="mt-1 text-xs text-gray-400">Used for the WhatsApp button on your deals page</p>
                      </div>
                      <div>
                        <Label>Website</Label>
                        <Input placeholder="https://agency.com" {...companyForm.register('website')} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Address *</Label>
                        <Input placeholder="123 Main Street, Lagos, Nigeria" error={companyForm.formState.errors.address?.message} {...companyForm.register('address')} />
                      </div>
                      <div>
                        <Label>Country *</Label>
                        <Input placeholder="Nigeria" error={companyForm.formState.errors.country?.message} {...companyForm.register('country')} />
                      </div>
                    </div>
                  </div>

                  {/* Legal */}
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Legal & Registration</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label>RC Number (CAC)</Label>
                        <Input placeholder="RC 1234567" {...companyForm.register('rcNumber')} />
                        <p className="mt-1 text-xs text-gray-400">Printed on invoices and receipts</p>
                      </div>
                      <div>
                        <Label>License Number</Label>
                        <Input placeholder="NANTA-XXXX" {...companyForm.register('licenseNumber')} />
                      </div>
                    </div>
                  </div>

                  {/* Bank details */}
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Bank Details</p>
                    <p className="mb-3 text-xs text-gray-400">These appear on invoices and receipts so customers know where to pay.</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <Label>Bank Name</Label>
                        <Input placeholder="First Bank" {...companyForm.register('bankName')} />
                      </div>
                      <div>
                        <Label>Account Name</Label>
                        <Input placeholder="Sunrise Travel Agency Ltd" {...companyForm.register('accountName')} />
                      </div>
                      <div>
                        <Label>Account Number</Label>
                        <Input placeholder="0123456789" {...companyForm.register('accountNumber')} />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-gray-100 pt-4">
                    <Button type="submit" loading={companyForm.formState.isSubmitting}>Save Company Details</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </section>

          {/* ── Branding ── */}
          <section>
            <SectionLabel>Branding & Appearance</SectionLabel>
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={brandingForm.handleSubmit(onBrandingSave)} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Display Name</Label>
                      <Input placeholder="Sunrise Travel" error={brandingForm.formState.errors.companyName?.message} {...brandingForm.register('companyName')} />
                      <p className="mt-1 text-xs text-gray-400">Shown in the sidebar, login page, and customer portal</p>
                    </div>
                    <div>
                      <Label>Primary Color</Label>
                      <div className="flex gap-2">
                        <Input placeholder="#2563eb" error={brandingForm.formState.errors.primaryColor?.message} {...brandingForm.register('primaryColor')} />
                        <input type="color" {...brandingForm.register('primaryColor')} className="h-10 w-10 cursor-pointer rounded-lg border border-gray-200 p-0.5" />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Tagline</Label>
                      <Input placeholder="Your trusted travel partner" {...brandingForm.register('tagline')} />
                    </div>
                    <div>
                      <Label>Logo URL</Label>
                      <Input placeholder="https://cdn.example.com/logo.png" error={brandingForm.formState.errors.logoUrl?.message} {...brandingForm.register('logoUrl')} />
                    </div>
                    <div>
                      <Label>Favicon URL</Label>
                      <Input placeholder="https://cdn.example.com/favicon.ico" error={brandingForm.formState.errors.faviconUrl?.message} {...brandingForm.register('faviconUrl')} />
                    </div>
                  </div>
                  <div className="flex justify-end border-t border-gray-100 pt-4">
                    <Button type="submit" loading={brandingForm.formState.isSubmitting}>Save Branding</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {/* ── Personal & Security ── */}
      <section>
        <SectionLabel>Personal & Security</SectionLabel>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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

          <Card>
            <CardHeader><CardTitle>Account Information</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Role" value={user?.role?.replace(/_/g, ' ') || '—'} />
              <Row label="Account Status" value={user?.isActive ? 'Active' : 'Inactive'} />
              <Row label="Last Login" value={user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'} />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">{children}</h2>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium capitalize text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  );
}
