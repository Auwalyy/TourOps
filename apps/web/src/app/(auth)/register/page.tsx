'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { authApi } from '@/services/api.service';
import { useAuthStore } from '@/stores/auth.store';

const schema = z.object({
  agencyName: z.string().min(2, 'Agency name required'),
  agencyEmail: z.string().email('Invalid email'),
  agencyPhone: z.string().min(7, 'Phone required'),
  agencyAddress: z.string().min(5, 'Address required'),
  agencyCountry: z.string().min(2, 'Country required'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must include uppercase, lowercase, number'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      const res = await authApi.register(data);
      setAuth(res.data.data.user, res.data.data.accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create your agency</h2>
        <p className="mt-1 text-sm text-gray-500">Get started in minutes</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Agency Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Agency Name</Label>
            <Input placeholder="Sunrise Travel Agency" error={errors.agencyName?.message} {...register('agencyName')} />
          </div>
          <div>
            <Label>Agency Email</Label>
            <Input type="email" placeholder="info@agency.com" error={errors.agencyEmail?.message} {...register('agencyEmail')} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input placeholder="+234 800 000 0000" error={errors.agencyPhone?.message} {...register('agencyPhone')} />
          </div>
          <div>
            <Label>Country</Label>
            <Input placeholder="Nigeria" error={errors.agencyCountry?.message} {...register('agencyCountry')} />
          </div>
          <div>
            <Label>Address</Label>
            <Input placeholder="123 Main St, Lagos" error={errors.agencyAddress?.message} {...register('agencyAddress')} />
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 pt-2">Your Account</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>First Name</Label>
            <Input placeholder="John" error={errors.firstName?.message} {...register('firstName')} />
          </div>
          <div>
            <Label>Last Name</Label>
            <Input placeholder="Doe" error={errors.lastName?.message} {...register('lastName')} />
          </div>
          <div className="col-span-2">
            <Label>Email</Label>
            <Input type="email" placeholder="john@agency.com" error={errors.email?.message} {...register('email')} />
          </div>
          <div className="col-span-2">
            <Label>Password</Label>
            <Input type="password" placeholder="Min 8 chars, uppercase, number" error={errors.password?.message} {...register('password')} />
          </div>
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting}>Create Agency Account</Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
