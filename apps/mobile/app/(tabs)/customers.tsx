import { useState } from 'react';
import { View, Text, FlatList, Linking, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Users, Phone } from 'lucide-react-native';
import { customersApi } from '@/services/api.service';
import { Customer } from '@/types';
import { Screen, Loading, EmptyState } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { SearchBar } from '@/components/ui/SearchBar';
import { initials } from '@/lib/utils';
import { BRAND } from '@/lib/brand';

export default function CustomersScreen() {
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['customers', search],
    queryFn: () =>
      customersApi.list({ search: search || undefined, limit: 100 }).then((r) => r.data.data),
  });

  return (
    <Screen title="Customers" subtitle="Everyone you work with" scroll={false}>
      <View className="px-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Name, phone or passport..." />
      </View>

      {isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={(data || []) as Customer[]}
          keyExtractor={(c) => c._id}
          contentContainerClassName="px-4 pb-24"
          refreshing={isFetching}
          onRefresh={refetch}
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListEmptyComponent={
            <EmptyState
              icon={<Users color="#d4d4d4" size={32} />}
              title="No customers"
              body="Customers you add on the web app appear here."
            />
          }
          renderItem={({ item }) => {
            const name =
              item.fullName || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unnamed';
            return (
              <Card className="flex-row items-center gap-3 p-3.5">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                  <Text className="text-[13px] font-semibold text-brand-700">
                    {initials(item.firstName, item.lastName)}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="text-[15px] font-medium text-neutral-900">{name}</Text>
                  <Text className="mt-0.5 text-[12px] text-neutral-500">
                    {[item.phone, item.passport?.number].filter(Boolean).join(' · ') || 'No contact'}
                  </Text>
                </View>

                {/* Calling the customer is the single most common action here. */}
                {item.phone ? (
                  <Pressable
                    hitSlop={8}
                    onPress={() => Linking.openURL(`tel:${item.phone}`)}
                    className="h-9 w-9 items-center justify-center rounded-full bg-brand-50 active:bg-brand-100"
                  >
                    <Phone color={BRAND} size={15} />
                  </Pressable>
                ) : null}
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}
