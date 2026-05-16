import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../auth/AuthContext';

/**
 * Compact "signed in as" badge for mobile screens. Renders nothing if no user.
 */
export function UserBadge() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
        {'\u{1F464} '}{user.email}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    alignItems: 'flex-end',
  },
  text: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
});
