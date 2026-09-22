'use client';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, FileText, X } from 'lucide-react';
import { issuedVisasApi } from '@/services/api.service';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { VisaIssuance } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-assigns the entry to a group when opened from a group page. */
  groupId?: string;
  /** Pass an existing entry to edit it instead of creating a new one. */
  entry?: VisaIssuance | null;
  onSaved?: () => void;
}

const EMPTY = {
  type: 'visa',
  travellerName: '',
  passportNumber: '',
  documentNumber: '',
  purpose: '',
  issueDate: new Date().toISOString().slice(0, 10),
  expiryDate: '',
  notes: '',
};

export function IssuanceFormModal({ open, onClose, groupId, entry, onSaved }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [file, setFile] = useState<File | null>(null);

  const isEdit = !!entry;

  useEffect(() => {
    if (!open) { setForm({ ...EMPTY }); setFile(null); return; }
    if (entry) {
      setForm({
        type: entry.type || 'visa',
        travellerName: entry.travellerName || '',
        passportNumber: entry.passportNumber || '',
        documentNumber: entry.documentNumber || '',
        purpose: entry.purpose || '',
        issueDate: entry.issueDate ? entry.issueDate.slice(0, 10) : '',
        expiryDate: entry.expiryDate ? entry.expiryDate.slice(0, 10) : '',
        notes: entry.notes || '',
      });
    }
  }, [open, entry]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, String(v)); });
      if (groupId) fd.append('groupId', groupId);
      if (file) fd.append('file', file);
      return isEdit ? issuedVisasApi.update(entry!._id, fd) : issuedVisasApi.create(fd);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Entry updated' : 'Document recorded');
      qc.invalidateQueries({ queryKey: ['issued-visas'] });
      onSaved?.();
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to save'),
  });

  const canSave = form.travellerName.trim() && form.passportNumber.trim();

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Entry' : 'Add Visa / Ticket'} size="lg">
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Type</Label>
            <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="visa">Visa</option>
              <option value="ticket">Ticket</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <Label>{form.type === 'ticket' ? 'Ticket Number' : 'Visa Number'}</Label>
            <Input
              placeholder={form.type === 'ticket' ? '157-1234567890' : '6174141815'}
              value={form.documentNumber}
              onChange={(e) => setForm((f) => ({ ...f, documentNumber: e.target.value }))}
            />
          </div>
          <div>
            <Label>Traveller Name *</Label>
            <Input
              placeholder="Ado Idris"
              value={form.travellerName}
              onChange={(e) => setForm((f) => ({ ...f, travellerName: e.target.value }))}
            />
          </div>
          <div>
            <Label>Passport Number *</Label>
            <Input
              placeholder="B04173557"
              value={form.passportNumber}
              onChange={(e) => setForm((f) => ({ ...f, passportNumber: e.target.value.toUpperCase() }))}
            />
          </div>
          <div>
            <Label>Purpose</Label>
            <Input
              placeholder="Umrah Visa"
              value={form.purpose}
              onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
            />
          </div>
          <div>
            <Label>Date of Issue</Label>
            <Input
              type="date"
              value={form.issueDate}
              onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))}
            />
          </div>
        </div>

        {/* File */}
        <div>
          <Label>Attach the {form.type === 'ticket' ? 'ticket' : 'visa'} file</Label>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file ? (
            <div className="flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
              <span className="flex min-w-0 items-center gap-2 text-[13px] text-neutral-700">
                <FileText className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span className="truncate">{file.name}</span>
              </span>
              <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 px-3 py-3 text-[13px] text-neutral-500 transition-colors hover:border-blue-600 hover:text-blue-600"
            >
              <Upload className="h-3.5 w-3.5" />
              {entry?.fileUrl ? 'Replace attached file' : 'Choose file'} · JPG, PNG or PDF
            </button>
          )}
          {entry?.fileUrl && !file && (
            <a href={entry.fileUrl} target="_blank" rel="noreferrer"
              className="mt-1 inline-block text-xs text-blue-600 hover:underline">
              View current file
            </a>
          )}
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea
            rows={2}
            placeholder="Anything worth remembering about this one"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!canSave} loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {isEdit ? 'Save Changes' : 'Add Entry'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
