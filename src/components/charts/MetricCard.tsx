import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MetricType } from '../../types';
import { metricTypeLabel } from '../../utils/formatters';

export const METRIC_COLORS: Record<MetricType, string> = {
  blood_pressure: '#EF4444',
  blood_sugar: '#3B82F6',
  weight: '#22C55E',
};

export const METRIC_ICONS: Record<MetricType, keyof typeof Ionicons.glyphMap> = {
  blood_pressure: 'heart',
  blood_sugar: 'water',
  weight: 'barbell',
};

interface MetricCardProps {
  metricType: MetricType;
  currentValue: string;
  trend?: 'up' | 'down' | 'stable' | null;
  onPress?: () => void;
  children?: React.ReactNode;
}

export function MetricCard({ metricType, currentValue, trend, onPress, children }: MetricCardProps) {
  const color = METRIC_COLORS[metricType];
  const icon = METRIC_ICONS[metricType];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={styles.label}>{metricTypeLabel(metricType)}</Text>
        {trend && (
          <View style={styles.trend}>
            <Ionicons
              name={trend === 'up' ? 'arrow-up' : trend === 'down' ? 'arrow-down' : 'remove'}
              size={14}
              color={trend === 'up' ? '#EF4444' : trend === 'down' ? '#22C55E' : '#6B7280'}
            />
          </View>
        )}
      </View>
      <Text style={[styles.value, { color }]}>{currentValue}</Text>
      {children && <View style={styles.chart}>{children}</View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  trend: {
    padding: 2,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  chart: {
    marginTop: 4,
  },
});
