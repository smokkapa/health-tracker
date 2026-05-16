import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMetricsStore } from '../../src/stores/metrics';
import { MetricCard } from '../../src/components/charts/MetricCard';
import { BloodPressureChart } from '../../src/components/charts/BloodPressureChart';
import { BloodSugarChart } from '../../src/components/charts/BloodSugarChart';
import { WeightChart } from '../../src/components/charts/WeightChart';
import { MetricDetailView } from '../../src/components/charts/MetricDetailView';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ResponsiveContainer } from '../../src/components/ui/ResponsiveContainer';
import { MetricType, MetricEntry } from '../../src/types';
import { formatMetricValue } from '../../src/utils/formatters';
import { useBreakpoint } from '../../src/utils/responsive';

type ExpandedMetric = MetricType | null;

function getTrend(entries: MetricEntry[], metricType: MetricType): 'up' | 'down' | 'stable' | null {
  const sorted = [...entries]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (sorted.length < 2) return null;

  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];

  let lastVal: number | undefined;
  let prevVal: number | undefined;

  if (metricType === 'blood_pressure') {
    lastVal = last.systolic;
    prevVal = prev.systolic;
  } else {
    lastVal = last.value;
    prevVal = prev.value;
  }

  if (lastVal === undefined || prevVal === undefined) return null;
  if (lastVal > prevVal) return 'up';
  if (lastVal < prevVal) return 'down';
  return 'stable';
}

export default function DashboardScreen() {
  const { entries, loadEntries, getEntriesByType } = useMetricsStore();
  const [expanded, setExpanded] = useState<ExpandedMetric>(null);
  const [refreshing, setRefreshing] = useState(false);
  const breakpoint = useBreakpoint();

  useEffect(() => {
    loadEntries();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  }, []);

  const bpEntries = getEntriesByType('blood_pressure');
  const bsEntries = getEntriesByType('blood_sugar');
  const wEntries = getEntriesByType('weight');

  const latestBP = bpEntries[0];
  const latestBS = bsEntries[0];
  const latestW = wEntries[0];

  // For the weight card: append the most recent body fat % if any weight entry has it.
  const latestWWithBF = wEntries.find((e) => e.body_fat != null);

  const weightCardValue = latestW
    ? (() => {
        const base = `${latestW.value ?? '—'} ${latestW.unit ?? 'kg'}`;
        return latestWWithBF ? `${base} · ${latestWWithBF.body_fat}% BF` : base;
      })()
    : '—';

  const hasAnyData = entries.length > 0;

  // Columns: mobile = 1, tablet = 2, desktop = 2 (2x2 grid)
  const columns = breakpoint === 'mobile' ? 1 : 2;
  const isGrid = columns > 1;
  const cardWidth = isGrid ? `${100 / columns}%` as const : '100%' as const;

  const cards: Array<{ type: MetricType; node: React.ReactNode }> = [
    {
      type: 'blood_pressure',
      node: (
        <MetricCard
          metricType="blood_pressure"
          currentValue={latestBP ? formatMetricValue(latestBP) : '—'}
          trend={getTrend(bpEntries, 'blood_pressure')}
          onPress={() => setExpanded('blood_pressure')}
        >
          <BloodPressureChart entries={bpEntries} sparkline />
        </MetricCard>
      ),
    },
    {
      type: 'blood_sugar',
      node: (
        <MetricCard
          metricType="blood_sugar"
          currentValue={latestBS ? formatMetricValue(latestBS) : '—'}
          trend={getTrend(bsEntries, 'blood_sugar')}
          onPress={() => setExpanded('blood_sugar')}
        >
          <BloodSugarChart entries={bsEntries} sparkline />
        </MetricCard>
      ),
    },
    {
      type: 'weight',
      node: (
        <MetricCard
          metricType="weight"
          currentValue={weightCardValue}
          trend={getTrend(wEntries, 'weight')}
          onPress={() => setExpanded('weight')}
        >
          <WeightChart entries={wEntries} sparkline />
        </MetricCard>
      ),
    },
  ];

  const MetricModal = ({ type }: { type: MetricType }) => {
    const typeEntries = getEntriesByType(type);
    return (
      <Modal
        visible={expanded === type}
        animationType="slide"
        onRequestClose={() => setExpanded(null)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {type === 'blood_pressure' ? 'Blood Pressure' :
               type === 'blood_sugar' ? 'Blood Sugar' : 'Weight'}
            </Text>
            <TouchableOpacity onPress={() => setExpanded(null)}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <MetricDetailView entries={typeEntries} metricType={type} />
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        <ResponsiveContainer>
          <Text style={styles.heading}>Last 30 Days</Text>

          {!hasAnyData ? (
            <EmptyState
              title="No readings yet"
              message="Tap the Log tab to add your first health reading."
              icon="heart-outline"
            />
          ) : isGrid ? (
            <View style={styles.grid}>
              {cards.map((c) => (
                <View key={c.type} style={[styles.gridItem, { width: cardWidth }]}>
                  {c.node}
                </View>
              ))}
            </View>
          ) : (
            <>{cards.map((c) => <View key={c.type}>{c.node}</View>)}</>
          )}
        </ResponsiveContainer>
      </ScrollView>

      {/* Expanded metric modals */}
      <MetricModal type="blood_pressure" />
      <MetricModal type="blood_sugar" />
      <MetricModal type="weight" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  heading: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItem: {
    paddingHorizontal: 6,
  },
  modal: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 20,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#F9FAFB',
    fontSize: 22,
    fontWeight: '700',
  },
});
