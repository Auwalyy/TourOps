'use client';
import { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { authApi } from '@/services/api.service';

const schema = z.object({
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must include uppercase, lowercase, number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      await authApi.resetPassword(token, data.password);
      toast.success('Password reset successfully');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reset failed. Link may have expired.');
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Set new password</h2>
        <p className="mt-1 text-sm text-gray-500">Choose a strong password for your account.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>New Password</Label>
          <Input type="password" placeholder="Min 8 chars" error={errors.password?.message} {...register('password')} />
        </div>
        <div>
          <Label>Confirm Password</Label>
          <Input type="password" placeholder="Repeat password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>Reset Password</Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-500">Loading reset form...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
