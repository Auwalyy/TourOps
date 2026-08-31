'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Globe, Search, Loader2, CheckCircle2, Clock, XCircle, AlertCircle,
  ChevronDown, ChevronUp, User, MapPin, FileText, CheckSquare,
  CreditCard, FolderOpen, Phone, Mail, Calendar,
} from 'lucide-react';
import { portalApi } from '@/services/api.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  open:                { label: 'Open',                color: 'text-blue-600 bg-blue-50 border-blue-200',     icon: Clock },
  pending_payment:     { label: 'Pending Payment',     color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: AlertCircle },
  awaiting_documents:  { label: 'Awaiting Documents',  color: 'text-orange-700 bg-orange-50 border-orange-200', icon: AlertCircle },
  visa_processing:     { label: 'Visa Processing',     color: 'text-purple-700 bg-purple-50 border-purple-200', icon: Clock },
  ready_for_departure: { label: 'Ready for Departure', color: 'text-green-700 bg-green-50 border-green-200',   icon: CheckCircle2 },
  completed:           { label: 'Completed',           color: 'text-gray-700 bg-gray-100 border-gray-200',     icon: CheckCircle2 },
  cancelled:           { label: 'Cancelled',           color: 'text-red-700 bg-red-50 border-red-200',         icon: XCircle },
};

const TRAVEL_LABELS: Record<string, string> = {
  umrah: 'Umrah', hajj: 'Hajj', study_abroad: 'Study Abroad',
  tourist_visa: 'Tourist Visa', business: 'Business', medical: 'Medical',
};

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-5 py-3.5 bg-gray-50 dark:bg-gray-800/50">
        <Icon className="h-4 w-4 text-blue-600" />
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm border-b border-gray-50 dark:border-gray-800 last:border-0">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="font-medium text-gray-800 dark:text-gray-200 text-right">{value}</span>
    </div>
  );
}

function TrackFilePageContent() {
  const searchParams = useSearchParams();
  const [fileNumber, setFileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<any>(null);
  const [showTimeline, setShowTimeline] = useState(false);

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

  function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    if (fileNumber.trim()) doTrack(fileNumber.trim());
  }

  const status = file ? (STATUS_CONFIG[file.status] ?? { label: file.status, color: 'text-gray-600 bg-gray-100 border-gray-200', icon: Clock }) : null;
  const customer = file?.customerId as any;
  const consultant = file?.assignedConsultant as any;
  const officer = file?.assignedVisaOfficer as any;
  const pkg = file?.packageId as any;
  const balance = file ? (file.totalCost || 0) - (file.amountPaid || 0) : 0;
  const doneTasks = file?.tasks?.filter((t: any) => t.status === 'done').length ?? 0;
  const totalTasks = file?.tasks?.length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 sticky top-0 z-10">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Globe className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-gray-100">TourOps — File Tracker</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 space-y-5">

        {/* Search */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 mb-3">Enter your travel file number to see full details.</p>
          <form onSubmit={handleTrack} className="flex gap-2">
            <Input
              placeholder="e.g. TF-202608-70956"
              value={fileNumber}
              onChange={(e) => setFileNumber(e.target.value.toUpperCase())}
              className="flex-1 font-mono"
            />
            <Button type="submit" disabled={loading}>
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
            {/* Status Banner */}
            <div className={`rounded-xl border p-5 ${status.color}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-60 mb-1">Travel File</p>
                  <p className="text-2xl font-bold font-mono">{file.fileNumber}</p>
                  <p className="text-sm mt-1 opacity-75 capitalize">
                    {TRAVEL_LABELS[file.travelType] ?? file.travelType} · {file.destination}
                    {file.departureGroup && ` · ${file.departureGroup}`}
                  </p>
                  <p className="text-xs mt-1 opacity-50">
                    Opened {format(new Date(file.createdAt), 'dd MMM yyyy')}
                    {pkg && ` · Package: ${pkg.title}`}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold ${status.color}`}>
                  <status.icon className="h-4 w-4" />
                  {status.label}
                </span>
              </div>

              {/* Progress bar */}
              {totalTasks > 0 && (
                <div className="mt-4 pt-4 border-t border-current/10">
                  <div className="flex justify-between text-xs mb-1 opacity-70">
                    <span>Tasks Progress</span>
                    <span>{doneTasks}/{totalTasks} done</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-current/10">
                    <div className="h-2 rounded-full bg-current/40 transition-all" style={{ width: `${(doneTasks / totalTasks) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Customer Info */}
            {customer && (
              <Section title="Customer Information" icon={User}>
                <Row label="Full Name" value={customer.fullName || `${customer.firstName} ${customer.lastName}`} />
                <Row label="Phone" value={customer.phone} />
                <Row label="Email" value={customer.email} />
                <Row label="Nationality" value={customer.nationality} />
                <Row label="Passport Number" value={customer.passport?.number} />
                <Row label="Date of Birth" value={customer.dateOfBirth ? format(new Date(customer.dateOfBirth), 'dd MMM yyyy') : null} />
              </Section>
            )}

            {/* Travel Details */}
            <Section title="Travel Details" icon={MapPin}>
              <Row label="Travel Type" value={TRAVEL_LABELS[file.travelType] ?? file.travelType} />
              <Row label="Destination" value={file.destination} />
              <Row label="Departure Group" value={file.departureGroup} />
              <Row label="Priority" value={file.priority} />
              {pkg && <Row label="Package" value={`${pkg.title}${pkg.duration ? ` · ${pkg.duration}` : ''}`} />}
              <Row label="Last Updated" value={format(new Date(file.updatedAt), 'dd MMM yyyy, HH:mm')} />
            </Section>

            {/* Assigned Staff */}
            {(consultant || officer) && (
              <Section title="Your Team" icon={Phone}>
                {consultant && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <div>
                      <p className="text-xs text-gray-400">Consultant</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{consultant.firstName} {consultant.lastName}</p>
                    </div>
                    <div className="flex gap-2">
                      {consultant.phone && (
                        <a href={`tel:${consultant.phone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <Phone className="h-3 w-3" />{consultant.phone}
                        </a>
                      )}
                      {consultant.email && (
                        <a href={`mailto:${consultant.email}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <Mail className="h-3 w-3" />{consultant.email}
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {officer && (
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-xs text-gray-400">Visa Officer</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{officer.firstName} {officer.lastName}</p>
                    </div>
                    <div className="flex gap-2">
                      {officer.phone && (
                        <a href={`tel:${officer.phone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <Phone className="h-3 w-3" />{officer.phone}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* Payment */}
            <Section title="Payment Summary" icon={CreditCard}>
              <Row label="Total Cost" value={`₦${(file.totalCost || 0).toLocaleString()}`} />
              <Row label="Amount Paid" value={`₦${(file.amountPaid || 0).toLocaleString()}`} />
              <div className={`flex justify-between py-2 text-sm font-bold border-t border-gray-100 dark:border-gray-800 mt-1 ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                <span>Balance Remaining</span>
                <span>₦{balance.toLocaleString()}</span>
              </div>
              {file.payments?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Payment History</p>
                  {file.payments.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        {format(new Date(p.paidAt), 'dd MMM yyyy')} · <span className="capitalize">{p.method?.replace(/_/g, ' ')}</span>
                        {p.reference && ` · Ref: ${p.reference}`}
                        {p.note && ` · ${p.note}`}
                      </span>
                      <span className="font-semibold text-green-600">+₦{p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Tasks */}
            {file.tasks?.length > 0 && (
              <Section title={`Tasks (${doneTasks}/${totalTasks} complete)`} icon={CheckSquare}>
                <ul className="space-y-2">
                  {file.tasks.map((t: any, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${t.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                        {t.status === 'done' && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </span>
                      <div className="flex-1">
                        <p className={t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}>{t.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">
                          {t.priority} priority
                          {t.dueDate && ` · Due ${format(new Date(t.dueDate), 'dd MMM yyyy')}`}
                          {t.status !== 'done' && ` · ${t.status.replace(/_/g, ' ')}`}
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
                    <li key={i} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{doc.name || doc.originalName}</p>
                        <p className="text-xs text-gray-400 capitalize">
                          {doc.category}
                          {doc.expiryDate && ` · Expires ${format(new Date(doc.expiryDate), 'dd MMM yyyy')}`}
                        </p>
                      </div>
                      {doc.fileUrl && (
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline shrink-0 ml-4">
                          View
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Timeline */}
            {file.timeline?.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTimeline(!showTimeline)}
                  className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800"
                >
                  <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-blue-600" /> Activity Timeline ({file.timeline.length} events)</span>
                  {showTimeline ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showTimeline && (
                  <div className="p-5">
                    <ol className="relative border-l-2 border-gray-100 dark:border-gray-800 ml-2 space-y-5">
                      {[...file.timeline].reverse().map((t: any, i: number) => (
                        <li key={i} className="ml-5">
                          <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 ring-2 ring-white dark:ring-gray-900">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                          </span>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t.action}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{format(new Date(t.performedAt), 'dd MMM yyyy, HH:mm')}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-gray-400">
        Powered by TourOps
      </footer>
    </div>
  );
}

export default function TrackFilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 p-6 text-sm text-gray-500 dark:bg-gray-950">Loading tracker...</div>}>
      <TrackFilePageContent />
    </Suspense>
  );
}
