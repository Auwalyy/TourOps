import Link from 'next/link';
import {
  Map,
  FileCheck2,
  CreditCard,
  Bot,
  BarChart3,
  Users,
  UserCog,
  Briefcase,
  ShieldCheck,
  BadgeDollarSign,
  HeadphonesIcon,
  ArrowRight,
} from 'lucide-react';

const features = [
  {
    icon: FileCheck2,
    title: 'Visa Workflow',
    desc: 'Track every application through a clear pipeline — documents, embassy appointments, officer assignment, and whether the fee has actually been paid.',
  },
  {
    icon: CreditCard,
    title: 'One Ledger for Every Naira',
    desc: 'Deposits, instalments and refunds all recorded in one place, with proof-of-payment review before anything counts as received.',
  },
  {
    icon: Users,
    title: 'Families & Groups',
    desc: 'One payer covering a whole family or LGA batch, split across travellers — while each person keeps their own documents and visa status.',
  },
  {
    icon: Map,
    title: 'Packages & Seat Control',
    desc: 'Hard seat limits with a sold, held and remaining breakdown, so you never collect from more pilgrims than you hold allocation for.',
  },
  {
    icon: BarChart3,
    title: 'Reports That Answer Questions',
    desc: 'Who still owes money, which instalments are overdue, what came in this month — exportable to CSV or PDF.',
  },
  {
    icon: Bot,
    title: 'Passport Scanning',
    desc: 'Photograph a passport and let it fill in the name, number and date of birth instead of typing them by hand.',
  },
];

const roles = [
  { icon: UserCog, label: 'Agency Owner', desc: 'Full platform access & analytics' },
  { icon: Briefcase, label: 'Travel Consultant', desc: 'Customers, bookings & packages' },
  { icon: ShieldCheck, label: 'Visa Officer', desc: 'Visa pipeline & documents' },
  { icon: BadgeDollarSign, label: 'Finance Officer', desc: 'Payments, invoices & reports' },
  { icon: HeadphonesIcon, label: 'Customer Support', desc: 'Read access across modules' },
];

const steps = [
  {
    step: '01',
    title: 'Set up your agency',
    desc: 'Create your account, add your branding and bank details, and invite your staff with the right roles.',
  },
  {
    step: '02',
    title: 'Add your customers and work',
    desc: 'Open travel files for trips you are managing, or book a walk-in customer a ticket or visa directly.',
  },
  {
    step: '03',
    title: 'Record the money as it comes in',
    desc: 'Log payments against each booking or file, verify the ones customers upload, and see who still owes what.',
  },
];

const stats = [
  { value: 'One ledger', label: 'Every payment in a single place' },
  { value: '7 roles', label: 'From owner to visa officer' },
  { value: 'Naira-first', label: 'Built for Nigerian agencies' },
  { value: '24/7', label: 'Customers track their own files' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">T</span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">TourOps</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#how" className="hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#roles" className="hover:text-slate-900 transition-colors">Who It&apos;s For</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
              Log in
            </Link>
            <Link href="/register" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-slate-200 bg-white pt-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
            Run your travel agency without losing track of the money
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Travel files, visas, ticketing and payments in one system — built for Hajj &amp; Umrah operators,
            visa consultants and travel agencies in Nigeria.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors sm:w-auto">
              Create your account <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors sm:w-auto">
              Log in
            </Link>
          </div>
        </div>

        {/* Mock dashboard preview */}
        <div className="mx-auto mt-16 max-w-4xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-t-xl border border-slate-200 bg-white">
            {/* browser bar */}
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <div className="ml-4 flex-1 rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-400">app.tourops.com/dashboard</div>
            </div>
            {/* mock content */}
            <div className="grid grid-cols-1 gap-4 bg-slate-50 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
              {[
                { label: 'Active Bookings', val: '142' },
                { label: 'Pending Visas', val: '38' },
                { label: 'Revenue (Month)', val: '₦24.8m' },
                { label: 'Unpaid Balances', val: '₦3.1m' },
              ].map((k) => (
                <div key={k.label} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-xl font-semibold text-slate-900">{k.val}</div>
                  <div className="mt-1 text-xs text-slate-400">{k.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 bg-slate-50 px-4 pb-4 sm:px-6 sm:pb-6 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
                <div className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Revenue Overview</div>
                <div className="flex h-16 items-end gap-2">
                  {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-blue-600/80" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Recent Activity</div>
                <div className="space-y-2">
                  {['Booking KAN-BKG-26-000142', 'Visa approved — Aisha B.', '₦450,000 payment verified'].map((a) => (
                    <div key={a} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                      <span className="truncate text-xs text-slate-500">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-slate-200 bg-white py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 sm:grid-cols-4">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-semibold text-slate-900">{value}</div>
              <div className="mt-1 text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Everything your team needs
            </h2>
            <p className="mt-3 text-slate-600">
              The whole operation in one place, so nothing lives in a notebook or a WhatsApp thread.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white p-6">
                <Icon size={20} strokeWidth={1.75} className="text-blue-600" />
                <h3 className="mt-4 font-medium text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Up and running quickly</h2>
            <p className="mt-3 text-slate-600">No lengthy setup, no training course.</p>
          </div>
          <div className="grid gap-10 sm:grid-cols-3">
            {steps.map(({ step, title, desc }) => (
              <div key={step}>
                <div className="text-sm font-semibold text-blue-600">{step}</div>
                <h3 className="mt-2 font-medium text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">A role for everyone</h2>
            <p className="mt-3 text-slate-600">
              Each person sees their own work — and only the owner can release a refund.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 rounded-xl border border-slate-200 p-5">
                <Icon size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-slate-400" />
                <div>
                  <div className="font-medium text-slate-900">{label}</div>
                  <div className="mt-0.5 text-sm text-slate-600">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200 bg-slate-900 py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Ready to get your operation in order?
          </h2>
          <p className="mt-3 text-slate-400">Create an account and set up your agency in a few minutes.</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/register" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors sm:w-auto">
              Create your account <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="inline-flex w-full items-center justify-center rounded-lg border border-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors sm:w-auto">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 text-sm text-slate-400 sm:flex-row">
          <span>© {new Date().getFullYear()} TourOps</span>
          <span>Travel, visa &amp; Hajj operations software</span>
        </div>
      </footer>
    </div>
  );
}
