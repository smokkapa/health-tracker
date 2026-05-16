import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { MetricEntry } from '../../types';

interface BloodPressureChartProps {
  entries: MetricEntry[];
  sparkline?: boolean;
}

const SYS_COLOR = '#EF4444';
const DIA_COLOR = '#F97316';
const AXIS_COLOR = '#374151';

export function BloodPressureChart({ entries, sparkline = false }: BloodPressureChartProps) {
  const [width, setWidth] = useState(0);
  const height = sparkline ? 60 : 200;

  const sorted = [...entries]
    .filter((e) => e.systolic != null && e.diastolic != null)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-30);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (sorted.length === 0) {
    return (
      <View style={[styles.empty, { height }]} onLayout={onLayout}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  if (width === 0) {
    return <View style={{ height }} onLayout={onLayout} />;
  }

  const padX = 4;
  const padY = sparkline ? 6 : 12;
  const innerW = Math.max(1, width - padX * 2);
  const innerH = Math.max(1, height - padY * 2);

  const sys = sorted.map((e) => e.systolic!);
  const dia = sorted.map((e) => e.diastolic!);
  const allVals = [...sys, ...dia];
  let minV = Math.min(...allVals);
  let maxV = Math.max(...allVals);
  if (minV === maxV) {
    minV -= 1;
    maxV += 1;
  }
  const range = maxV - minV;
  const pad = range * 0.1;
  minV -= pad;
  maxV += pad;
  const span = maxV - minV;

  const n = sorted.length;
  const x = (i: number) => padX + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padY + innerH - ((v - minV) / span) * innerH;

  const sysPoints = sorted.map((_, i) => `${x(i)},${y(sys[i])}`).join(' ');
  const diaPoints = sorted.map((_, i) => `${x(i)},${y(dia[i])}`).join(' ');

  const lastIdx = n - 1;

  return (
    <View style={{ height }} onLayout={onLayout}>
      <Svg width={width} height={height}>
        <Line
          x1={padX}
          y1={height - padY}
          x2={width - padX}
          y2={height - padY}
          stroke={AXIS_COLOR}
          strokeWidth={1}
        />
        <Polyline points={sysPoints} fill="none" stroke={SYS_COLOR} strokeWidth={2} />
        <Polyline points={diaPoints} fill="none" stroke={DIA_COLOR} strokeWidth={2} />
        <Circle cx={x(lastIdx)} cy={y(sys[lastIdx])} r={3} fill={SYS_COLOR} />
        <Circle cx={x(lastIdx)} cy={y(dia[lastIdx])} r={3} fill={DIA_COLOR} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#4B5563',
    fontSize: 12,
  },
});
