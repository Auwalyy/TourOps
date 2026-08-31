'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, CheckSquare, StickyNote, FolderOpen, Receipt, AlertCircle, Copy, Check, Upload, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { travelFilesApi, documentsApi } from '@/services/api.service';
import { TravelFile, TravelFileStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Select, Input, Label, Textarea } from '@/components/ui/Input';
import { formatDate, formatCurrency, formatRelativeTime } from '@/lib/utils';
import { TravelFileHealthBanner } from '@/components/features/travel-files/TravelFileHealthBanner';

const TRAVEL_TYPE_LABELS: Record<string, string> = {
  umrah: 'Umrah', hajj: 'Hajj', study_abroad: 'Study Abroad',
  tourist_visa: 'Tourist Visa', business: 'Business', medical: 'Medical',
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: AlertCircle },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'payments', label: 'Payments', icon: Receipt },
  { id: 'history', label: 'Status History', icon: Clock },
];

const STATUS_OPTIONS: TravelFileStatus[] = [
  'open', 'pending_payment', 'awaiting_documents', 'visa_processing', 'ready_for_departure', 'completed', 'cancelled',
];

export default function TravelFileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [newNote, setNewNote] = useState('');
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', dueDate: '' });
  const [copied, setCopied] = useState(false);
  const [docCategory, setDocCategory] = useState('other');
  const [docName, setDocName] = useState('');
  const fileUploadRef = useRef<HTMLInputElement>(null);

  function copyTrackingLink() {
    if (!file) return;
    const url = `${window.location.origin}/track?file=${file.fileNumber}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const { data: file, isLoading } = useQuery({
    queryKey: ['travel-files', id],
    queryFn: () => travelFilesApi.getById(id).then((r) => r.data.data as TravelFile),
  });

  const { data: health } = useQuery({
    queryKey: ['travel-files', id, 'health'],
    queryFn: () => travelFilesApi.getHealth(id).then((r) => r.data.data),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: TravelFileStatus) => travelFilesApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['travel-files', id] }); },
    onError: () => toast.error('Failed to update status'),
  });

  const noteMutation = useMutation({
    mutationFn: () => travelFilesApi.addNote(id, newNote),
    onSuccess: () => { toast.success('Note added'); setNewNote(''); qc.invalidateQueries({ queryKey: ['travel-files', id] }); },
    onError: () => toast.error('Failed to add note'),
  });

  const taskMutation = useMutation({
    mutationFn: () => travelFilesApi.addTask(id, newTask),
    onSuccess: () => { toast.success('Task added'); setNewTask({ title: '', priority: 'medium', dueDate: '' }); qc.invalidateQueries({ queryKey: ['travel-files', id] }); },
    onError: () => toast.error('Failed to add task'),
  });

  const taskUpdateMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      travelFilesApi.updateTask(id, taskId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['travel-files', id] }),
  });

  const docUploadMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', docName || file.name);
      fd.append('category', docCategory);
      return documentsApi.uploadForTravelFile(id, fd);
    },
    onSuccess: () => {
      toast.success('Document uploaded');
      setDocName('');
      qc.invalidateQueries({ queryKey: ['travel-files', id] });
      qc.invalidateQueries({ queryKey: ['travel-files', id, 'health'] });
    },
    onError: () => toast.error('Upload failed'),
  });

  const docDeleteMutation = useMutation({
    mutationFn: (docId: string) => documentsApi.delete(docId),
    onSuccess: () => {
      toast.success('Document removed');
      qc.invalidateQueries({ queryKey: ['travel-files', id] });
      qc.invalidateQueries({ queryKey: ['travel-files', id, 'health'] });
    },
    onError: () => toast.error('Failed to remove document'),
  });

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) docUploadMutation.mutate(file);
    e.target.value = '';
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!file) return <p className="text-gray-500">Travel file not found.</p>;

  const customer = file.customerId as any;
  const consultant = file.assignedConsultant as any;
  const officer = file.assignedVisaOfficer as any;
  const pkg = file.packageId as any;
  const pendingTasks = file.tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{file.fileNumber}</h1>
            <button
              onClick={copyTrackingLink}
              title="Copy customer tracking link"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy tracking link'}
            </button>
            <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-sm font-medium text-indigo-700">
              {TRAVEL_TYPE_LABELS[file.travelType]} Travel File
            </span>
            <StatusBadge status={file.status} />
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
              file.priority === 'urgent' ? 'bg-red-100 text-red-700' :
              file.priority === 'high' ? 'bg-orange-100 text-orange-700' :
              'bg-gray-100 text-gray-600'
            }`}>{file.priority}</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {customer?.fullName || `${customer?.firstName} ${customer?.lastName}`} · {file.destination}
            {file.departureGroup && ` · ${file.departureGroup}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={file.status}
            onChange={(e) => statusMutation.mutate(e.target.value as TravelFileStatus)}
            className="w-48"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tabId
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {tabId === 'tasks' && pendingTasks > 0 && (
                <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-700">
                  {pendingTasks}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Health Banner */}
      {health && (
        <TravelFileHealthBanner health={health.health} nextAction={health.nextAction} />
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Customer Info */}
            <Card>
              <CardHeader><CardTitle>Customer Information</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <Detail label="Full Name" value={customer?.fullName || `${customer?.firstName} ${customer?.lastName}`} />
                <Detail label="Phone" value={customer?.phone || '—'} />
                <Detail label="Email" value={customer?.email || '—'} />
                <Detail label="Nationality" value={customer?.nationality || '—'} />
                <Detail label="Passport #" value={customer?.passport?.number || '—'} />
                <Detail label="Passport Expiry" value={customer?.passport?.expiryDate ? formatDate(customer.passport.expiryDate) : '—'} />
                {customer?.emergencyContact?.name && (
                  <>
                    <Detail label="Emergency Contact" value={customer.emergencyContact.name} />
                    <Detail label="Emergency Phone" value={customer.emergencyContact.phone || '—'} />
                  </>
                )}
              </CardContent>
            </Card>

            {/* File Details */}
            <Card>
              <CardHeader><CardTitle>File Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <Detail label="File Number" value={file.fileNumber} />
                <Detail label="Travel Type" value={TRAVEL_TYPE_LABELS[file.travelType]} />
                <Detail label="Destination" value={file.destination} />
                <Detail label="Departure Group" value={file.departureGroup || '—'} />
                <Detail label="Package" value={pkg?.title || '—'} />
                <Detail label="Created" value={formatDate(file.createdAt)} />
                <Detail label="Last Updated" value={formatDate(file.updatedAt)} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Assigned Staff */}
            <Card>
              <CardHeader><CardTitle>Assigned Staff</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Detail label="Consultant" value={consultant ? `${consultant.firstName} ${consultant.lastName}` : 'Unassigned'} />
                <Detail label="Visa Officer" value={officer ? `${officer.firstName} ${officer.lastName}` : 'Unassigned'} />
              </CardContent>
            </Card>

            {/* Progress */}
            <Card>
              <CardHeader><CardTitle>Progress</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {health ? (
                  [
                    { label: 'Overall', pct: health.progress.overall },
                    { label: 'Payments', pct: health.progress.payment },
                    { label: 'Documents', pct: health.progress.documents },
                    { label: 'Tasks', pct: health.progress.tasks },
                  ].map(({ label, pct }) => (
                    <div key={label}>
                      <div className="mb-1 flex justify-between text-xs text-gray-500">
                        <span>{label}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-blue-500' : 'bg-orange-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <Skeleton className="h-24 w-full" />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <Card>
          <CardHeader><CardTitle>Workflow Timeline</CardTitle></CardHeader>
          <CardContent>
            {file.timeline.length === 0 ? (
              <p className="text-sm text-gray-400">No timeline entries yet.</p>
            ) : (
              <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-6">
                {[...file.timeline].reverse().map((entry) => {
                  const user = entry.performedBy as any;
                  return (
                    <li key={entry._id} className="ml-6">
                      <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white dark:ring-gray-900">
                        <Clock className="h-3 w-3 text-blue-600" />
                      </span>
                      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{entry.action}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{entry.description}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {user?.firstName} {user?.lastName} · {formatRelativeTime(entry.performedAt)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Add Task</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <Label>Task Title</Label>
                  <Input
                    placeholder="e.g. Collect passport"
                    value={newTask.title}
                    onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={newTask.priority} onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Select>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask((p) => ({ ...p, dueDate: e.target.value }))} />
                </div>
              </div>
              <Button className="mt-3" disabled={!newTask.title} loading={taskMutation.isPending} onClick={() => taskMutation.mutate()}>
                Add Task
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tasks ({file.tasks.length})</CardTitle></CardHeader>
            <CardContent>
              {file.tasks.length === 0 ? (
                <p className="text-sm text-gray-400">No tasks yet.</p>
              ) : (
                <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                  {file.tasks.map((task) => (
                    <li key={task._id} className="flex items-center gap-4 py-3">
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={() => taskUpdateMutation.mutate({ taskId: task._id, status: task.status === 'completed' ? 'todo' : 'completed' })}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                          {task.title}
                        </p>
                        {task.dueDate && <p className="text-xs text-gray-400">Due {formatDate(task.dueDate)}</p>}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        task.priority === 'high' ? 'bg-red-100 text-red-700' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{task.priority}</span>
                      <StatusBadge status={task.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Add Internal Note</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Write a staff-only note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
              <Button disabled={!newNote.trim()} loading={noteMutation.isPending} onClick={() => noteMutation.mutate()}>
                Add Note
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notes ({file.notes.length})</CardTitle></CardHeader>
            <CardContent>
              {file.notes.length === 0 ? (
                <p className="text-sm text-gray-400">No notes yet.</p>
              ) : (
                <ul className="space-y-3">
                  {[...file.notes].reverse().map((note) => {
                    const author = note.createdBy as any;
                    return (
                      <li key={note._id} className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{note.content}</p>
                        <p className="mt-2 text-xs text-gray-400">
                          {author?.firstName} {author?.lastName} · {formatRelativeTime(note.createdAt)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-4">
          {/* Upload panel */}
          <Card>
            <CardHeader><CardTitle>Upload Document</CardTitle></CardHeader>
            <CardContent>
              <input ref={fileUploadRef} type="file" className="hidden" onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label>Document Name</Label>
                  <Input placeholder="e.g. Umrah Visa" value={docName}
                    onChange={(e) => setDocName(e.target.value)} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={docCategory} onChange={(e) => setDocCategory(e.target.value)}>
                    <option value="visa">Visa</option>
                    <option value="ticket">Ticket / Itinerary</option>
                    <option value="passport">Passport</option>
                    <option value="hotel">Hotel</option>
                    <option value="insurance">Insurance</option>
                    <option value="financial">Financial</option>
                    <option value="photo">Photo</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full"
                    loading={docUploadMutation.isPending}
                    onClick={() => fileUploadRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" /> Choose File
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document list */}
          <Card>
            <CardHeader><CardTitle>Documents ({file.documentIds.length})</CardTitle></CardHeader>
            <CardContent>
              {file.documentIds.length === 0 ? (
                <p className="text-sm text-gray-400">No documents uploaded yet. Use the form above to upload a visa, ticket, itinerary, or any other document.</p>
              ) : (
                <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                  {(file.documentIds as any[]).map((doc) => (
                    <li key={doc._id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {doc.name || doc.originalName}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {doc.category} · {doc.fileType?.split('/')[1] || doc.fileType}
                          {doc.expiryDate && ` · Expires ${formatDate(doc.expiryDate)}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors dark:border-gray-700 dark:text-gray-300"
                        >
                          <Download className="h-3.5 w-3.5" /> View
                        </a>
                        <button
                          onClick={() => docDeleteMutation.mutate(doc._id)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Remove document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'payments' && (
        <Card>
          <CardHeader><CardTitle>Payment Ledger ({file.invoiceIds.length} invoices)</CardTitle></CardHeader>
          <CardContent>
            {file.invoiceIds.length === 0 ? (
              <p className="text-sm text-gray-400">No invoices linked. Create invoices in the Invoices module and link them here.</p>
            ) : (
              <>
                <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                  {(file.invoiceIds as any[]).map((inv) => (
                    <li key={inv._id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-mono text-sm font-semibold text-blue-600">{inv.invoiceNumber}</p>
                        <p className="text-xs text-gray-500">Issued {inv.issuedAt ? formatDate(inv.issuedAt) : '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatCurrency(inv.totalAmount)}</p>
                        <p className={`text-xs font-medium ${inv.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {inv.outstandingBalance > 0 ? `${formatCurrency(inv.outstandingBalance)} outstanding` : 'Fully paid'}
                        </p>
                      </div>
                      <StatusBadge status={inv.status} />
                    </li>
                  ))}
                </ul>
                <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Invoiced</span>
                    <span className="font-semibold">{formatCurrency((file.invoiceIds as any[]).reduce((s, i) => s + (i.totalAmount || 0), 0))}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">Total Paid</span>
                    <span className="font-semibold text-green-600">{formatCurrency((file.invoiceIds as any[]).reduce((s, i) => s + (i.amountPaid || 0), 0))}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1 border-t border-gray-200 pt-2 dark:border-gray-700">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Outstanding</span>
                    <span className="font-bold text-red-600">{formatCurrency((file.invoiceIds as any[]).reduce((s, i) => s + (i.outstandingBalance || 0), 0))}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
      {activeTab === 'history' && (
        <Card>
          <CardHeader><CardTitle>Status History</CardTitle></CardHeader>
          <CardContent>
            {file.statusHistory.length === 0 ? (
              <p className="text-sm text-gray-400">No status changes recorded yet.</p>
            ) : (
              <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-5">
                {[...file.statusHistory].reverse().map((entry) => {
                  const user = entry.changedBy as any;
                  return (
                    <li key={entry._id} className="ml-6">
                      <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 ring-4 ring-white dark:ring-gray-900">
                        <Clock className="h-3 w-3 text-indigo-600" />
                      </span>
                      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={entry.previousStatus} />
                          <span className="text-xs text-gray-400">→</span>
                          <StatusBadge status={entry.newStatus} />
                        </div>
                        {entry.reason && <p className="text-xs text-gray-500 mt-1">{entry.reason}</p>}
                        <p className="mt-1 text-xs text-gray-400">
                          {user?.firstName} {user?.lastName} · {formatRelativeTime(entry.changedAt)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      )}
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
