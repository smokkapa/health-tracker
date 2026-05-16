import { MetricEntry, MetricType } from '../types';

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

export function formatMetricValue(entry: MetricEntry): string {
  switch (entry.metric_type) {
    case 'blood_pressure': {
      const base = `${entry.systolic ?? '—'}/${entry.diastolic ?? '—'} mmHg`;
      return entry.pulse != null ? `${base} · ${entry.pulse} bpm` : base;
    }
    case 'blood_sugar':
      return `${entry.value ?? '—'} ${entry.unit ?? 'mg/dL'}`;
    case 'weight': {
      const base = `${entry.value ?? '—'} ${entry.unit ?? 'kg'}`;
      return entry.body_fat != null ? `${base} · ${entry.body_fat}% BF` : base;
    }
    default:
      return '—';
  }
}

export function metricTypeLabel(type: MetricType): string {
  switch (type) {
    case 'blood_pressure': return 'Blood Pressure';
    case 'blood_sugar': return 'Blood Sugar';
    case 'weight': return 'Weight';
  }
}

export function metricTypeShortLabel(type: MetricType): string {
  switch (type) {
    case 'blood_pressure': return 'BP';
    case 'blood_sugar': return 'BG';
    case 'weight': return 'Wt';
  }
}

export function formatNumber(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}
