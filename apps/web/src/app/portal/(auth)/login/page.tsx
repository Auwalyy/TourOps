'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { authApi } from '@/services/api.service';
import { useAuthStore } from '@/stores/auth.store';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});
type FormData = z.infer<typeof schema>;

export default function PortalLoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      const res = await authApi.login(data.email, data.password);
      const user = res.data.data.user;
      if (user.role !== 'customer') {
        toast.error('This portal is for customers only. Please use the staff login.');
        return;
      }
      setAuth(user, res.data.data.accessToken);
      router.push('/portal/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Customer Portal</h1>
          <p className="mt-1 text-sm text-gray-500">Track your bookings, visas, and documents</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Email address</Label>
              <Input type="email" placeholder="you@email.com" error={errors.email?.message} {...register('email')} />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
            </div>
            <Button type="submit" className="w-full" loading={isSubmitting}>Sign in</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
