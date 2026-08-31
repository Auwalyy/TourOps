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
  ClipboardList,
  Zap,
  Globe,
} from 'lucide-react';

const features = [
  {
    icon: Map,
    title: 'Tour & Package Management',
    desc: 'Build itineraries, manage availability, and showcase packages with a rich gallery builder.',
    color: 'bg-blue-100 text-blue-600 group-hover:bg-blue-200',
  },
  {
    icon: FileCheck2,
    title: 'Visa Workflow',
    desc: 'Track applications through a visual pipeline with officer assignment and appointment scheduling.',
    color: 'bg-violet-100 text-violet-600 group-hover:bg-violet-200',
  },
  {
    icon: CreditCard,
    title: 'Payments & Invoices',
    desc: 'Handle partial payments, auto-generate PDF invoices, and monitor outstanding balances.',
    color: 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200',
  },
  {
    icon: Bot,
    title: 'AI-Powered Tools',
    desc: 'Validate documents with OCR, get revenue insights, and receive smart travel recommendations.',
    color: 'bg-orange-100 text-orange-600 group-hover:bg-orange-200',
  },
  {
    icon: BarChart3,
    title: 'Financial Reports',
    desc: 'Export revenue reports as CSV or PDF and visualise KPIs on a real-time dashboard.',
    color: 'bg-pink-100 text-pink-600 group-hover:bg-pink-200',
  },
  {
    icon: Users,
    title: 'Customer CRM',
    desc: 'Manage profiles, passports, tags, and let customers self-serve through a dedicated portal.',
    color: 'bg-cyan-100 text-cyan-600 group-hover:bg-cyan-200',
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
    icon: ClipboardList,
    step: '01',
    title: 'Onboard your team',
    desc: 'Create your agency account, invite staff, and assign roles in minutes.',
  },
  {
    icon: Zap,
    step: '02',
    title: 'Set up your operations',
    desc: 'Add tour packages, configure visa workflows, and import your customer base.',
  },
  {
    icon: Globe,
    step: '03',
    title: 'Run everything from one place',
    desc: 'Track bookings, collect payments, validate documents, and generate reports — all in TourOps.',
  },
];

const stats = [
  { value: '14', label: 'Integrated Modules' },
  { value: '7', label: 'Role-Based Access Levels' },
  { value: '100%', label: 'Cloud-Native & Scalable' },
  { value: '24/7', label: 'Customer Portal Access' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✈️</span>
            <span className="text-xl font-bold tracking-tight text-blue-600">TourOps</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#how" className="hover:text-blue-600 transition-colors">How It Works</a>
            <a href="#roles" className="hover:text-blue-600 transition-colors">Who It's For</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-colors">
              Log in
            </Link>
            <Link href="/register" className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 pb-0 pt-28 text-center">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-100 opacity-50 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-indigo-100 opacity-30 blur-2xl" />
        <div className="pointer-events-none absolute left-0 top-1/2 h-64 w-64 rounded-full bg-cyan-100 opacity-20 blur-2xl" />

        <div className="relative mx-auto max-w-3xl px-6">
          <span className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-700">
            B2B SaaS · Travel & Visa
          </span>
          <h1 className="mt-4 text-5xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-6xl">
            The Complete Operations Platform for{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
              Travel Businesses
            </span>
          </h1>
          <p className="mt-6 text-lg text-gray-500 leading-relaxed">
            Manage tours, visas, bookings, payments, and customers — all in one place.
            Built for African travel agencies, Hajj &amp; Umrah operators, and study-abroad consultants.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-md hover:bg-blue-700 transition-colors">
              Get Started — it's free <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="rounded-full border border-gray-300 px-8 py-3.5 text-base font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-colors">
              Log in to your account
            </Link>
          </div>
        </div>

        {/* Mock dashboard preview */}
        <div className="relative mx-auto mt-16 max-w-4xl px-6">
          <div className="overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl shadow-blue-100">
            {/* browser bar */}
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
              <div className="ml-4 flex-1 rounded-md bg-gray-200 px-3 py-1 text-xs text-gray-400">app.tourops.com/dashboard</div>
            </div>
            {/* mock content */}
            <div className="grid grid-cols-4 gap-4 bg-gray-50 p-6">
              {[
                { label: 'Active Bookings', val: '142', color: 'text-blue-600' },
                { label: 'Visa Applications', val: '38', color: 'text-violet-600' },
                { label: 'Revenue (Month)', val: '₦24,800', color: 'text-emerald-600' },
                { label: 'Pending Invoices', val: '11', color: 'text-orange-500' },
              ].map((k) => (
                <div key={k.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className={`text-2xl font-bold ${k.color}`}>{k.val}</div>
                  <div className="mt-1 text-xs text-gray-400">{k.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4 bg-gray-50 px-6 pb-6">
              <div className="col-span-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Revenue Overview</div>
                <div className="flex items-end gap-2 h-16">
                  {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-blue-100" style={{ height: `${h}%` }}>
                      <div className="h-full w-full rounded-sm bg-blue-500 opacity-70" style={{ height: `${h}%` }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Recent Activity</div>
                <div className="space-y-2">
                  {['New booking #1042', 'Visa approved — Ali M.', 'Invoice #88 paid'].map((a) => (
                    <div key={a} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-xs text-gray-500 truncate">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-gray-100 bg-white py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 sm:grid-cols-4">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-extrabold text-blue-600">{value}</div>
              <div className="mt-1 text-sm text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">Features</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">Everything your team needs</h2>
            <p className="mt-3 text-gray-500">14 integrated modules, zero context-switching.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="group relative rounded-2xl border border-gray-100 bg-gray-50 p-6 hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${color}`}>
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                <h3 className="mb-1 font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 bg-gray-50">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-14 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">How It Works</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">Up and running in minutes</h2>
            <p className="mt-3 text-gray-500">No lengthy setup. No training required.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="relative text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                  <Icon size={24} strokeWidth={1.75} />
                </div>
                <div className="mb-1 text-xs font-bold uppercase tracking-widest text-blue-400">{step}</div>
                <h3 className="mb-2 font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="py-24 bg-white">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-14 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">Who It's For</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">Built for every role on your team</h2>
            <p className="mt-3 text-gray-500">Role-based access keeps everyone focused on what matters.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-5 hover:border-blue-200 hover:bg-blue-50 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Icon size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{label}</div>
                  <div className="mt-0.5 text-sm text-gray-500">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 py-24 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white opacity-5 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-10 h-56 w-56 rounded-full bg-indigo-400 opacity-10 blur-2xl" />
        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Ready to streamline your operations?</h2>
          <p className="mt-4 text-blue-200">Join travel businesses already running on TourOps.</p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-blue-600 shadow hover:bg-blue-50 transition-colors">
              Create your account <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="rounded-full border border-white/40 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} TourOps · The Complete Operations Platform for Travel &amp; Visa Businesses
      </footer>
    </div>
  );
}
