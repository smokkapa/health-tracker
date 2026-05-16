import React from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '../../auth/AuthContext';

interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  // Matchers identify which pathnames count as "active" for this item.
  match: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/(tabs)/',
    label: 'Dashboard',
    icon: 'analytics',
    match: (p) => p === '/' || p.endsWith('/(tabs)') || p.endsWith('/(tabs)/') || p === '/index',
  },
  {
    href: '/(tabs)/log',
    label: 'Log',
    icon: 'add-circle',
    match: (p) => p.endsWith('/log'),
  },
  {
    href: '/(tabs)/history',
    label: 'History',
    icon: 'list',
    match: (p) => p.endsWith('/history'),
  },
  {
    href: '/(tabs)/settings',
    label: 'Settings',
    icon: 'settings',
    match: (p) => p.endsWith('/settings'),
  },
];

export const SIDEBAR_WIDTH = 240;

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  // On web we want a native title-tooltip on hover for the full email.
  const tooltipProps =
    Platform.OS === 'web' && user?.email
      ? ({ accessibilityLabel: user.email, title: user.email } as any)
      : {};

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <View style={styles.logoBadge}>
          <Ionicons name="pulse" size={20} color="#3B82F6" />
        </View>
        <Text style={styles.brandText}>Health</Text>
      </View>

      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <TouchableOpacity
              key={item.href}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.href as any)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={active ? '#3B82F6' : '#9CA3AF'}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        {user?.email && (
          <View style={styles.userBlock}>
            <Text style={styles.signedInLabel}>Signed in as</Text>
            <Text
              style={styles.emailText}
              numberOfLines={1}
              ellipsizeMode="tail"
              {...tooltipProps}
            >
              {user.email}
            </Text>
          </View>
        )}
        <Text style={styles.footerText}>v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#1F2937',
    borderRightWidth: 1,
    borderRightColor: '#374151',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    marginBottom: 32,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#3B82F620',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
  },
  nav: {
    flex: 1,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  navItemActive: {
    backgroundColor: '#3B82F620',
  },
  navLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  footerText: {
    color: '#4B5563',
    fontSize: 11,
  },
  userBlock: {
    marginBottom: 10,
  },
  signedInLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  emailText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
});
