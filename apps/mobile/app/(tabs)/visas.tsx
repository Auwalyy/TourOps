import { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ClipboardCheck, Layers, FileText } from 'lucide-react-native';
import { visasApi, issuedVisasApi } from '@/services/api.service';
import { VisaApplication, VisaGroup, VisaIssuance } from '@/types';
import { Screen, Loading, EmptyState } from '@/components/ui/Screen';
import { Card, Badge, statusTone } from '@/components/ui/Card';
import { SearchBar } from '@/components/ui/SearchBar';
import { Tabs, TabDef } from '@/components/ui/Tabs';
import { formatCurrency, formatDate, titleCase } from '@/lib/utils';

/** Mirrors the web app's Visas page: the pipeline, plus what is already issued. */
const TABS: TabDef[] = [
  { id: 'applications', label: 'Applications' },
  { id: 'groups', label: 'Issued — Groups' },
  { id: 'issued', label: 'Issued — Individual' },
];

export default function VisasScreen() {
  const [tab, setTab] = useState('applications');
  const [search, setSearch] = useState('');

  return (
    <Screen title="Visas" subtitle="In progress, and already issued" scroll={false}>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <View className="px-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search..." />
      </View>

      {tab === 'applications' && <ApplicationsList search={search} />}
      {tab === 'groups' && <GroupsList search={search} />}
      {tab === 'issued' && <IssuedList search={search} />}
    </Screen>
  );
}

function ApplicationsList({ search }: { search: string }) {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['visas', search],
    queryFn: () => visasApi.list({ search: search || undefined, limit: 50 }).then((r) => r.data.data),
  });

  if (isLoading) return <Loading />;

  return (
    <FlatList
      data={(data || []) as VisaApplication[]}
      keyExtractor={(v) => v._id}
      contentContainerClassName="px-4 pb-24"
      refreshing={isFetching}
      onRefresh={refetch}
      ItemSeparatorComponent={() => <View className="h-2.5" />}
      ListEmptyComponent={
        <EmptyState
          icon={<ClipboardCheck color="#d4d4d4" size={32} />}
          title="No applications"
          body="Visa applications you are processing appear here."
        />
      }
      renderItem={({ item }) => {
        const customer = item.customerId as { fullName?: string } | undefined;
        const owing = (item.fees || 0) - (item.amountPaid || 0);
        return (
          <Card className="p-4">
            <View className="flex-row items-start justify-between gap-2">
              <Text className="font-mono text-[12px] font-semibold text-brand">
                {item.referenceNumber || '—'}
              </Text>
              <Badge tone={statusTone(item.status)}>{titleCase(item.status)}</Badge>
            </View>
            <Text className="mt-2 text-[15px] font-medium text-neutral-900">
              {customer?.fullName || '—'}
            </Text>
            <Text className="mt-0.5 text-[12px] text-neutral-500">
              {[item.destinationCountry, item.visaType].filter(Boolean).join(' · ') || '—'}
            </Text>
            <View className="mt-3 flex-row justify-between border-t border-neutral-100 pt-3">
              <Text className="text-[13px] text-neutral-600">{formatCurrency(item.fees)}</Text>
              <Text
                className={`text-[12px] font-medium ${owing > 0 ? 'text-red-600' : 'text-green-600'}`}
              >
                {owing > 0 ? `${formatCurrency(owing)} owing` : 'Paid'}
              </Text>
            </View>
          </Card>
        );
      }}
    />
  );
}

function GroupsList({ search }: { search: string }) {
  const router = useRouter();
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['issued-visas', 'groups', search],
    queryFn: () =>
      issuedVisasApi.groups.list({ search: search || undefined, limit: 50 }).then((r) => r.data.data),
  });

  if (isLoading) return <Loading />;

  return (
    <FlatList
      data={(data || []) as VisaGroup[]}
      keyExtractor={(g) => g._id}
      contentContainerClassName="px-4 pb-24"
      refreshing={isFetching}
      onRefresh={refetch}
      ItemSeparatorComponent={() => <View className="h-2.5" />}
      ListEmptyComponent={
        <EmptyState
          icon={<Layers color="#d4d4d4" size={32} />}
          title="No groups yet"
          body="Create a group when another company hands you a booking, then add each visa as it comes through."
        />
      }
      renderItem={({ item }) => {
        const count = item.entryCount || 0;
        return (
          <Card className="p-4" onPress={() => router.push(`/visa-group/${item._id}`)}>
            <View className="flex-row items-start justify-between gap-2">
              <Text className="font-mono text-[12px] font-semibold text-brand">{item.groupNumber}</Text>
              <Badge tone={item.status === 'open' ? 'blue' : 'default'}>
                {item.status === 'open' ? 'Open' : 'Closed'}
              </Badge>
            </View>
            <Text className="mt-2 text-[15px] font-medium text-neutral-900">{item.name}</Text>
            {item.partnerCompany ? (
              <Text className="mt-0.5 text-[12px] text-neutral-500">for {item.partnerCompany}</Text>
            ) : null}
            <View className="mt-3 flex-row justify-between border-t border-neutral-100 pt-3">
              <Text className="text-[12px] text-neutral-600">
                {count} traveller{count === 1 ? '' : 's'}
              </Text>
              {item.travelDate ? (
                <Text className="text-[12px] text-neutral-400">{formatDate(item.travelDate)}</Text>
              ) : null}
            </View>
          </Card>
        );
      }}
    />
  );
}

function IssuedList({ search }: { search: string }) {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['issued-visas', 'standalone', search],
    queryFn: () =>
      issuedVisasApi
        .list({ ungrouped: true, search: search || undefined, limit: 100 })
        .then((r) => r.data.data),
  });

  if (isLoading) return <Loading />;

  return (
    <FlatList
      data={(data || []) as VisaIssuance[]}
      keyExtractor={(e) => e._id}
      contentContainerClassName="px-4 pb-24"
      refreshing={isFetching}
      onRefresh={refetch}
      ItemSeparatorComponent={() => <View className="h-2.5" />}
      ListEmptyComponent={
        <EmptyState
          icon={<FileText color="#d4d4d4" size={32} />}
          title="Nothing here yet"
          body="One-off visas or tickets you issue that are not part of a group."
        />
      }
      renderItem={({ item }) => (
        <Card className="p-4">
          <View className="flex-row items-start justify-between gap-2">
            <Text className="font-mono text-[13px] font-semibold text-neutral-900">
              {item.passportNumber}
            </Text>
            <Badge tone={item.type === 'ticket' ? 'blue' : 'green'}>{titleCase(item.type)}</Badge>
          </View>
          <Text className="mt-1.5 text-[15px] text-neutral-800">{item.travellerName}</Text>
          <View className="mt-3 flex-row justify-between border-t border-neutral-100 pt-3">
            <Text className="font-mono text-[12px] text-neutral-600">{item.documentNumber || '—'}</Text>
            <Text className="text-[12px] text-neutral-400">{formatDate(item.issueDate)}</Text>
          </View>
        </Card>
      )}
    />
  );
}
