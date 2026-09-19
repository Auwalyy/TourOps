'use client';
import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const inputBase =
  'w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] text-neutral-900 placeholder-neutral-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: string }>(
  ({ className, error, ...props }, ref) => (
    <div className="w-full">
      <input
        ref={ref}
        className={cn(inputBase, error && 'border-red-500 focus:border-red-500 focus:ring-red-500', className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }>(
  ({ className, error, ...props }, ref) => (
    <div className="w-full">
      <textarea
        ref={ref}
        rows={3}
        className={cn(inputBase, 'resize-none', error && 'border-red-500', className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { error?: string }>(
  ({ className, error, children, ...props }, ref) => (
    <div className="w-full">
      <select
        ref={ref}
        className={cn(inputBase, 'cursor-pointer', error && 'border-red-500', className)}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';

export const Label = ({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn('mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400', className)}
    {...props}
  />
);
