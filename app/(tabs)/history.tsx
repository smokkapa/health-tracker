import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { confirm } from '../../src/utils/alerts';
import { Ionicons } from '@expo/vector-icons';
import { useMetricsStore } from '../../src/stores/metrics';
import { MetricType, MetricEntry } from '../../src/types';
import { formatDate, formatTime, formatMetricValue, metricTypeLabel } from '../../src/utils/formatters';
import { METRIC_COLORS, METRIC_ICONS } from '../../src/components/charts/MetricCard';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { DateRangePicker } from '../../src/components/ui/DateRangePicker';
import { ResponsiveContainer } from '../../src/components/ui/ResponsiveContainer';
import { Tooltip } from '../../src/components/ui/Tooltip';
import { DateRange } from '../../src/types';
import { useIsDesktop } from '../../src/utils/responsive';

function buildTooltip(entry: MetricEntry): string {
  const lines: string[] = [];
  lines.push(`${metricTypeLabel(entry.metric_type)}`);
  lines.push(`${formatDate(entry.timestamp)} · ${formatTime(entry.timestamp)}`);
  lines.push(`Value: ${formatMetricValue(entry)}`);
  if (entry.metric_type === 'blood_pressure' && entry.pulse != null) {
    lines.push(`Pulse: ${entry.pulse} bpm`);
  }
  if (entry.metric_type === 'weight' && entry.body_fat != null) {
    lines.push(`Body Fat: ${entry.body_fat}%`);
  }
  if (entry.metric_type === 'blood_sugar' && entry.fasting != null) {
    lines.push(`State: ${entry.fasting ? 'Fasting' : 'Post-meal'}`);
  }
  lines.push(`Source: ${entry.source}`);
  if (entry.notes) lines.push(`Notes: ${entry.notes}`);
  return lines.join('\n');
}

const METRIC_FILTERS: (MetricType | 'all')[] = ['all', 'blood_pressure', 'blood_sugar', 'weight'];

function groupByDate(entries: MetricEntry[]): { date: string; items: MetricEntry[] }[] {
  const map = new Map<string, MetricEntry[]>();
  for (const entry of entries) {
    const date = formatDate(entry.timestamp);
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(entry);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

export default function HistoryScreen() {
  const { entries, loadEntries, deleteEntry } = useMetricsStore();
  const [filter, setFilter] = useState<MetricType | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });
  const isDesktop = useIsDesktop();

  useEffect(() => {
    loadEntries();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  }, []);

  const filtered = entries.filter((e) => {
    const matchType = filter === 'all' || e.metric_type === filter;
    const ts = new Date(e.timestamp);
    const matchDate = ts >= dateRange.start && ts <= dateRange.end;
    return matchType && matchDate;
  });

  const grouped = groupByDate(filtered);

  const handleDelete = async (id: string) => {
    const ok = await confirm(
      'Delete Entry',
      'Are you sure you want to delete this reading?',
      { confirmLabel: 'Delete', destructive: true },
    );
    if (ok) deleteEntry(id);
  };

  const renderEntry = (entry: MetricEntry) => {
    const color = METRIC_COLORS[entry.metric_type];
    const icon = METRIC_ICONS[entry.metric_type];

    return (
      <Tooltip key={entry.id} tip={buildTooltip(entry)}>
        <View style={styles.row}>
          <View style={[styles.iconBadge, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={16} color={color} />
          </View>
          <View style={styles.rowContent}>
            <View style={styles.valueRow}>
              <Text style={styles.rowValue}>{formatMetricValue(entry)}</Text>
              {entry.metric_type === 'blood_sugar' && entry.fasting && (
                <View style={styles.fastingBadge}>
                  <Text style={styles.fastingBadgeText}>F</Text>
                </View>
              )}
            </View>
            <View style={styles.rowMeta}>
              <Text style={styles.rowTime}>{formatTime(entry.timestamp)}</Text>
              <View style={[styles.sourceBadge, { backgroundColor: color + '20' }]}>
                <Text style={[styles.sourceText, { color }]}>{entry.source}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleDelete(entry.id)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color="#4B5563" />
          </TouchableOpacity>
        </View>
      </Tooltip>
    );
  };

  // Desktop table row
  const renderTableRow = (entry: MetricEntry) => {
    const color = METRIC_COLORS[entry.metric_type];
    const icon = METRIC_ICONS[entry.metric_type];
    return (
      <Tooltip key={entry.id} tip={buildTooltip(entry)}>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, styles.colDate]}>{formatDate(entry.timestamp)}</Text>
        <Text style={[styles.tableCell, styles.colTime]}>{formatTime(entry.timestamp)}</Text>
        <View style={[styles.tableCell, styles.colMetric, styles.metricCellRow]}>
          <View style={[styles.iconBadgeSmall, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={12} color={color} />
          </View>
          <Text style={styles.tableMetricText}>{metricTypeLabel(entry.metric_type)}</Text>
        </View>
        <View style={[styles.tableCell, styles.colValue, styles.valueRow]}>
          <Text style={styles.tableValueText}>{formatMetricValue(entry)}</Text>
          {entry.metric_type === 'blood_sugar' && entry.fasting && (
            <View style={styles.fastingBadge}>
              <Text style={styles.fastingBadgeText}>F</Text>
            </View>
          )}
        </View>
        <View style={[styles.tableCell, styles.colSource]}>
          <View style={[styles.sourceBadge, { backgroundColor: color + '20', alignSelf: 'flex-start' }]}>
            <Text style={[styles.sourceText, { color }]}>{entry.source}</Text>
          </View>
        </View>
        <Text
          style={[styles.tableCell, styles.colNotes, styles.tableNotesText]}
          numberOfLines={1}
        >
          {entry.notes ?? '—'}
        </Text>
        <TouchableOpacity
          onPress={() => handleDelete(entry.id)}
          style={[styles.tableCell, styles.colActions, styles.tableActionBtn]}
        >
          <Ionicons name="trash-outline" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>
      </Tooltip>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filters row */}
      <View style={styles.filtersOuter}>
        <ResponsiveContainer>
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              {METRIC_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, filter === f && styles.filterChipActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                    {f === 'all' ? 'All' : metricTypeLabel(f)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </View>
        </ResponsiveContainer>
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          title="No entries"
          message={filter === 'all' ? 'No readings in this date range.' : `No ${metricTypeLabel(filter as MetricType)} readings.`}
          icon="list-outline"
        />
      ) : isDesktop ? (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
          }
        >
          <ResponsiveContainer>
            <View style={styles.tableWrap}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colDate]}>Date</Text>
                <Text style={[styles.tableHeaderCell, styles.colTime]}>Time</Text>
                <Text style={[styles.tableHeaderCell, styles.colMetric]}>Metric</Text>
                <Text style={[styles.tableHeaderCell, styles.colValue]}>Value</Text>
                <Text style={[styles.tableHeaderCell, styles.colSource]}>Source</Text>
                <Text style={[styles.tableHeaderCell, styles.colNotes]}>Notes</Text>
                <Text style={[styles.tableHeaderCell, styles.colActions]}> </Text>
              </View>
              {filtered.map(renderTableRow)}
            </View>
          </ResponsiveContainer>
        </ScrollView>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.date}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
          }
          renderItem={({ item }) => (
            <View style={styles.group}>
              <Text style={styles.groupDate}>{item.date}</Text>
              {item.items.map(renderEntry)}
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  filtersOuter: {
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterRow: {
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1F2937',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  group: {
    marginBottom: 20,
  },
  groupDate: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowValue: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  rowTime: {
    color: '#6B7280',
    fontSize: 12,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  deleteBtn: {
    padding: 4,
  },
  // Desktop table
  tableWrap: {
    marginTop: 16,
    marginBottom: 32,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  tableHeaderCell: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  tableCell: {
    color: '#D1D5DB',
    fontSize: 13,
    paddingRight: 8,
  },
  metricCellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadgeSmall: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableMetricText: {
    color: '#D1D5DB',
    fontSize: 13,
  },
  tableValueText: {
    color: '#F9FAFB',
    fontWeight: '600',
  },
  tableNotesText: {
    color: '#9CA3AF',
  },
  tableActionBtn: {
    alignItems: 'flex-end',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fastingBadge: {
    backgroundColor: '#F59E0B20',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  fastingBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700',
  },
  colDate: { width: 130 },
  colTime: { width: 80 },
  colMetric: { width: 170 },
  colValue: { width: 140 },
  colSource: { width: 100 },
  colNotes: { flex: 1, minWidth: 100 },
  colActions: { width: 40 },
});
