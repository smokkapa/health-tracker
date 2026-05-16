import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { DateRange } from '../../types';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'All time', days: -1 },
];

function subtractDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() - days);
  return result;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [visible, setVisible] = useState(false);

  const activePreset = PRESETS.find((p) => {
    if (p.days === -1) return false;
    const expected = subtractDays(new Date(), p.days);
    return Math.abs(value.start.getTime() - expected.getTime()) < 1000 * 60 * 60 * 24;
  });

  const handlePreset = (days: number) => {
    const end = new Date();
    const start = days === -1 ? new Date('2000-01-01') : subtractDays(end, days);
    onChange({ start, end });
    setVisible(false);
  };

  return (
    <View>
      <TouchableOpacity style={styles.button} onPress={() => setVisible(true)}>
        <Text style={styles.buttonText}>
          {activePreset ? activePreset.label : 'Custom range'}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Date Range</Text>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p.label}
                style={[styles.menuItem, activePreset?.label === p.label && styles.menuItemActive]}
                onPress={() => handlePreset(p.days)}
              >
                <Text style={[styles.menuItemText, activePreset?.label === p.label && styles.menuItemTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  buttonText: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '500',
  },
  chevron: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menu: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  menuItemActive: {
    // highlighted
  },
  menuItemText: {
    color: '#E5E7EB',
    fontSize: 16,
  },
  menuItemTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});
