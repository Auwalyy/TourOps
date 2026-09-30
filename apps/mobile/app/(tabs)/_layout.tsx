import { Tabs } from 'expo-router';
import { LayoutDashboard, FolderKanban, Stamp, Users, Menu } from 'lucide-react-native';
import { BRAND } from '@/lib/brand';
import { SubscriptionBanner } from '@/components/features/SubscriptionBanner';
import { View } from 'react-native';

/** Five tabs, no more — anything else lives under More. */
export default function TabsLayout() {
  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: BRAND,
          tabBarInactiveTintColor: '#a3a3a3',
          tabBarStyle: { borderTopColor: '#e5e5e5', height: 58, paddingBottom: 6, paddingTop: 6 },
          tabBarLabelStyle: { fontSize: 11 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size - 2} /> }}
        />
        <Tabs.Screen
          name="travel-files"
          options={{ title: 'Files', tabBarIcon: ({ color, size }) => <FolderKanban color={color} size={size - 2} /> }}
        />
        <Tabs.Screen
          name="visas"
          options={{ title: 'Visas', tabBarIcon: ({ color, size }) => <Stamp color={color} size={size - 2} /> }}
        />
        <Tabs.Screen
          name="customers"
          options={{ title: 'Customers', tabBarIcon: ({ color, size }) => <Users color={color} size={size - 2} /> }}
        />
        <Tabs.Screen
          name="more"
          options={{ title: 'More', tabBarIcon: ({ color, size }) => <Menu color={color} size={size - 2} /> }}
        />
      </Tabs>
      <SubscriptionBanner />
    </View>
  );
}
