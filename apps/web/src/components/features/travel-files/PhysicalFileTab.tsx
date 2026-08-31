'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { travelFilesApi } from '@/services/api.service';
import { PhysicalFile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';

interface Props {
  fileId: string;
  physicalFile: PhysicalFile;
}

export function PhysicalFileTab({ fileId, physicalFile }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    physicalFileNumber: physicalFile.physicalFileNumber || '',
    cabinetLocation: physicalFile.cabinetLocation || '',
    shelfLocation: physicalFile.shelfLocation || '',
    status: physicalFile.status || 'at_branch',
    originalPassportReceived: physicalFile.originalPassportReceived,
    notes: physicalFile.notes || '',
  });

  const mutation = useMutation({
    mutationFn: () => travelFilesApi.updatePhysicalFile(fileId, form),
    onSuccess: () => {
      toast.success('Physical file updated');
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['travel-files', fileId] });
    },
    onError: () => toast.error('Failed to update'),
  });

  const STATUS_LABELS: Record<string, string> = {
    at_branch: 'At Branch',
    with_visa_officer: 'With Visa Officer',
    sent_for_processing: 'Sent for Processing',
    with_embassy: 'With Embassy',
    returned: 'Returned',
    archived: 'Archived',
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Physical File Tracking</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel' : 'Edit'}
          </Button>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Physical File Number</Label>
                <Input value={form.physicalFileNumber} onChange={(e) => setForm((p) => ({ ...p, physicalFileNumber: e.target.value }))} placeholder="e.g. PHY-2026-001" />
              </div>
              <div>
                <Label>Cabinet Location</Label>
                <Input value={form.cabinetLocation} onChange={(e) => setForm((p) => ({ ...p, cabinetLocation: e.target.value }))} placeholder="e.g. Cabinet A" />
              </div>
              <div>
                <Label>Shelf Location</Label>
                <Input value={form.shelfLocation} onChange={(e) => setForm((p) => ({ ...p, shelfLocation: e.target.value }))} placeholder="e.g. Shelf 3" />
              </div>
              <div>
                <Label>File Status</Label>
                <Select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as any }))}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="passportReceived"
                  checked={form.originalPassportReceived}
                  onChange={(e) => setForm((p) => ({ ...p, originalPassportReceived: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <Label htmlFor="passportReceived">Original Passport Received</Label>
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any notes about the physical file..." />
              </div>
              <div className="col-span-2">
                <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>Save Changes</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Detail label="Physical File #" value={physicalFile.physicalFileNumber || '—'} />
              <Detail label="Cabinet" value={physicalFile.cabinetLocation || '—'} />
              <Detail label="Shelf" value={physicalFile.shelfLocation || '—'} />
              <Detail label="File Status" value={STATUS_LABELS[physicalFile.status] || physicalFile.status} />
              <Detail label="Original Passport" value={physicalFile.originalPassportReceived ? 'Received' : 'Not yet received'} />
              {physicalFile.passportReceivedDate && (
                <Detail label="Passport Received" value={formatDate(physicalFile.passportReceivedDate)} />
              )}
              {physicalFile.passportReturnedDate && (
                <Detail label="Passport Returned" value={formatDate(physicalFile.passportReturnedDate)} />
              )}
              {physicalFile.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Notes</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{physicalFile.notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}
