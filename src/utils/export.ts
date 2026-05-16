import { Platform } from 'react-native';
import { MetricEntry } from '../types';
import { formatDate, formatTime } from './formatters';

function escapeCsvField(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '';
  const s = typeof val === 'boolean' ? (val ? 'true' : 'false') : String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function generateCsv(entries: MetricEntry[]): string {
  const headers = [
    'date',
    'time',
    'metric_type',
    'systolic',
    'diastolic',
    'pulse',
    'value',
    'body_fat',
    'unit',
    'fasting',
    'source',
    'notes',
  ];

  const rows = entries.map((e) => [
    escapeCsvField(formatDate(e.timestamp)),
    escapeCsvField(formatTime(e.timestamp)),
    escapeCsvField(e.metric_type),
    escapeCsvField(e.systolic),
    escapeCsvField(e.diastolic),
    escapeCsvField(e.pulse),
    escapeCsvField(e.value),
    escapeCsvField(e.body_fat),
    escapeCsvField(e.unit),
    escapeCsvField(e.fasting),
    escapeCsvField(e.source),
    escapeCsvField(e.notes),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export async function exportAndShare(entries: MetricEntry[]): Promise<void> {
  const csv = generateCsv(entries);
  const filename = `health_export_${new Date().toISOString().slice(0, 10)}.csv`;

  if (Platform.OS === 'web') {
    // Browser download via Blob + anchor click
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // Native: write to cache + share sheet
  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');

  const file = new File(Paths.cache, filename);
  file.write(csv);

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Health Data',
    UTI: 'public.comma-separated-values-text',
  });
}
