import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs, Slot, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIsDesktop } from '../../src/utils/responsive';
import { Sidebar } from '../../src/components/ui/Sidebar';
import { UserBadge } from '../../src/components/ui/UserBadge';

const SCREEN_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/log': 'Log',
  '/history': 'History',
  '/settings': 'Settings',
};

function getScreenTitle(pathname: string): string {
  if (pathname.endsWith('/log')) return 'Log';
  if (pathname.endsWith('/history')) return 'History';
  if (pathname.endsWith('/settings')) return 'Settings';
  return 'Dashboard';
}

function DesktopHeader() {
  const pathname = usePathname();
  return (
    <View style={styles.desktopHeader}>
      <Text style={styles.desktopHeaderTitle}>{getScreenTitle(pathname)}</Text>
    </View>
  );
}

function DesktopLayout() {
  return (
    <View style={styles.desktopRoot}>
      <Sidebar />
      <View style={styles.desktopContent}>
        <DesktopHeader />
        <View style={styles.desktopSlot}>
          <Slot />
        </View>
      </View>
    </View>
  );
}

function MobileTabsLayout() {
  return (
    <View style={styles.mobileRoot}>
      <UserBadge />
      <View style={styles.mobileSlot}>
        <MobileTabsInner />
      </View>
    </View>
  );
}

function MobileTabsInner() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#111827' },
        headerTintColor: '#F9FAFB',
        headerTitleStyle: { fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: '#1F2937',
          borderTopColor: '#374151',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabsLayout() {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DesktopLayout /> : <MobileTabsLayout />;
}

const styles = StyleSheet.create({
  desktopRoot: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#111827',
  },
  desktopContent: {
    flex: 1,
    flexDirection: 'column',
  },
  desktopHeader: {
    height: 56,
    paddingHorizontal: 24,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    justifyContent: 'center',
  },
  desktopHeaderTitle: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '600',
  },
  desktopSlot: {
    flex: 1,
  },
  mobileRoot: {
    flex: 1,
    backgroundColor: '#111827',
  },
  mobileSlot: {
    flex: 1,
  },
});
