'use client';
import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, FileText, X, AlertTriangle, Loader2, Trash2, Plus } from 'lucide-react';
import { aiApi, travelFilesApi } from '@/services/api.service';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

interface TravellerRow {
  firstName: string;
  lastName: string;
  passportNumber: string;
  dateOfBirth: string;
  expiryDate: string;
  nationality: string;
  gender: string;
  phone: string;
  /** How sure the extraction was, so low-confidence rows can be flagged. */
  confidence?: number;
}

const EMPTY_SHARED = {
  travelType: 'umrah',
  destination: 'Saudi Arabia',
  departureDate: '',
  returnDate: '',
  departureGroup: '',
  totalCost: '',
};

const TRAVEL_TYPES = [
  ['umrah', 'Umrah'],
  ['hajj', 'Hajj'],
  ['study_abroad', 'Study Abroad'],
  ['tourist_visa', 'Tourist Visa'],
  ['business', 'Business'],
  ['medical', 'Medical'],
  ['other', 'Other'],
];

/**
 * Upload one file holding several passports, review what was read, then open
 * a travel file for each traveller.
 *
 * The review step is deliberate: these are OCR guesses becoming customer
 * records, and a wrong passport number is expensive to unpick later.
 */
export function BulkPassportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<TravellerRow[]>([]);
  const [shared, setShared] = useState({ ...EMPTY_SHARED });
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<{ createdCount: number; failed: Array<{ name: string; reason: string }> } | null>(null);

  function reset() {
    setRows([]);
    setShared({ ...EMPTY_SHARED });
    setFileName('');
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  const extract = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return aiApi.extractPassportBatch(fd).then((r) => r.data);
    },
    onSuccess: (res) => {
      if (res?.success === false) {
        toast.error(res.message || 'Could not read that file');
        return;
      }
      const found = (res?.data?.travellers || []) as Array<Record<string, unknown>>;
      if (!found.length) {
        toast.error('No passports could be read from that file');
        return;
      }
      setRows(
        found.map((t) => ({
          firstName: str(t.firstName),
          lastName: str(t.lastName),
          passportNumber: str(t.passportNumber),
          dateOfBirth: str(t.dateOfBirth),
          expiryDate: str(t.expiryDate),
          nationality: str(t.nationality),
          gender: str(t.gender),
          phone: '',
          confidence: typeof t.confidence === 'number' ? t.confidence : undefined,
        }))
      );
      toast.success(`Read ${found.length} passport${found.length === 1 ? '' : 's'} — check them before creating`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Could not read that file'),
  });

  const create = useMutation({
    mutationFn: () =>
      travelFilesApi
        .bulkCreate({
          travellers: rows,
          shared: {
            ...shared,
            totalCost: shared.totalCost ? Number(shared.totalCost) : 0,
          },
        })
        .then((r) => r.data.data),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ['travel-files'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      if (data.failedCount) {
        toast.warning(`${data.createdCount} created, ${data.failedCount} could not be`);
      } else {
        toast.success(`${data.createdCount} travel file(s) created`);
      }
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Could not create the files'),
  });

  function updateRow(i: number, patch: Partial<TravellerRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const incomplete = rows.filter((r) => !r.firstName.trim() || !r.lastName.trim() || !r.passportNumber.trim());
  const canCreate = rows.length > 0 && !incomplete.length && !!shared.destination.trim();

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Create travel files from passports"
      size="xl"
    >
      <div className="space-y-5 p-5">
        {/* Done */}
        {result ? (
          <div className="space-y-4">
            <Card className="border-green-200 bg-green-50 p-4">
              <p className="text-[13px] font-medium text-green-900">
                {result.createdCount} travel file{result.createdCount === 1 ? '' : 's'} created
              </p>
              <p className="mt-1 text-xs text-green-800">
                Open each one to add its flights, visa and costs.
              </p>
            </Card>

            {!!result.failed?.length && (
              <Card className="border-amber-200 bg-amber-50 p-4">
                <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-amber-900">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {result.failed.length} could not be created
                </p>
                <ul className="space-y-1">
                  {result.failed.map((f, i) => (
                    <li key={i} className="text-xs text-amber-800">
                      <span className="font-medium">{f.name}</span> — {f.reason}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Upload another</Button>
              <Button onClick={() => { reset(); onClose(); }}>Done</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Upload */}
            {!rows.length && (
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setFileName(f.name);
                    extract.mutate(f);
                  }}
                />
                <button
                  type="button"
                  disabled={extract.isPending}
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-10 text-neutral-500 transition-colors hover:border-blue-600 hover:text-blue-600 disabled:opacity-60"
                >
                  {extract.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-[13px]">Reading {fileName}…</span>
                      <span className="text-xs text-neutral-400">This can take up to a minute for a big batch</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      <span className="text-[13px] font-medium">Upload the scanned passports</span>
                      <span className="text-xs text-neutral-400">
                        One PDF with several pages, or a photo · PDF, JPG, PNG
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Review */}
            {!!rows.length && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-[13px] text-neutral-600">
                    <FileText className="h-3.5 w-3.5 text-neutral-400" />
                    {rows.length} traveller{rows.length === 1 ? '' : 's'} from {fileName}
                  </p>
                  <Button size="sm" variant="ghost" onClick={reset}>
                    <X className="h-3.5 w-3.5" /> Start over
                  </Button>
                </div>

                <Card className="border-amber-200 bg-amber-50 px-4 py-2.5">
                  <p className="text-xs text-amber-900">
                    These were read automatically. Check every passport number before creating — a wrong
                    one is hard to correct once visas are attached.
                  </p>
                </Card>

                <div className="max-h-[320px] overflow-auto rounded-lg border border-neutral-200">
                  <table className="w-full min-w-[820px] text-[13px]">
                    <thead className="sticky top-0 bg-neutral-50">
                      <tr className="border-b border-neutral-200 text-[11px] text-neutral-500">
                        <th className="px-3 py-2 text-left">First name</th>
                        <th className="px-3 py-2 text-left">Last name</th>
                        <th className="px-3 py-2 text-left">Passport no.</th>
                        <th className="px-3 py-2 text-left">Date of birth</th>
                        <th className="px-3 py-2 text-left">Expiry</th>
                        <th className="px-3 py-2 text-left">Phone</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {rows.map((r, i) => {
                        const unsure = typeof r.confidence === 'number' && r.confidence < 0.7;
                        const missing = !r.firstName.trim() || !r.lastName.trim() || !r.passportNumber.trim();
                        return (
                          <tr key={i} className={missing ? 'bg-red-50' : unsure ? 'bg-amber-50/50' : ''}>
                            <Cell value={r.firstName} onChange={(v) => updateRow(i, { firstName: v })} />
                            <Cell value={r.lastName} onChange={(v) => updateRow(i, { lastName: v })} />
                            <Cell
                              value={r.passportNumber}
                              mono
                              onChange={(v) => updateRow(i, { passportNumber: v.toUpperCase() })}
                            />
                            <Cell value={r.dateOfBirth} type="date" onChange={(v) => updateRow(i, { dateOfBirth: v })} />
                            <Cell value={r.expiryDate} type="date" onChange={(v) => updateRow(i, { expiryDate: v })} />
                            <Cell value={r.phone} onChange={(v) => updateRow(i, { phone: v })} />
                            <td className="px-2">
                              <button
                                onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                                className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                                title="Remove this traveller"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setRows((rs) => [
                      ...rs,
                      { firstName: '', lastName: '', passportNumber: '', dateOfBirth: '', expiryDate: '', nationality: '', gender: '', phone: '' },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Add a traveller by hand
                </Button>

                {/* Shared trip details */}
                <div>
                  <p className="mb-2 text-[13px] font-medium text-neutral-800">
                    Applies to every file
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <Label>Travel type *</Label>
                      <Select
                        value={shared.travelType}
                        onChange={(e) => setShared((s) => ({ ...s, travelType: e.target.value }))}
                      >
                        {TRAVEL_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </Select>
                    </div>
                    <div>
                      <Label>Destination *</Label>
                      <Input
                        value={shared.destination}
                        onChange={(e) => setShared((s) => ({ ...s, destination: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Departure group</Label>
                      <Input
                        placeholder="e.g. Gwale LGA — Batch 2"
                        value={shared.departureGroup}
                        onChange={(e) => setShared((s) => ({ ...s, departureGroup: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Departure date</Label>
                      <Input
                        type="date"
                        value={shared.departureDate}
                        onChange={(e) => setShared((s) => ({ ...s, departureDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Return date</Label>
                      <Input
                        type="date"
                        value={shared.returnDate}
                        onChange={(e) => setShared((s) => ({ ...s, returnDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Cost per traveller</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={shared.totalCost}
                        onChange={(e) => setShared((s) => ({ ...s, totalCost: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {!!incomplete.length && (
                  <p className="text-xs text-red-600">
                    {incomplete.length} row{incomplete.length === 1 ? '' : 's'} still need a name and passport number.
                  </p>
                )}

                <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
                  <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
                  <Button disabled={!canCreate} loading={create.isPending} onClick={() => create.mutate()}>
                    Create {rows.length} travel file{rows.length === 1 ? '' : 's'}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function Cell({
  value,
  onChange,
  type = 'text',
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  mono?: boolean;
}) {
  return (
    <td className="px-2 py-1.5">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] text-neutral-800 hover:border-neutral-200 focus:border-blue-500 focus:bg-white focus:outline-none ${
          mono ? 'font-mono' : ''
        }`}
      />
    </td>
  );
}

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}
