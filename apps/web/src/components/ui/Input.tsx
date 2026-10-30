'use client';
import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const inputBase =
  'w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] text-neutral-900 placeholder-neutral-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:opacity-60';

/** Single-line controls share the button height so toolbars line up. */
const controlHeight = 'h-8';

/**
 * The wrapper only exists to hold the error line. Without an error it is
 * `display: contents`, so a width like `w-44` on the control sizes the control
 * itself inside flex toolbars instead of a full-width wrapper.
 */
const wrap = (error?: string) => (error ? 'w-full' : 'contents');

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: string }>(
  ({ className, error, ...props }, ref) => (
    <div className={wrap(error)}>
      <input
        ref={ref}
        className={cn(inputBase, controlHeight, error && 'border-red-500 focus:border-red-500 focus:ring-red-500', className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }>(
  ({ className, error, ...props }, ref) => (
    <div className={wrap(error)}>
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
    <div className={wrap(error)}>
      <select
        ref={ref}
        className={cn(inputBase, controlHeight, 'cursor-pointer py-0', error && 'border-red-500', className)}
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
    className={cn('mb-1 block text-xs font-medium text-neutral-600', className)}
    {...props}
  />
);
