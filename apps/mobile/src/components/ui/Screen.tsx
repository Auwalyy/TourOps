import { ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND } from '@/lib/brand';

/** Every screen sits on this, so padding and the pull-to-refresh behaviour
 *  are identical throughout the app. */
export function Screen({
  children,
  title,
  subtitle,
  refreshing,
  onRefresh,
  scroll = true,
  action,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
  action?: ReactNode;
}) {
  const header = title ? (
    <View className="flex-row items-start justify-between gap-3 px-4 pb-3 pt-2">
      <View className="flex-1">
        <Text className="text-xl font-semibold tracking-tight text-neutral-900">{title}</Text>
        {subtitle ? <Text className="mt-0.5 text-[13px] text-neutral-500">{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  ) : null;

  if (!scroll) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-neutral-50">
        {header}
        {children}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-neutral-50">
      {header}
      <ScrollView
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={BRAND} colors={[BRAND]} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Loading() {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <ActivityIndicator color={BRAND} />
    </View>
  );
}

export function EmptyState({
  title,
  body,
  icon,
  action,
}: {
  title: string;
  body?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <View className="items-center px-6 py-16">
      {icon}
      <Text className="mt-3 text-[15px] font-medium text-neutral-700">{title}</Text>
      {body ? <Text className="mt-1 text-center text-[13px] text-neutral-400">{body}</Text> : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  );
}
