export type MetricType = 'blood_pressure' | 'blood_sugar' | 'weight';

export type DataSource = 'manual' | 'garmin' | 'apple_health' | 'google_fit';

export interface MetricEntry {
  id: string;
  metric_type: MetricType;
  timestamp: string; // ISO 8601
  source: DataSource;
  // Blood pressure
  systolic?: number;
  diastolic?: number;
  // Single-value metrics
  value?: number;
  // Blood pressure pulse (bpm)
  pulse?: number;
  // Weight: optional body fat percentage
  body_fat?: number;
  // Blood sugar
  fasting?: boolean;
  // Units
  unit?: string;
  notes?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface HealthProfile {
  userId: string;
  dateOfBirth?: string;
  sex?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  heightCm?: number;
  conditions?: string;
  medications?: string;
  familyHistory?: string;
  allergies?: string;
  genetics?: string;
  notes?: string;
  updatedAt?: string;
}
