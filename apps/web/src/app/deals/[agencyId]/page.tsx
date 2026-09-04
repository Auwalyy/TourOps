'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MapPin, Clock, Users, Star, Calendar, MessageCircle, ChevronDown, ChevronUp, Globe, Tag, Zap } from 'lucide-react';
import { portalApi } from '@/services/api.service';
import { format, isPast } from 'date-fns';

const CATEGORY_LABELS: Record<string, string> = {
  tour: 'Tour', hajj_umrah: 'Hajj & Umrah', study_abroad: 'Study Abroad', visa: 'Visa', custom: 'Custom',
};

const CATEGORY_COLORS: Record<string, string> = {
  tour: 'bg-blue-100 text-blue-700',
  hajj_umrah: 'bg-emerald-100 text-emerald-700',
  study_abroad: 'bg-purple-100 text-purple-700',
  visa: 'bg-orange-100 text-orange-700',
  custom: 'bg-gray-100 text-gray-700',
};

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: currency || 'NGN', maximumFractionDigits: 0 }).format(price);
}

function DealCard({ deal, agencyWhatsapp }: { deal: any; agencyWhatsapp?: string }) {
  const [expanded, setExpanded] = useState(false);
  const whatsapp = deal.whatsappNumber || agencyWhatsapp;
  const hasDiscount = deal.pricing.discountedPrice && deal.pricing.discountedPrice < deal.pricing.basePrice;
  const displayPrice = hasDiscount ? deal.pricing.discountedPrice : deal.pricing.basePrice;
  const isEvent = !!deal.eventDate;
  const eventPast = isEvent && isPast(new Date(deal.eventDate));
  const spotsLeft = deal.availability.maxCapacity
    ? deal.availability.maxCapacity - (deal.availability.currentBookings || 0)
    : null;

  function openWhatsApp() {
    const msg = encodeURIComponent(`Hi! I'm interested in your deal: *${deal.title}* (${deal.destinations.join(', ')}). Please send me more details.`);
    window.open(`https://wa.me/${whatsapp?.replace(/\D/g, '')}?text=${msg}`, '_blank');
  }

  return (
    <div className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${deal.isFeatured ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200'}`}>
      {/* Featured badge */}
      {deal.isFeatured && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-amber-900 shadow">
          <Star className="h-3 w-3 fill-amber-900" /> Featured
        </div>
      )}

      {/* Cover image */}
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600">
        {deal.coverImage ? (
          <img src={deal.coverImage} alt={deal.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Globe className="h-16 w-16 text-white/30" />
          </div>
        )}
        {/* Price overlay */}
        <div className="absolute bottom-0 right-0 m-3">
          <div className="rounded-xl bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur-sm">
            {hasDiscount && (
              <p className="text-center text-xs text-gray-400 line-through">{formatPrice(deal.pricing.basePrice, deal.pricing.currency)}</p>
            )}
            <p className="text-center text-base font-bold text-gray-900">{formatPrice(displayPrice, deal.pricing.currency)}</p>
            {deal.pricing.pricePerPerson && <p className="text-center text-[10px] text-gray-400">per person</p>}
          </div>
        </div>
        {/* Event date badge */}
        {isEvent && !eventPast && (
          <div className="absolute left-3 bottom-3 flex items-center gap-1.5 rounded-lg bg-black/70 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            <Calendar className="h-3 w-3" />
            {format(new Date(deal.eventDate), 'dd MMM yyyy')}
          </div>
        )}
        {eventPast && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-bold text-gray-700">Event Ended</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className={`mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[deal.category] || CATEGORY_COLORS.custom}`}>
              {CATEGORY_LABELS[deal.category] || deal.category}
            </span>
            <h3 className="text-base font-bold text-gray-900 leading-snug">{deal.title}</h3>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-blue-400" />{deal.destinations.join(', ')}</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-blue-400" />{deal.duration.days}D / {deal.duration.nights}N</span>
          {spotsLeft !== null && (
            <span className={`flex items-center gap-1 font-medium ${spotsLeft <= 5 ? 'text-red-500' : 'text-gray-500'}`}>
              <Users className="h-3.5 w-3.5" />{spotsLeft <= 0 ? 'Fully booked' : `${spotsLeft} spots left`}
            </span>
          )}
        </div>

        <p className={`text-sm text-gray-500 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>{deal.description}</p>

        {deal.description?.length > 100 && (
          <button onClick={() => setExpanded(!expanded)} className="mt-1 flex items-center gap-0.5 text-xs font-medium text-blue-600 hover:underline">
            {expanded ? <><ChevronUp className="h-3 w-3" />Less</> : <><ChevronDown className="h-3 w-3" />More</>}
          </button>
        )}

        {deal.tags?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {deal.tags.map((tag: string) => (
              <span key={tag} className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                <Tag className="h-2.5 w-2.5" />{tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4">
          {whatsapp ? (
            <button
              onClick={openWhatsApp}
              disabled={eventPast || spotsLeft === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1ebe5d] hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageCircle className="h-4 w-4" />
              {spotsLeft === 0 ? 'Fully Booked' : 'Enquire on WhatsApp'}
            </button>
          ) : (
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-center text-xs text-gray-400">Contact agency for details</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DealsPage() {
  const { agencyId } = useParams<{ agencyId: string }>();
  const [data, setData] = useState<{ agency: any; deals: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    portalApi.getDeals(agencyId)
      .then((r) => setData(r.data.data))
      .catch(() => setError('Could not load deals. Please try again.'))
      .finally(() => setLoading(false));
  }, [agencyId]);

  const agency = data?.agency;
  const branding = agency?.branding;
  const primaryColor = branding?.primaryColor || '#2563eb';
  const companyName = branding?.companyName || agency?.name || 'Travel Deals';
  const logoUrl = branding?.logoUrl || agency?.logo;
  const whatsapp = branding?.whatsappNumber;

  const categories = ['all', ...Array.from(new Set((data?.deals || []).map((d: any) => d.category)))];
  const filtered = filter === 'all' ? (data?.deals || []) : (data?.deals || []).filter((d: any) => d.category === filter);
  const featured = filtered.filter((d: any) => d.isFeatured);
  const regular = filtered.filter((d: any) => !d.isFeatured);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-sm text-gray-400">Loading deals...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-sm text-red-500">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero header */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)` }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-col items-center text-center">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="mb-4 h-16 w-16 rounded-2xl object-contain bg-white/20 p-2" />
            ) : (
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
                <Globe className="h-8 w-8 text-white" />
              </div>
            )}
            <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{companyName}</h1>
            {branding?.tagline && <p className="mt-2 text-base text-white/80">{branding.tagline}</p>}
            <div className="mt-4 flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              <Zap className="h-4 w-4" />
              {data?.deals.length || 0} Active Deals & Packages
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Category filter */}
        {categories.length > 2 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${filter === cat ? 'text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}
                style={filter === cat ? { backgroundColor: primaryColor } : {}}
              >
                {cat === 'all' ? 'All Deals' : CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Globe className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-lg font-semibold text-gray-500">No deals available right now</p>
            <p className="mt-1 text-sm text-gray-400">Check back soon for new packages and offers.</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured.length > 0 && (
              <div className="mb-10">
                <div className="mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <h2 className="text-lg font-bold text-gray-900">Featured Deals</h2>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {featured.map((deal: any) => <DealCard key={deal._id} deal={deal} agencyWhatsapp={whatsapp} />)}
                </div>
              </div>
            )}

            {/* Regular */}
            {regular.length > 0 && (
              <div>
                {featured.length > 0 && (
                  <h2 className="mb-4 text-lg font-bold text-gray-900">All Packages</h2>
                )}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {regular.map((deal: any) => <DealCard key={deal._id} deal={deal} agencyWhatsapp={whatsapp} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="mt-12 border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} {companyName}. All rights reserved.
      </footer>
    </div>
  );
}
