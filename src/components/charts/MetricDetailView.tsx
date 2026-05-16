import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutChangeEvent,
  FlatList,
  ListRenderItem,
  PanResponder,
  PanResponderInstance,
  GestureResponderEvent,
  Platform,
} from 'react-native';
import Svg, { Polyline, Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { MetricEntry, MetricType } from '../../types';
import { formatDate, formatTime } from '../../utils/formatters';
import {
  classifyBP,
  classifySugar,
  classifyBodyFat,
  statusColor,
  statusLabel,
  AnyStatus,
} from '../../utils/metricStatus';

interface MetricDetailViewProps {
  entries: MetricEntry[];
  metricType: MetricType;
}

interface LegendItem {
  status: AnyStatus;
  range: string;
}

function legendItemsFor(metricType: MetricType): LegendItem[] {
  switch (metricType) {
    case 'blood_pressure':
      return [
        { status: 'normal', range: '< 120 / 80' },
        { status: 'elevated', range: '120–129 / < 80' },
        { status: 'stage1', range: '130–139 / 80–89' },
        { status: 'stage2', range: '≥ 140 / ≥ 90' },
      ];
    case 'blood_sugar':
      return [
        { status: 'normal', range: '< 100 fasting · < 140 post' },
        { status: 'elevated', range: '100–125 fasting · 140–199 post' },
        { status: 'high', range: '≥ 126 fasting · ≥ 200 post' },
      ];
    case 'weight':
      return [];
  }
}

const BODY_FAT_LEGEND: LegendItem[] = [
  { status: 'essential', range: '< 10%' },
  { status: 'athlete', range: '10–14%' },
  { status: 'fitness', range: '14–20%' },
  { status: 'average', range: '20–28%' },
  { status: 'obese', range: '≥ 28%' },
];

function ChartLegend({ metricType }: { metricType: MetricType }) {
  const items = legendItemsFor(metricType);
  if (items.length === 0) return null;
  return (
    <View style={legendStyles.row}>
      {items.map((item) => {
        const color = statusColor(item.status);
        return (
          <View key={item.status} style={legendStyles.item}>
            <View style={[legendStyles.dot, { backgroundColor: color }]} />
            <View>
              <Text style={legendStyles.label}>{statusLabel(item.status)}</Text>
              <Text style={legendStyles.range}>{item.range}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const legendStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  label: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  range: {
    color: '#9CA3AF',
    fontSize: 11,
    lineHeight: 14,
  },
});

const AXIS_COLOR = '#374151';
const GRID_COLOR = '#1F2937';
const TEXT_MUTED = '#9CA3AF';
const TEXT_PRIMARY = '#F9FAFB';
const NEUTRAL_LINE = '#3B82F6';
const SYS_COLOR = '#EF4444';
const DIA_COLOR = '#F97316';
const NORMAL_BAND_COLOR = 'rgba(16, 185, 129, 0.12)';

// Brush overview band styling
const OVERVIEW_HEIGHT = 50;
const OVERVIEW_PAD_LEFT = 8;
const OVERVIEW_PAD_RIGHT = 8;
const HANDLE_WIDTH = 8;
const WINDOW_FILL = 'rgba(59, 130, 246, 0.18)';
const WINDOW_STROKE = '#3B82F6';
const HANDLE_FILL = '#3B82F6';
const OUTSIDE_FILL = 'rgba(17, 24, 39, 0.55)';
const OVERVIEW_LINE = '#6B7280';

function statusFor(entry: MetricEntry, metricType: MetricType): AnyStatus {
  if (metricType === 'blood_pressure') {
    if (entry.systolic == null || entry.diastolic == null) return 'neutral';
    return classifyBP(entry.systolic, entry.diastolic);
  }
  if (metricType === 'blood_sugar') {
    if (entry.value == null) return 'neutral';
    return classifySugar(entry.value, !!entry.fasting);
  }
  return 'neutral';
}

function valueDisplay(entry: MetricEntry, metricType: MetricType): string {
  switch (metricType) {
    case 'blood_pressure':
      return `${entry.systolic ?? '—'}/${entry.diastolic ?? '—'} mmHg`;
    case 'blood_sugar':
      return `${entry.value ?? '—'} ${entry.unit ?? 'mg/dL'}`;
    case 'weight': {
      const base = `${entry.value ?? '—'} ${entry.unit ?? 'kg'}`;
      return entry.body_fat != null ? `${base} · ${entry.body_fat}% BF` : base;
    }
  }
}

function formatTick(value: number, metricType: MetricType): string {
  if (metricType === 'weight') return value.toFixed(1);
  return String(Math.round(value));
}

function normalBand(metricType: MetricType): { lo: number; hi: number } | null {
  switch (metricType) {
    case 'blood_pressure':
      return { lo: 0, hi: 120 };
    case 'blood_sugar':
      return { lo: 70, hi: 100 };
    case 'weight':
    default:
      return null;
  }
}

function Chart({
  entries,
  metricType,
  width,
}: {
  entries: MetricEntry[];
  metricType: MetricType;
  width: number;
}) {
  const height = 240;
  const padLeft = 56;
  const padRight = 16;
  const padTop = 14;
  const padBottom = 36;
  const innerW = Math.max(1, width - padLeft - padRight);
  const innerH = Math.max(1, height - padTop - padBottom);

  const isBP = metricType === 'blood_pressure';

  const primaryVals: number[] = [];
  const secondaryVals: number[] = [];
  for (const e of entries) {
    if (isBP) {
      if (e.systolic != null) primaryVals.push(e.systolic);
      if (e.diastolic != null) secondaryVals.push(e.diastolic);
    } else if (e.value != null) {
      primaryVals.push(e.value);
    }
  }
  const all = isBP ? [...primaryVals, ...secondaryVals] : primaryVals;

  let minV = Math.min(...all);
  let maxV = Math.max(...all);
  if (!isFinite(minV) || !isFinite(maxV)) {
    minV = 0;
    maxV = 1;
  }
  if (minV === maxV) {
    minV -= 1;
    maxV += 1;
  }

  const band = normalBand(metricType);
  if (band) {
    minV = Math.min(minV, band.lo);
    maxV = Math.max(maxV, band.hi);
  }
  const range = maxV - minV;
  const pad = range * 0.1;
  minV -= pad;
  maxV += pad;
  const span = maxV - minV;

  const n = entries.length;
  const xAt = (i: number) =>
    padLeft + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => padTop + innerH - ((v - minV) / span) * innerH;

  const tickCount = 5;
  const ticks: number[] = [];
  for (let i = 0; i < tickCount; i++) {
    ticks.push(minV + (span * i) / (tickCount - 1));
  }

  const xLabelCount = Math.min(4, n);
  const xLabelIndices: number[] = [];
  if (n === 1) {
    xLabelIndices.push(0);
  } else {
    for (let i = 0; i < xLabelCount; i++) {
      xLabelIndices.push(Math.round((i / (xLabelCount - 1)) * (n - 1)));
    }
  }

  const primaryPoints = entries
    .map((e, i) => {
      const v = isBP ? e.systolic : e.value;
      if (v == null) return null;
      return `${xAt(i)},${yAt(v)}`;
    })
    .filter((p): p is string => p !== null)
    .join(' ');

  const secondaryPoints = isBP
    ? entries
        .map((e, i) => (e.diastolic != null ? `${xAt(i)},${yAt(e.diastolic)}` : null))
        .filter((p): p is string => p !== null)
        .join(' ')
    : '';

  let bandRect: { x: number; y: number; w: number; h: number } | null = null;
  if (band) {
    const yHi = yAt(band.hi);
    const yLo = yAt(band.lo);
    const top = Math.min(yHi, yLo);
    const bottom = Math.max(yHi, yLo);
    bandRect = {
      x: padLeft,
      y: Math.max(padTop, top),
      w: innerW,
      h: Math.max(0, Math.min(padTop + innerH, bottom) - Math.max(padTop, top)),
    };
  }

  return (
    <Svg width={width} height={height}>
      {bandRect && bandRect.h > 0 && (
        <Rect
          x={bandRect.x}
          y={bandRect.y}
          width={bandRect.w}
          height={bandRect.h}
          fill={NORMAL_BAND_COLOR}
        />
      )}

      {ticks.map((t, i) => {
        const y = yAt(t);
        return (
          <React.Fragment key={`tick-${i}`}>
            <Line
              x1={padLeft}
              y1={y}
              x2={padLeft + innerW}
              y2={y}
              stroke={GRID_COLOR}
              strokeWidth={1}
            />
            <SvgText
              x={padLeft - 6}
              y={y + 5}
              fontSize={14}
              fontWeight="500"
              fill={TEXT_MUTED}
              textAnchor="end"
            >
              {formatTick(t, metricType)}
            </SvgText>
          </React.Fragment>
        );
      })}

      <Line
        x1={padLeft}
        y1={padTop + innerH}
        x2={padLeft + innerW}
        y2={padTop + innerH}
        stroke={AXIS_COLOR}
        strokeWidth={1}
      />

      {primaryPoints !== '' && (
        <Polyline
          points={primaryPoints}
          fill="none"
          stroke={isBP ? SYS_COLOR : NEUTRAL_LINE}
          strokeWidth={1.5}
          opacity={0.6}
        />
      )}
      {isBP && secondaryPoints !== '' && (
        <Polyline
          points={secondaryPoints}
          fill="none"
          stroke={DIA_COLOR}
          strokeWidth={1.5}
          opacity={0.6}
        />
      )}

      {entries.map((e, i) => {
        const v = isBP ? e.systolic : e.value;
        if (v == null) return null;
        const s = statusFor(e, metricType);
        const c = statusColor(s);
        return (
          <Circle
            key={`pt-${i}`}
            cx={xAt(i)}
            cy={yAt(v)}
            r={2.5}
            fill={c}
            stroke="#111827"
            strokeWidth={0.5}
          />
        );
      })}
      {isBP &&
        entries.map((e, i) =>
          e.diastolic != null ? (
            <Circle
              key={`dia-${i}`}
              cx={xAt(i)}
              cy={yAt(e.diastolic)}
              r={1.8}
              fill={DIA_COLOR}
              opacity={0.7}
            />
          ) : null
        )}

      {xLabelIndices.map((idx, i) => {
        const e = entries[idx];
        if (!e) return null;
        const x = xAt(idx);
        const anchor: 'start' | 'middle' | 'end' =
          i === 0 ? 'start' : i === xLabelIndices.length - 1 ? 'end' : 'middle';
        return (
          <SvgText
            key={`xl-${i}`}
            x={x}
            y={padTop + innerH + 20}
            fontSize={14}
            fontWeight="500"
            fill={TEXT_MUTED}
            textAnchor={anchor}
          >
            {formatDate(e.timestamp)}
          </SvgText>
        );
      })}
    </Svg>
  );
}

// Secondary chart used for weight body-fat overlay.
function BodyFatSubChart({
  entries,
  width,
}: {
  entries: MetricEntry[]; // ascending; only those whose containing weight entry had body_fat are passed in
  width: number;
}) {
  const height = 140;
  const padLeft = 56;
  const padRight = 16;
  const padTop = 14;
  const padBottom = 28;
  const innerW = Math.max(1, width - padLeft - padRight);
  const innerH = Math.max(1, height - padTop - padBottom);

  // We render across the same x-domain as the parent weight chart: index over the
  // full ascending weight slice. Entries here have body_fat != null already, but
  // we receive the full slice plus their indices for X alignment.
  const n = entries.length;
  const vals: number[] = entries
    .map((e) => e.body_fat)
    .filter((v): v is number => v != null);

  let minV = Math.min(...vals);
  let maxV = Math.max(...vals);
  if (!isFinite(minV) || !isFinite(maxV)) {
    minV = 0;
    maxV = 1;
  }
  if (minV === maxV) {
    minV -= 1;
    maxV += 1;
  }
  const range = maxV - minV;
  const pad = range * 0.1;
  minV -= pad;
  maxV += pad;
  const span = maxV - minV;

  const xAt = (i: number) =>
    padLeft + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => padTop + innerH - ((v - minV) / span) * innerH;

  const tickCount = 4;
  const ticks: number[] = [];
  for (let i = 0; i < tickCount; i++) {
    ticks.push(minV + (span * i) / (tickCount - 1));
  }

  const xLabelCount = Math.min(4, n);
  const xLabelIndices: number[] = [];
  if (n === 1) {
    xLabelIndices.push(0);
  } else {
    for (let i = 0; i < xLabelCount; i++) {
      xLabelIndices.push(Math.round((i / (xLabelCount - 1)) * (n - 1)));
    }
  }

  const linePoints = entries
    .map((e, i) => (e.body_fat != null ? `${xAt(i)},${yAt(e.body_fat)}` : null))
    .filter((p): p is string => p !== null)
    .join(' ');

  const BF_LINE_COLOR = '#A855F7';

  return (
    <Svg width={width} height={height}>
      {ticks.map((t, i) => {
        const y = yAt(t);
        return (
          <React.Fragment key={`bf-tick-${i}`}>
            <Line
              x1={padLeft}
              y1={y}
              x2={padLeft + innerW}
              y2={y}
              stroke={GRID_COLOR}
              strokeWidth={1}
            />
            <SvgText
              x={padLeft - 6}
              y={y + 5}
              fontSize={12}
              fontWeight="500"
              fill={TEXT_MUTED}
              textAnchor="end"
            >
              {t.toFixed(1)}
            </SvgText>
          </React.Fragment>
        );
      })}
      <Line
        x1={padLeft}
        y1={padTop + innerH}
        x2={padLeft + innerW}
        y2={padTop + innerH}
        stroke={AXIS_COLOR}
        strokeWidth={1}
      />
      {linePoints !== '' && (
        <Polyline
          points={linePoints}
          fill="none"
          stroke={BF_LINE_COLOR}
          strokeWidth={1.5}
          opacity={0.6}
        />
      )}
      {entries.map((e, i) => {
        if (e.body_fat == null) return null;
        const s = classifyBodyFat(e.body_fat);
        const c = statusColor(s);
        return (
          <Circle
            key={`bf-pt-${i}`}
            cx={xAt(i)}
            cy={yAt(e.body_fat)}
            r={2.5}
            fill={c}
            stroke="#111827"
            strokeWidth={0.5}
          />
        );
      })}
      {xLabelIndices.map((idx, i) => {
        const e = entries[idx];
        if (!e) return null;
        const x = xAt(idx);
        const anchor: 'start' | 'middle' | 'end' =
          i === 0 ? 'start' : i === xLabelIndices.length - 1 ? 'end' : 'middle';
        return (
          <SvgText
            key={`bf-xl-${i}`}
            x={x}
            y={padTop + innerH + 18}
            fontSize={12}
            fontWeight="500"
            fill={TEXT_MUTED}
            textAnchor={anchor}
          >
            {formatDate(e.timestamp)}
          </SvgText>
        );
      })}
    </Svg>
  );
}

// Overview sparkline + brush window.
function OverviewBrush({
  entries,
  metricType,
  width,
  startIdx,
  endIdx,
  onWindowChange,
}: {
  entries: MetricEntry[]; // ascending, full set
  metricType: MetricType;
  width: number;
  startIdx: number;
  endIdx: number; // exclusive
  onWindowChange: (start: number, end: number) => void;
}) {
  const isBP = metricType === 'blood_pressure';
  const innerW = Math.max(1, width - OVERVIEW_PAD_LEFT - OVERVIEW_PAD_RIGHT);
  const innerH = OVERVIEW_HEIGHT - 4;

  const n = entries.length;

  // Y-scale for sparkline
  const vals: number[] = [];
  for (const e of entries) {
    const v = isBP ? e.systolic : e.value;
    if (v != null) vals.push(v);
  }
  let minV = Math.min(...vals);
  let maxV = Math.max(...vals);
  if (!isFinite(minV) || !isFinite(maxV)) {
    minV = 0;
    maxV = 1;
  }
  if (minV === maxV) {
    minV -= 1;
    maxV += 1;
  }
  const span = maxV - minV;

  const xAt = (i: number) =>
    OVERVIEW_PAD_LEFT + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v: number) => 2 + innerH - ((v - minV) / span) * innerH;

  const points = entries
    .map((e, i) => {
      const v = isBP ? e.systolic : e.value;
      if (v == null) return null;
      return `${xAt(i)},${yAt(v)}`;
    })
    .filter((p): p is string => p !== null)
    .join(' ');

  // Map index <-> pixel. Use a "slot" per entry so window can cover [0, n].
  const slotW = innerW / Math.max(1, n);
  const idxToX = (idx: number) => OVERVIEW_PAD_LEFT + idx * slotW;
  const xToIdx = (x: number) => (x - OVERVIEW_PAD_LEFT) / slotW;

  const winX = idxToX(startIdx);
  const winRight = idxToX(endIdx);
  const winW = Math.max(2, winRight - winX);

  // Refs for live drag state (avoid stale closures, smoother handling)
  const dragRef = useRef<{
    mode: 'body' | 'left' | 'right' | null;
    startX: number;
    origStart: number;
    origEnd: number;
  }>({ mode: null, startX: 0, origStart: startIdx, origEnd: endIdx });

  // Keep latest props accessible inside PanResponder closures
  const latest = useRef({ startIdx, endIdx, n, slotW });
  latest.current = { startIdx, endIdx, n, slotW };

  const pickMode = (touchX: number): 'body' | 'left' | 'right' | null => {
    const lx = idxToX(latest.current.startIdx);
    const rx = idxToX(latest.current.endIdx);
    if (touchX >= lx - HANDLE_WIDTH / 2 && touchX <= lx + HANDLE_WIDTH / 2) return 'left';
    if (touchX >= rx - HANDLE_WIDTH / 2 && touchX <= rx + HANDLE_WIDTH / 2) return 'right';
    if (touchX > lx && touchX < rx) return 'body';
    return null;
  };

  const panResponder = useRef<PanResponderInstance | null>(null);
  if (panResponder.current === null) {
    panResponder.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const touchX = evt.nativeEvent.locationX;
        const mode = pickMode(touchX);
        if (mode === null) {
          // Tapped outside window: jump-center window on tap point (keep size).
          const size = latest.current.endIdx - latest.current.startIdx;
          const centerIdx = xToIdx(touchX);
          let s = Math.round(centerIdx - size / 2);
          let e = s + size;
          if (s < 0) {
            s = 0;
            e = size;
          }
          if (e > latest.current.n) {
            e = latest.current.n;
            s = e - size;
          }
          dragRef.current = { mode: 'body', startX: touchX, origStart: s, origEnd: e };
          onWindowChange(s, e);
        } else {
          dragRef.current = {
            mode,
            startX: touchX,
            origStart: latest.current.startIdx,
            origEnd: latest.current.endIdx,
          };
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const { mode, origStart, origEnd } = dragRef.current;
        if (!mode) return;
        const dxPx = gestureState.dx;
        const dIdx = dxPx / latest.current.slotW;
        const total = latest.current.n;
        if (mode === 'body') {
          const size = origEnd - origStart;
          let s = Math.round(origStart + dIdx);
          if (s < 0) s = 0;
          if (s + size > total) s = total - size;
          const e = s + size;
          if (s !== latest.current.startIdx || e !== latest.current.endIdx) {
            onWindowChange(s, e);
          }
        } else if (mode === 'left') {
          let s = Math.round(origStart + dIdx);
          if (s < 0) s = 0;
          if (s > origEnd - 1) s = origEnd - 1;
          if (s !== latest.current.startIdx) {
            onWindowChange(s, origEnd);
          }
        } else if (mode === 'right') {
          let e = Math.round(origEnd + dIdx);
          if (e > total) e = total;
          if (e < origStart + 1) e = origStart + 1;
          if (e !== latest.current.endIdx) {
            onWindowChange(origStart, e);
          }
        }
      },
      onPanResponderRelease: () => {
        dragRef.current.mode = null;
      },
      onPanResponderTerminate: () => {
        dragRef.current.mode = null;
      },
    });
  }

  const handlers = panResponder.current.panHandlers;

  return (
    <View
      style={[
        styles.overviewWrap,
        { width, height: OVERVIEW_HEIGHT },
        Platform.OS === 'web'
          ? ({ cursor: 'grab', touchAction: 'none', userSelect: 'none' } as object)
          : null,
      ]}
      {...handlers}
    >
      <Svg width={width} height={OVERVIEW_HEIGHT}>
        {/* Background */}
        <Rect
          x={0}
          y={0}
          width={width}
          height={OVERVIEW_HEIGHT}
          fill="#0B1220"
        />
        {/* Sparkline */}
        {points !== '' && (
          <Polyline
            points={points}
            fill="none"
            stroke={OVERVIEW_LINE}
            strokeWidth={1}
            opacity={0.9}
          />
        )}
        {/* Outside-window shading */}
        <Rect x={0} y={0} width={winX} height={OVERVIEW_HEIGHT} fill={OUTSIDE_FILL} />
        <Rect
          x={winX + winW}
          y={0}
          width={Math.max(0, width - (winX + winW))}
          height={OVERVIEW_HEIGHT}
          fill={OUTSIDE_FILL}
        />
        {/* Window rectangle */}
        <Rect
          x={winX}
          y={0}
          width={winW}
          height={OVERVIEW_HEIGHT}
          fill={WINDOW_FILL}
          stroke={WINDOW_STROKE}
          strokeWidth={1}
        />
        {/* Left handle */}
        <Rect
          x={winX - HANDLE_WIDTH / 2}
          y={0}
          width={HANDLE_WIDTH}
          height={OVERVIEW_HEIGHT}
          fill={HANDLE_FILL}
          rx={2}
          opacity={0.9}
        />
        <Line
          x1={winX}
          y1={OVERVIEW_HEIGHT * 0.3}
          x2={winX}
          y2={OVERVIEW_HEIGHT * 0.7}
          stroke="#FFFFFF"
          strokeWidth={1}
          opacity={0.7}
        />
        {/* Right handle */}
        <Rect
          x={winX + winW - HANDLE_WIDTH / 2}
          y={0}
          width={HANDLE_WIDTH}
          height={OVERVIEW_HEIGHT}
          fill={HANDLE_FILL}
          rx={2}
          opacity={0.9}
        />
        <Line
          x1={winX + winW}
          y1={OVERVIEW_HEIGHT * 0.3}
          x2={winX + winW}
          y2={OVERVIEW_HEIGHT * 0.7}
          stroke="#FFFFFF"
          strokeWidth={1}
          opacity={0.7}
        />
      </Svg>
    </View>
  );
}

export function MetricDetailView({ entries, metricType }: MetricDetailViewProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  // Full ascending, filtered set.
  const ascendingAll = useMemo(() => {
    const filtered = entries.filter((e) => {
      if (metricType === 'blood_pressure') {
        return e.systolic != null && e.diastolic != null;
      }
      return e.value != null;
    });
    return [...filtered].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [entries, metricType]);

  const total = ascendingAll.length;

  // Default: last 30 entries (or all if fewer) anchored to the right.
  const [windowRange, setWindowRange] = useState<{ start: number; end: number }>(() => {
    const end = total;
    const start = Math.max(0, end - 30);
    return { start, end };
  });

  // If dataset size changes (entries added/removed), keep window sane.
  useEffect(() => {
    setWindowRange((prev) => {
      const end = Math.min(prev.end, total);
      const start = Math.min(prev.start, Math.max(0, end - 1));
      if (total === 0) return { start: 0, end: 0 };
      if (prev.end === 0 && total > 0) {
        const e = total;
        const s = Math.max(0, e - 30);
        return { start: s, end: e };
      }
      if (start === prev.start && end === prev.end) return prev;
      return { start: Math.max(0, start), end: Math.max(start + 1, end) };
    });
  }, [total]);

  const { start: startIdx, end: endIdx } = windowRange;

  const ascending = useMemo(
    () => ascendingAll.slice(startIdx, endIdx),
    [ascendingAll, startIdx, endIdx]
  );

  const descending = useMemo(() => [...ascending].reverse(), [ascending]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of ascending) {
      const s = statusFor(e, metricType);
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [ascending, metricType]);

  const summaryParts: string[] = [`${ascending.length} readings`];
  for (const key of Object.keys(summary)) {
    summaryParts.push(`${summary[key]} ${statusLabel(key as AnyStatus).toLowerCase()}`);
  }

  const renderItem: ListRenderItem<MetricEntry> = ({ item }) => {
    const s = statusFor(item, metricType);
    const color = statusColor(s);
    const label = statusLabel(s);

    // Build tag chips: fasting, pulse, source (if not manual)
    const tags: { text: string; tone?: 'info' | 'muted' }[] = [];
    if (metricType === 'blood_sugar' && item.fasting != null) {
      tags.push({ text: item.fasting ? 'Fasting' : 'Post-meal', tone: 'info' });
    }
    if (metricType === 'blood_pressure' && item.pulse != null) {
      tags.push({ text: `${item.pulse} bpm`, tone: 'muted' });
    }
    if (item.source && item.source !== 'manual') {
      tags.push({ text: item.source, tone: 'info' });
    }

    return (
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowDate}>
              {formatDate(item.timestamp)} · {formatTime(item.timestamp)}
            </Text>
            {s !== 'neutral' && (
              <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
                <Text style={[styles.badgeText, { color }]}>{label}</Text>
              </View>
            )}
          </View>
          <Text style={styles.rowValue}>{valueDisplay(item, metricType)}</Text>
          {tags.length > 0 && (
            <View style={styles.tagRow}>
              {tags.map((t, i) => (
                <View
                  key={i}
                  style={[
                    styles.tag,
                    t.tone === 'info' && styles.tagInfo,
                  ]}
                >
                  <Text style={[styles.tagText, t.tone === 'info' && styles.tagTextInfo]}>
                    {t.text}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {item.notes ? (
            <Text style={styles.rowNotes} numberOfLines={3}>
              {item.notes}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  if (total === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No data</Text>
        </View>
      </View>
    );
  }

  const handleWindowChange = (s: number, e: number) => {
    setWindowRange((prev) => (prev.start === s && prev.end === e ? prev : { start: s, end: e }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.chartWrap} onLayout={onLayout}>
        {width > 0 && ascending.length > 0 && (
          <Chart entries={ascending} metricType={metricType} width={width} />
        )}
      </View>

      {metricType === 'weight' && width > 0 && ascending.some((e) => e.body_fat != null) && (
        <View style={styles.bfChartWrap}>
          <Text style={styles.bfChartTitle}>Body Fat %</Text>
          <BodyFatSubChart entries={ascending} width={width} />
          <View style={legendStyles.row}>
            {BODY_FAT_LEGEND.map((item) => {
              const color = statusColor(item.status);
              return (
                <View key={item.status} style={legendStyles.item}>
                  <View style={[legendStyles.dot, { backgroundColor: color }]} />
                  <View>
                    <Text style={legendStyles.label}>{statusLabel(item.status)}</Text>
                    <Text style={legendStyles.range}>{item.range}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <ChartLegend metricType={metricType} />

      <Text style={styles.summary}>{summaryParts.join(' · ')}</Text>

      <View style={styles.overviewOuter}>
        {width > 0 && (
          <OverviewBrush
            entries={ascendingAll}
            metricType={metricType}
            width={width}
            startIdx={startIdx}
            endIdx={endIdx}
            onWindowChange={handleWindowChange}
          />
        )}
      </View>

      <FlatList
        data={descending}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chartWrap: {
    width: '100%',
    height: 240,
    marginBottom: 12,
  },
  bfChartWrap: {
    width: '100%',
    marginBottom: 12,
  },
  bfChartTitle: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 4,
  },
  summary: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginBottom: 8,
  },
  overviewOuter: {
    width: '100%',
    marginBottom: 12,
  },
  overviewWrap: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  rowMain: {
    flex: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowDate: {
    color: TEXT_MUTED,
    fontSize: 13,
    flex: 1,
  },
  rowValue: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
  rowNotes: {
    color: '#9CA3AF',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#1F2937',
  },
  tagInfo: {
    backgroundColor: '#1E3A8A33',
  },
  tagText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  tagTextInfo: {
    color: '#93C5FD',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sep: {
    height: 1,
    backgroundColor: '#1F2937',
  },
  empty: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#4B5563',
    fontSize: 14,
  },
});
