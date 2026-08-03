'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { authApi } from '@/services/api.service';
import { CheckCircle } from 'lucide-react';

const schema = z.object({ email: z.string().email('Invalid email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Check your email</h2>
        <p className="mt-2 text-sm text-gray-500">If that email exists, we've sent a reset link.</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline">Back to login</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Forgot password?</h2>
        <p className="mt-1 text-sm text-gray-500">Enter your email and we'll send a reset link.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Email address</Label>
          <Input type="email" placeholder="you@agency.com" error={errors.email?.message} {...register('email')} />
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>Send reset link</Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        <Link href="/login" className="font-medium text-blue-600 hover:underline">Back to login</Link>
      </p>
    </div>
  );
}
