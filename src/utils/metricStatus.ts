// Status classification helpers for health metrics.
// Pure functions — no React or platform deps so they're easy to test.

export type BPStatus = 'normal' | 'elevated' | 'stage1' | 'stage2';
export type SugarStatus = 'normal' | 'elevated' | 'high';
export type BodyFatStatus = 'essential' | 'athlete' | 'fitness' | 'average' | 'obese';
export type AnyStatus = BPStatus | SugarStatus | BodyFatStatus | 'neutral';

// AHA blood pressure categories. Use the worst of (systolic, diastolic).
export function classifyBP(systolic: number, diastolic: number): BPStatus {
  if (systolic >= 140 || diastolic >= 90) return 'stage2';
  if (systolic >= 130 || diastolic >= 80) return 'stage1';
  if (systolic >= 120) return 'elevated';
  return 'normal';
}

// Blood sugar uses different thresholds for fasting vs post-meal.
export function classifySugar(value: number, fasting: boolean): SugarStatus {
  if (fasting) {
    if (value >= 126) return 'high';
    if (value >= 100) return 'elevated';
    return 'normal';
  }
  if (value >= 200) return 'high';
  if (value >= 140) return 'elevated';
  return 'normal';
}

export function classifyBodyFat(value: number): BodyFatStatus {
  if (value < 10) return 'essential';
  if (value < 14) return 'athlete';
  if (value < 20) return 'fitness';
  if (value < 28) return 'average';
  return 'obese';
}

export function statusColor(status: AnyStatus): string {
  switch (status) {
    case 'normal':
    case 'fitness':
      return '#10B981'; // green
    case 'elevated':
    case 'athlete':
      return '#F59E0B'; // yellow/amber
    case 'stage1':
    case 'average':
      return '#F97316'; // orange
    case 'stage2':
    case 'high':
    case 'obese':
      return '#EF4444'; // red
    case 'essential':
      return '#3B82F6'; // blue (low/essential)
    case 'neutral':
    default:
      return '#9CA3AF';
  }
}

export function statusLabel(status: AnyStatus): string {
  switch (status) {
    case 'normal': return 'Normal';
    case 'elevated': return 'Elevated';
    case 'stage1': return 'Stage 1';
    case 'stage2': return 'Stage 2';
    case 'high': return 'High';
    case 'essential': return 'Essential';
    case 'athlete': return 'Athlete';
    case 'fitness': return 'Fitness';
    case 'average': return 'Average';
    case 'obese': return 'Obese';
    case 'neutral':
    default:
      return '—';
  }
}
