import { create } from 'zustand';
import api from '@/lib/api';

export interface Branding {
  companyName: string;
  tagline: string;
  primaryColor: string;
  logoUrl: string;
  faviconUrl: string;
  whatsappNumber: string;
  agencyName: string;
}

const DEFAULTS: Branding = {
  companyName: '',
  tagline: 'Manage customers, bookings, visas, invoices, and documents — all in one place.',
  primaryColor: '#2563eb',
  logoUrl: '',
  faviconUrl: '',
  whatsappNumber: '',
  agencyName: '',
};

interface BrandingState {
  branding: Branding;
  loaded: boolean;
  fetch: (agencyId?: string) => Promise<void>;
  update: (data: Partial<Branding>) => void;
}

export const useBrandingStore = create<BrandingState>((set) => ({
  branding: DEFAULTS,
  loaded: false,
  fetch: async (agencyId?: string) => {
    try {
      const params = agencyId ? { agencyId } : {};
      const res = await api.get('/agency/branding', { params });
      const d = res.data.data;
      set({
        branding: {
          companyName: d?.branding?.companyName || d?.name || '',
          tagline: d?.branding?.tagline || DEFAULTS.tagline,
          primaryColor: d?.branding?.primaryColor || DEFAULTS.primaryColor,
          logoUrl: d?.branding?.logoUrl || d?.logo || '',
          faviconUrl: d?.branding?.faviconUrl || '',
          whatsappNumber: d?.branding?.whatsappNumber || '',
          agencyName: d?.name || '',
        },
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },
  update: (data) =>
    set((s) => ({ branding: { ...s.branding, ...data } })),
}));
