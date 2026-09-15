'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { bookingsApi, travelFilesApi } from '@/services/api.service';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { BookingType } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** When opened from a Travel File page — locks travelFileId and customerId */
  travelFileId?: string;
  /** Pre-populated customer from the Travel File */
  customerId?: string;
  onCreated?: () => void;
}

const BOOKING_TYPES: { value: BookingType; label: string }[] = [
  { value: 'flight', label: 'Flight' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'transport', label: 'Transport' },
  { value: 'tour', label: 'Tour' },
  { value: 'activity', label: 'Activity' },
  { value: 'package', label: 'Package' },
  { value: 'other', label: 'Other' },
];

const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'];

export function BookingFormModal({ open, onClose, travelFileId, customerId, onCreated }: Props) {
  const qc = useQueryClient();
  const [bookingType, setBookingType] = useState<BookingType>('flight');

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: { title: '', provider: '', currency: 'NGN', cost: 0, startDate: '', endDate: '' },
  });

  // If no travelFileId prop, let staff pick a Travel File
  const [selectedTravelFileId, setSelectedTravelFileId] = useState(travelFileId || '');

  const { data: travelFiles } = useQuery({
    queryKey: ['travel-files', 'all'],
    queryFn: () => travelFilesApi.list({ limit: 100 }).then((r) => r.data.data),
    enabled: open && !travelFileId,
  });

  // When a travel file is selected from the dropdown, auto-populate customerId
  const selectedTf = (travelFiles as any[])?.find((tf: any) => tf._id === selectedTravelFileId);

  useEffect(() => {
    if (!open) { reset(); setBookingType('flight'); setSelectedTravelFileId(travelFileId || ''); }
  }, [open, travelFileId, reset]);

  async function onSubmit(data: any) {
    const tfId = travelFileId || selectedTravelFileId;
    if (!tfId) { toast.error('Please select a Travel File'); return; }

    const payload: Record<string, unknown> = {
      bookingType,
      title: data.title,
      provider: data.provider || undefined,
      cost: Number(data.cost) || 0,
      currency: data.currency,
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
      details: buildDetails(bookingType, data),
    };

    if (customerId) payload.customerId = customerId;
    else if (selectedTf) payload.customerId = typeof selectedTf.customerId === 'object' ? selectedTf.customerId._id : selectedTf.customerId;

    try {
      await bookingsApi.createForTravelFile(tfId, payload);
      toast.success('Booking created');
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['travel-files', tfId] });
      onCreated?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create booking');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Booking" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
        {/* Travel File selector — only shown when not locked */}
        {!travelFileId && (
          <div>
            <Label>Travel File *</Label>
            <Select value={selectedTravelFileId} onChange={(e) => setSelectedTravelFileId(e.target.value)}>
              <option value="">Select travel file...</option>
              {(travelFiles as any[] | undefined)?.map((tf: any) => {
                const c = tf.customerId;
                const name = c?.fullName || `${c?.firstName || ''} ${c?.lastName || ''}`.trim();
                return (
                  <option key={tf._id} value={tf._id}>
                    {tf.fileNumber} — {name}
                  </option>
                );
              })}
            </Select>
            {selectedTf && (
              <p className="mt-1 text-xs text-gray-500">
                Customer: {(selectedTf.customerId as any)?.fullName || '—'} · {selectedTf.destination}
              </p>
            )}
          </div>
        )}

        {/* Booking Type */}
        <div>
          <Label>Booking Type *</Label>
          <Select value={bookingType} onChange={(e) => setBookingType(e.target.value as BookingType)}>
            {BOOKING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>

        {/* Title */}
        <div>
          <Label>Title *</Label>
          <Input placeholder={titlePlaceholder(bookingType)} {...register('title', { required: true })} />
        </div>

        {/* Provider */}
        <div>
          <Label>Provider / Supplier</Label>
          <Input placeholder="e.g. Qatar Airways, Hilton, etc." {...register('provider')} />
        </div>

        {/* Type-specific fields */}
        <TypeFields type={bookingType} register={register} />

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{startDateLabel(bookingType)}</Label>
            <Input type="datetime-local" {...register('startDate')} />
          </div>
          <div>
            <Label>{endDateLabel(bookingType)}</Label>
            <Input type="datetime-local" {...register('endDate')} />
          </div>
        </div>

        {/* Cost */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Cost</Label>
            <Input type="number" min={0} step="0.01" {...register('cost')} />
          </div>
          <div>
            <Label>Currency</Label>
            <Select {...register('currency')}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Create Booking</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Type-specific detail fields ─────────────────────────────────────────────

function TypeFields({ type, register }: { type: BookingType; register: any }) {
  if (type === 'flight') return (
    <div className="grid grid-cols-2 gap-4">
      <div><Label>Airline</Label><Input placeholder="Qatar Airways" {...register('details.airline')} /></div>
      <div><Label>Flight Number</Label><Input placeholder="QR123" {...register('details.flightNumber')} /></div>
      <div><Label>From (Departure)</Label><Input placeholder="Kano (KAN)" {...register('details.departureLocation')} /></div>
      <div><Label>To (Arrival)</Label><Input placeholder="Jeddah (JED)" {...register('details.arrivalLocation')} /></div>
      <div><Label>PNR / Booking Ref</Label><Input placeholder="ABC123" {...register('details.pnr')} /></div>
      <div><Label>Baggage Allowance</Label><Input placeholder="2 × 23kg" {...register('details.baggageAllowance')} /></div>
      <div><Label>Passenger Count</Label><Input type="number" min={1} {...register('details.passengerCount')} /></div>
      <div><Label>Seat Number</Label><Input placeholder="12A" {...register('details.seatNumber')} /></div>
    </div>
  );

  if (type === 'hotel') return (
    <div className="grid grid-cols-2 gap-4">
      <div><Label>Hotel Name</Label><Input placeholder="Hilton Makkah" {...register('details.hotelName')} /></div>
      <div><Label>City</Label><Input placeholder="Makkah" {...register('details.city')} /></div>
      <div><Label>Hotel Address</Label><Input placeholder="Al Abraj St." {...register('details.hotelAddress')} /></div>
      <div><Label>Room Type</Label><Input placeholder="Double" {...register('details.roomType')} /></div>
      <div><Label>Number of Rooms</Label><Input type="number" min={1} {...register('details.numberOfRooms')} /></div>
      <div><Label>Guest Count</Label><Input type="number" min={1} {...register('details.guestCount')} /></div>
      <div><Label>Booking Reference</Label><Input {...register('details.bookingReference')} /></div>
    </div>
  );

  if (type === 'transport') return (
    <div className="grid grid-cols-2 gap-4">
      <div><Label>Vehicle Type</Label><Input placeholder="Bus / Van / Car" {...register('details.vehicleType')} /></div>
      <div><Label>Passenger Count</Label><Input type="number" min={1} {...register('details.passengerCount')} /></div>
      <div><Label>Pickup Location</Label><Input placeholder="Jeddah Airport" {...register('details.pickupLocation')} /></div>
      <div><Label>Drop-off Location</Label><Input placeholder="Makkah Hotel" {...register('details.dropoffLocation')} /></div>
      <div><Label>Driver Name</Label><Input {...register('details.driverName')} /></div>
      <div><Label>Driver Phone</Label><Input {...register('details.driverPhone')} /></div>
      <div><Label>Booking Reference</Label><Input {...register('details.bookingReference')} /></div>
    </div>
  );

  if (type === 'tour' || type === 'activity') return (
    <div className="grid grid-cols-2 gap-4">
      <div><Label>Tour / Activity Name</Label><Input {...register('details.tourName')} /></div>
      <div><Label>Location</Label><Input {...register('details.location')} /></div>
      <div><Label>Participants</Label><Input type="number" min={1} {...register('details.numberOfParticipants')} /></div>
      <div><Label>Booking Reference</Label><Input {...register('details.bookingReference')} /></div>
    </div>
  );

  return (
    <div>
      <Label>Booking Reference</Label>
      <Input {...register('details.bookingReference')} />
    </div>
  );
}

function buildDetails(type: BookingType, data: any) {
  return data.details || {};
}

function titlePlaceholder(type: BookingType) {
  const map: Record<BookingType, string> = {
    flight: 'e.g. Kano → Jeddah Flight',
    hotel: 'e.g. Hilton Makkah — 10 nights',
    transport: 'e.g. Airport Transfer Jeddah → Makkah',
    tour: 'e.g. Madinah City Tour',
    activity: 'e.g. Desert Safari',
    package: 'e.g. Umrah Package',
    other: 'e.g. Travel Insurance',
  };
  return map[type];
}

function startDateLabel(type: BookingType) {
  if (type === 'hotel') return 'Check-in Date';
  if (type === 'transport') return 'Pickup Date & Time';
  return 'Start Date';
}

function endDateLabel(type: BookingType) {
  if (type === 'hotel') return 'Check-out Date';
  return 'End Date';
}
