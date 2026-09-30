import { View, Text, Linking, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Phone, Plane, Wallet } from 'lucide-react-native';
import { travelFilesApi } from '@/services/api.service';
import { Booking, TravelFile } from '@/types';
import { Screen, Loading, EmptyState } from '@/components/ui/Screen';
import { Card, Badge, statusTone } from '@/components/ui/Card';
import { formatCurrency, formatDate, titleCase } from '@/lib/utils';
import { BRAND, MUTED } from '@/lib/brand';

export default function TravelFileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const file = useQuery<TravelFile>({
    queryKey: ['travel-file', id],
    queryFn: () => travelFilesApi.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const bookings = useQuery<Booking[]>({
    queryKey: ['travel-file', id, 'bookings'],
    queryFn: () => travelFilesApi.getBookings(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const payments = useQuery<any[]>({
    queryKey: ['travel-file', id, 'payments'],
    queryFn: () => travelFilesApi.listPayments(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  if (file.isLoading) return <Loading />;
  if (!file.data) return <EmptyState title="File not found" />;

  const f = file.data;
  const customer = f.customerId as any;
  const balance = (f.totalCost || 0) - (f.amountPaid || 0);

  return (
    <Screen
      refreshing={file.isFetching}
      onRefresh={() => {
        file.refetch();
        bookings.refetch();
        payments.refetch();
      }}
    >
      {/* Header */}
      <View className="mb-4 flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text className="font-mono text-[12px] font-semibold text-brand">{f.fileNumber}</Text>
          <Text className="mt-1 text-lg font-semibold text-neutral-900">
            {customer?.fullName ||
              `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() ||
              f.title ||
              'Travel file'}
          </Text>
          {f.departureDate ? (
            <Text className="mt-0.5 text-[12px] text-neutral-500">
              Departs {formatDate(f.departureDate)}
            </Text>
          ) : null}
        </View>
        <Badge tone={statusTone(f.status)}>{titleCase(f.status)}</Badge>
      </View>

      {customer?.phone ? (
        <Pressable
          onPress={() => Linking.openURL(`tel:${customer.phone}`)}
          className="mb-4 flex-row items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 active:bg-neutral-50"
        >
          <Phone color={BRAND} size={15} />
          <Text className="flex-1 text-[14px] text-neutral-800">{customer.phone}</Text>
          <Text className="text-[12px] text-brand">Call</Text>
        </Pressable>
      ) : null}

      {/* Money — the reason anyone opens a file on a phone */}
      <Card className="mb-4 p-4">
        <View className="flex-row items-center gap-2">
          <Wallet color={MUTED} size={15} />
          <Text className="text-[12px] font-medium uppercase tracking-wide text-neutral-500">
            Money
          </Text>
        </View>
        <View className="mt-3 flex-row justify-between">
          <Text className="text-[13px] text-neutral-500">Total</Text>
          <Text className="text-[13px] text-neutral-800">{formatCurrency(f.totalCost)}</Text>
        </View>
        <View className="mt-1.5 flex-row justify-between">
          <Text className="text-[13px] text-neutral-500">Paid</Text>
          <Text className="text-[13px] text-neutral-800">{formatCurrency(f.amountPaid)}</Text>
        </View>
        <View className="mt-3 flex-row justify-between border-t border-neutral-100 pt-3">
          <Text className="text-[13px] font-medium text-neutral-700">Balance</Text>
          <Text
            className={`text-[15px] font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}
          >
            {balance > 0 ? formatCurrency(balance) : 'Fully paid'}
          </Text>
        </View>
      </Card>

      {/* Bookings */}
      <Text className="mb-2 text-[13px] font-medium text-neutral-700">Bookings</Text>
      {!bookings.data?.length ? (
        <Card className="mb-4 p-4">
          <Text className="text-center text-[13px] text-neutral-400">No bookings on this file</Text>
        </Card>
      ) : (
        <Card className="mb-4">
          {bookings.data.map((b, i) => (
            <View
              key={b._id}
              className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-neutral-100' : ''}`}
            >
              <Plane color={MUTED} size={15} />
              <View className="flex-1">
                <Text className="text-[14px] text-neutral-800">{titleCase(b.bookingType)}</Text>
                <Text className="mt-0.5 text-[11px] text-neutral-400">
                  {b.bookingNumber}
                  {b.startDate ? ` · ${formatDate(b.startDate)}` : ''}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[13px] text-neutral-800">{formatCurrency(b.cost)}</Text>
                <Badge tone={statusTone(b.status)}>{titleCase(b.status)}</Badge>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Payment ledger */}
      <Text className="mb-2 text-[13px] font-medium text-neutral-700">Payments</Text>
      {!payments.data?.length ? (
        <Card className="p-4">
          <Text className="text-center text-[13px] text-neutral-400">Nothing recorded yet</Text>
        </Card>
      ) : (
        <Card>
          {payments.data.map((p: any, i: number) => (
            <View
              key={p._id || i}
              className={`flex-row items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-neutral-100' : ''}`}
            >
              <View>
                <Text className="text-[14px] text-neutral-800">{formatCurrency(p.amount)}</Text>
                <Text className="mt-0.5 text-[11px] text-neutral-400">
                  {titleCase(p.method)} · {formatDate(p.paidAt || p.createdAt)}
                </Text>
              </View>
              <Badge tone={statusTone(p.status)}>{titleCase(p.status)}</Badge>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
