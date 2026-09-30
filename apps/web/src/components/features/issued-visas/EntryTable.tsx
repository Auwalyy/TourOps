'use client';
import { Paperclip } from 'lucide-react';
import { VisaIssuance } from '@/types';
import { formatDate } from '@/lib/utils';

/** Shared by the Issued tabs and the group detail page. */
export function EntryTable({
  entries,
  selected,
  onToggle,
  onEdit,
}: {
  entries: VisaIssuance[];
  selected: Record<string, true>;
  onToggle: (id: string) => void;
  onEdit: (entry: VisaIssuance) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-[13px]">
        <thead>
          <tr className="border-b border-neutral-200 text-[11px] text-neutral-500">
            <th className="w-8 px-4 py-2.5"></th>
            <th className="px-4 py-2.5 text-left">Passport No.</th>
            <th className="px-4 py-2.5 text-left">Name</th>
            <th className="px-4 py-2.5 text-left">Number</th>
            <th className="px-4 py-2.5 text-left">Purpose</th>
            <th className="px-4 py-2.5 text-left">Issued</th>
            <th className="px-4 py-2.5 text-left">File</th>
            <th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {entries.map((e) => (
            <tr key={e._id} className="hover:bg-neutral-50">
              <td className="px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={!!selected[e._id]}
                  onChange={() => onToggle(e._id)}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-neutral-300 text-blue-600"
                />
              </td>
              <td className="px-4 py-2.5 font-mono font-medium text-neutral-900">{e.passportNumber}</td>
              <td className="px-4 py-2.5 text-neutral-700">{e.travellerName}</td>
              <td className="px-4 py-2.5 font-mono text-neutral-700">{e.documentNumber || '—'}</td>
              <td className="px-4 py-2.5 text-neutral-600">{e.purpose || '—'}</td>
              <td className="px-4 py-2.5 text-neutral-500">{e.issueDate ? formatDate(e.issueDate) : '—'}</td>
              <td className="px-4 py-2.5">
                {e.fileUrl ? (
                  <a
                    href={e.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <Paperclip className="h-3 w-3" /> View
                  </a>
                ) : (
                  <span className="text-xs text-neutral-400">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right">
                <button onClick={() => onEdit(e)} className="text-xs text-neutral-500 hover:text-blue-600">
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
