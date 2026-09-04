'use client';
import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Globe, Search, Loader2, CheckCircle2, Clock, XCircle, AlertCircle,
  ChevronDown, ChevronUp, User, MapPin, FileText, CheckSquare,
  CreditCard, FolderOpen, Phone, Mail, Calendar, Upload, Send, MessageSquare,
} from 'lucide-react';
import { portalApi } from '@/services/api.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useBrandingStore } from '@/stores/branding.store';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: typeof CheckCircle2 }> = {
  open:                { label: 'Open',                bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200',   icon: Clock },
  pending_payment:     { label: 'Pending Payment',     bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200', icon: AlertCircle },
  awaiting_documents:  { label: 'Awaiting Documents',  bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200', icon: AlertCircle },
  visa_processing:     { label: 'Visa Processing',     bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-200', icon: Clock },
  ready_for_departure: { label: 'Ready for Departure', bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200',  icon: CheckCircle2 },
  completed:           { label: 'Completed',           bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-200',   icon: CheckCircle2 },
  cancelled:           { label: 'Cancelled',           bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200',    icon: XCircle },
};

const TRAVEL_LABELS: Record<string, string> = {
  umrah: 'Umrah', hajj: 'Hajj', study_abroad: 'Study Abroad',
  tourist_visa: 'Tourist Visa', business: 'Business', medical: 'Medical',
};

const STEPS = [
  { key: 'open', label: 'File Opened' },
  { key: 'awaiting_documents', label: 'Documents' },
  { key: 'pending_payment', label: 'Payment' },
  { key: 'visa_processing', label: 'Processing' },
  { key: 'ready_for_departure', label: 'Ready' },
  { key: 'completed', label: 'Completed' },
];

function ProgressStepper({ status }: { status: string }) {
  const currentIdx = STEPS.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-400'}`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <p className={`mt-1 text-[10px] font-medium text-center leading-tight ${active ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'}`}>{step.label}</p>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mb-4 h-0.5 flex-1 transition-all ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, icon: Icon, children, defaultOpen = true }: { title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
            <Icon className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-sm font-semibold text-gray-800">{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="border-t border-gray-100 px-5 py-4">{children}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-2 text-sm border-b border-gray-50 last:border-0">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="font-medium text-gray-800 text-right">{value}</span>
    </div>
  );
}

function TrackFilePageContent() {
  const searchParams = useSearchParams();
  const { branding } = useBrandingStore();
  const [fileNumber, setFileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<any>(null);

  // Receipt upload state
  const receiptRef = useRef<HTMLInputElement>(null);
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptNote, setReceiptNote] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Customer note state
  const [noteContent, setNoteContent] = useState('');
  const [sendingNote, setSendingNote] = useState(false);

  const primaryColor = branding.primaryColor || '#2563eb';
  const companyName = branding.companyName || branding.agencyName || 'Travel Portal';
  const logoUrl = branding.logoUrl;

  useEffect(() => {
    const fn = searchParams.get('file');
    if (fn) { setFileNumber(fn.toUpperCase()); doTrack(fn.toUpperCase()); }
  }, []);

  async function doTrack(fn: string) {
    setLoading(true); setError(''); setFile(null);
    try {
      const res = await portalApi.trackFile(fn.trim());
      setFile(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'File not found. Please check the number and try again.');
    } finally { setLoading(false); }
  }

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !file) return;
    setUploadingReceipt(true);
    try {
      const fd = new FormData();
      fd.append('receipt', f);
      if (receiptAmount) fd.append('amount', receiptAmount);
      if (receiptNote) fd.append('note', receiptNote);
      await portalApi.uploadReceipt(file.fileNumber, fd);
      toast.success('Payment receipt uploaded successfully! Your consultant will confirm shortly.');
      setReceiptAmount(''); setReceiptNote('');
      doTrack(file.fileNumber);
    } catch { toast.error('Upload failed. Please try again.'); }
    finally { setUploadingReceipt(false); e.target.value = ''; }
  }

  async function handleSendNote() {
    if (!noteContent.trim() || !file) return;
    setSendingNote(true);
    try {
      await portalApi.sendNote(file.fileNumber, noteContent.trim());
      toast.success('Message sent to your consultant!');
      setNoteContent('');
      doTrack(file.fileNumber);
    } catch { toast.error('Failed to send message. Please try again.'); }
    finally { setSendingNote(false); }
  }

  const status = file ? (STATUS_CONFIG[file.status] ?? { label: file.status, bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: Clock }) : null;
  const customer = file?.customerId as any;
  const consultant = file?.assignedConsultant as any;
  const officer = file?.assignedVisaOfficer as any;
  const pkg = file?.packageId as any;
  const balance = file ? (file.totalCost || 0) - (file.amountPaid || 0) : 0;
  const doneTasks = file?.tasks?.filter((t: any) => t.status === 'completed').length ?? 0;
  const totalTasks = file?.tasks?.length ?? 0;
  const sharedNotes = file?.notes?.filter((n: any) => n.content?.startsWith('[Customer]') || n.visibility === 'shared') ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          {logoUrl ? (
            <img src={logoUrl} alt={companyName} className="h-8 w-8 rounded-lg object-contain" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: primaryColor }}>
              <Globe className="h-4 w-4 text-white" />
            </div>
          )}
          <span className="font-bold text-gray-900">{companyName}</span>
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">File Tracker</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 space-y-5">
        {/* Search */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-base font-semibold text-gray-800">Track Your Travel File</p>
          <p className="mb-4 text-sm text-gray-400">Enter your file number to view full status and details.</p>
          <form onSubmit={(e) => { e.preventDefault(); if (fileNumber.trim()) doTrack(fileNumber.trim()); }} className="flex gap-2">
            <Input
              placeholder="e.g. TF-202608-70956"
              value={fileNumber}
              onChange={(e) => setFileNumber(e.target.value.toUpperCase())}
              className="flex-1 font-mono text-sm"
            />
            <Button type="submit" disabled={loading} style={{ backgroundColor: primaryColor, borderColor: primaryColor }}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-1.5">Track</span>
            </Button>
          </form>
          {error && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-red-600">
              <XCircle className="h-4 w-4 shrink-0" /> {error}
            </p>
          )}
        </div>

        {file && status && (
          <>
            {/* Status hero card */}
            <div className={`rounded-2xl border-2 p-6 ${status.bg} ${status.border}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-1">Travel File</p>
                  <p className="text-3xl font-extrabold font-mono tracking-tight text-gray-900">{file.fileNumber}</p>
                  <p className={`mt-1 text-sm font-medium ${status.text}`}>
                    {TRAVEL_LABELS[file.travelType] ?? file.travelType} · {file.destination}
                    {file.departureGroup && ` · ${file.departureGroup}`}
                  </p>
                  {pkg && <p className="mt-0.5 text-xs text-gray-500">Package: {pkg.title}</p>}
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${status.bg} ${status.text} ${status.border}`}>
                  <status.icon className="h-4 w-4" />
                  {status.label}
                </span>
              </div>

              {/* Progress stepper */}
              {!['cancelled', 'completed'].includes(file.status) && (
                <div className="mt-6 pt-5 border-t border-current/10">
                  <ProgressStepper status={file.status} />
                </div>
              )}

              {/* Task progress */}
              {totalTasks > 0 && (
                <div className="mt-4 pt-4 border-t border-current/10">
                  <div className="flex justify-between text-xs mb-1.5 opacity-70">
                    <span>Checklist Progress</span>
                    <span>{doneTasks}/{totalTasks} done</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-current/10">
                    <div className="h-2 rounded-full bg-current/40 transition-all" style={{ width: `${totalTasks ? (doneTasks / totalTasks) * 100 : 0}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Payment summary + receipt upload */}
            <Section title="Payment Summary" icon={CreditCard}>
              <div className="mb-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Cost', value: `₦${(file.totalCost || 0).toLocaleString()}`, color: 'text-gray-900' },
                  { label: 'Amount Paid', value: `₦${(file.amountPaid || 0).toLocaleString()}`, color: 'text-green-600' },
                  { label: 'Balance', value: `₦${balance.toLocaleString()}`, color: balance > 0 ? 'text-red-600' : 'text-green-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <p className={`text-base font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {file.payments?.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Payment History</p>
                  {file.payments.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                      <div>
                        <span className="text-gray-600">{format(new Date(p.paidAt), 'dd MMM yyyy')}</span>
                        <span className="mx-1.5 text-gray-300">·</span>
                        <span className="capitalize text-gray-500">{p.method?.replace(/_/g, ' ')}</span>
                        {p.note && <span className="ml-1.5 text-xs text-gray-400">— {p.note}</span>}
                      </div>
                      <span className="font-bold text-green-600">+₦{p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Receipt upload */}
              {balance > 0 && (
                <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-blue-800">Upload Payment Receipt</p>
                  <p className="mb-3 text-xs text-blue-600">Made a payment? Upload your receipt and we'll confirm it.</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Amount Paid (₦)</label>
                      <input
                        type="number"
                        placeholder="e.g. 50000"
                        value={receiptAmount}
                        onChange={(e) => setReceiptAmount(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Note (optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Bank transfer"
                        value={receiptNote}
                        onChange={(e) => setReceiptNote(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <input ref={receiptRef} type="file" className="hidden" accept="image/*,.pdf" onChange={handleReceiptUpload} />
                  <button
                    onClick={() => receiptRef.current?.click()}
                    disabled={uploadingReceipt}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                  >
                    {uploadingReceipt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploadingReceipt ? 'Uploading...' : 'Choose Receipt File'}
                  </button>
                </div>
              )}
            </Section>

            {/* Customer info */}
            {customer && (
              <Section title="Your Information" icon={User}>
                <Row label="Full Name" value={customer.fullName || `${customer.firstName} ${customer.lastName}`} />
                <Row label="Phone" value={customer.phone} />
                <Row label="Email" value={customer.email} />
                <Row label="Nationality" value={customer.nationality} />
                <Row label="Passport Number" value={customer.passport?.number} />
              </Section>
            )}

            {/* Travel details */}
            <Section title="Travel Details" icon={MapPin}>
              <Row label="Travel Type" value={TRAVEL_LABELS[file.travelType] ?? file.travelType} />
              <Row label="Destination" value={file.destination} />
              <Row label="Departure Group" value={file.departureGroup} />
              {file.departureDate && <Row label="Departure Date" value={format(new Date(file.departureDate), 'dd MMM yyyy')} />}
              {pkg && <Row label="Package" value={pkg.title} />}
              <Row label="Last Updated" value={format(new Date(file.updatedAt), 'dd MMM yyyy, HH:mm')} />
            </Section>

            {/* Your team */}
            {(consultant || officer) && (
              <Section title="Your Team" icon={Phone}>
                {consultant && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-xs text-gray-400">Consultant</p>
                      <p className="text-sm font-semibold text-gray-800">{consultant.firstName} {consultant.lastName}</p>
                    </div>
                    <div className="flex gap-2">
                      {consultant.phone && <a href={`tel:${consultant.phone}`} className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"><Phone className="h-3 w-3" />{consultant.phone}</a>}
                      {consultant.email && <a href={`mailto:${consultant.email}`} className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"><Mail className="h-3 w-3" />Email</a>}
                    </div>
                  </div>
                )}
                {officer && (
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-xs text-gray-400">Visa Officer</p>
                      <p className="text-sm font-semibold text-gray-800">{officer.firstName} {officer.lastName}</p>
                    </div>
                    {officer.phone && <a href={`tel:${officer.phone}`} className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"><Phone className="h-3 w-3" />{officer.phone}</a>}
                  </div>
                )}
              </Section>
            )}

            {/* Tasks */}
            {file.tasks?.length > 0 && (
              <Section title={`Checklist (${doneTasks}/${totalTasks} complete)`} icon={CheckSquare}>
                <ul className="space-y-2">
                  {file.tasks.map((t: any, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${t.status === 'completed' ? 'border-green-500 bg-green-500' : 'border-gray-300 bg-white'}`}>
                        {t.status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}`}>{t.title}</p>
                        <p className="text-xs text-gray-400 capitalize mt-0.5">
                          {t.priority} priority{t.dueDate && ` · Due ${format(new Date(t.dueDate), 'dd MMM yyyy')}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Documents */}
            {file.documentIds?.length > 0 && (
              <Section title={`Documents (${file.documentIds.length})`} icon={FolderOpen}>
                <ul className="space-y-2">
                  {file.documentIds.map((doc: any, i: number) => (
                    <li key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{doc.name || doc.originalName}</p>
                        <p className="text-xs text-gray-400 capitalize">{doc.category}{doc.expiryDate && ` · Expires ${format(new Date(doc.expiryDate), 'dd MMM yyyy')}`}</p>
                      </div>
                      {doc.fileUrl && (
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors">View</a>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Messages / Notes */}
            <Section title="Messages" icon={MessageSquare}>
              {sharedNotes.length > 0 && (
                <div className="mb-4 space-y-2">
                  {sharedNotes.map((note: any, i: number) => {
                    const isCustomer = note.content?.startsWith('[Customer]');
                    return (
                      <div key={i} className={`rounded-xl px-4 py-3 text-sm ${isCustomer ? 'ml-8 bg-blue-50 text-blue-900' : 'mr-8 bg-gray-100 text-gray-800'}`}>
                        <p className="font-medium text-xs mb-1 opacity-60">{isCustomer ? 'You' : 'Your Consultant'}</p>
                        <p>{note.content.replace('[Customer] ', '')}</p>
                        <p className="mt-1 text-xs opacity-40">{format(new Date(note.createdAt), 'dd MMM, HH:mm')}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Send a message to your consultant..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendNote(); } }}
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-blue-400 focus:bg-white focus:outline-none transition-colors"
                />
                <button
                  onClick={handleSendNote}
                  disabled={!noteContent.trim() || sendingNote}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {sendingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </Section>

            {/* Timeline */}
            {file.timeline?.length > 0 && (
              <Section title={`Activity Timeline (${file.timeline.length})`} icon={Calendar} defaultOpen={false}>
                <ol className="relative border-l-2 border-gray-100 ml-2 space-y-5">
                  {[...file.timeline].reverse().map((t: any, i: number) => (
                    <li key={i} className="ml-5">
                      <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 ring-2 ring-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                      </span>
                      <p className="text-sm font-semibold text-gray-800">{t.action}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{format(new Date(t.performedAt), 'dd MMM yyyy, HH:mm')}</p>
                    </li>
                  ))}
                </ol>
              </Section>
            )}
          </>
        )}
      </main>

      <footer className="py-8 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} {companyName}. All rights reserved.
      </footer>
    </div>
  );
}

export default function TrackFilePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}>
      <TrackFilePageContent />
    </Suspense>
  );
}
