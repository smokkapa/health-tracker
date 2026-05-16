import { MetricEntry } from '../types';

export interface IntegrationAdapter {
  name: string;
  isAvailable(): Promise<boolean>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  syncMetrics(since?: Date): Promise<MetricEntry[]>;
}

export const integrationRegistry: IntegrationAdapter[] = [];

// Garmin will be registered here when implemented (when GARMIN_CLIENT_ID env var is present)
// See src/integrations/garmin.ts for details
