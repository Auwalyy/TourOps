import { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FolderKanban } from 'lucide-react-native';
import { travelFilesApi } from '@/services/api.service';
import { TravelFile } from '@/types';
import { Screen, Loading, EmptyState } from '@/components/ui/Screen';
import { Card, Badge, statusTone } from '@/components/ui/Card';
import { SearchBar } from '@/components/ui/SearchBar';
import { formatCurrency, formatDate, titleCase } from '@/lib/utils';

export default function TravelFilesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['travel-files', search],
    queryFn: () =>
      travelFilesApi.list({ search: search || undefined, limit: 50 }).then((r) => r.data.data),
  });

  const files: TravelFile[] = data || [];

  return (
    <Screen title="Travel Files" subtitle="Every trip you are managing" scroll={false}>
      <View className="px-4">
        <SearchBar value={search} onChange={setSearch} placeholder="File number or customer..." />
      </View>

      {isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={files}
          keyExtractor={(f) => f._id}
          contentContainerClassName="px-4 pb-24"
          refreshing={isFetching}
          onRefresh={refetch}
          ItemSeparatorComponent={() => <View className="h-2.5" />}
          ListEmptyComponent={
            <EmptyState
              icon={<FolderKanban color="#d4d4d4" size={32} />}
              title="No travel files"
              body="Open a file for a trip you are managing, and everything about that customer lives in one place."
            />
          }
          renderItem={({ item }) => {
            const customer: any = item.customerId;
            const balance = (item.totalCost || 0) - (item.amountPaid || 0);
            return (
              <Card className="p-4" onPress={() => router.push(`/travel-file/${item._id}`)}>
                <View className="flex-row items-start justify-between gap-2">
                  <Text className="font-mono text-[12px] font-semibold text-brand">
                    {item.fileNumber}
                  </Text>
                  <Badge tone={statusTone(item.status)}>{titleCase(item.status)}</Badge>
                </View>

                <Text className="mt-2 text-[15px] font-medium text-neutral-900">
                  {customer?.fullName ||
                    `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() ||
                    item.title ||
                    'Unnamed file'}
                </Text>

                <View className="mt-3 flex-row items-end justify-between border-t border-neutral-100 pt-3">
                  <View>
                    <Text className="text-[11px] text-neutral-400">Paid</Text>
                    <Text className="text-[13px] text-neutral-700">
                      {formatCurrency(item.amountPaid)} of {formatCurrency(item.totalCost)}
                    </Text>
                  </View>
                  <Text
                    className={`text-[13px] font-semibold ${
                      balance > 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {balance > 0 ? `${formatCurrency(balance)} left` : 'Fully paid'}
                  </Text>
                </View>

                {item.departureDate ? (
                  <Text className="mt-2 text-[11px] text-neutral-400">
                    Departs {formatDate(item.departureDate)}
                  </Text>
                ) : null}
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}
