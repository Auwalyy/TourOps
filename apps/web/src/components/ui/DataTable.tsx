'use client';
import { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Skeleton } from './Card';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  total?: number;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
}

export function DataTable<T>({
  columns, data, loading, total = 0, page = 1, limit = 20,
  onPageChange, emptyMessage = 'No records found', onRowClick, keyExtractor,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16">
        <Inbox className="mb-3 h-8 w-8 text-neutral-300" strokeWidth={1.5} />
        <p className="text-sm text-neutral-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13px] sm:min-w-full">
          <thead>
            <tr className="border-b border-neutral-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-medium text-neutral-500',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'transition-colors hover:bg-neutral-50',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('px-4 py-2.5 text-neutral-700', col.className)}
                  >
                    {col.render ? col.render(row) : String((row as any)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 border-t border-neutral-200 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2 text-xs text-neutral-500">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
