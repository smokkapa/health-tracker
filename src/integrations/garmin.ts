/**
 * Garmin Health API Integration (STUB)
 *
 * This integration is not yet implemented. To implement it you will need:
 *
 * 1. **Garmin Health API OAuth credentials**
 *    - Register your app at https://developer.garmin.com/health-api/
 *    - Obtain a GARMIN_CLIENT_ID and GARMIN_CLIENT_SECRET
 *    - Set GARMIN_CLIENT_ID in your .env / app.config.js extra config
 *
 * 2. **expo-auth-session for OAuth flow**
 *    - Install: npx expo install expo-auth-session expo-web-browser
 *    - Implement OAuth 1.0a flow (Garmin uses OAuth 1.0a, not 2.0)
 *    - Store tokens securely using expo-secure-store
 *
 * 3. **Webhook endpoint for push updates (requires backend)**
 *    - Garmin pushes health data via webhooks, not polling
 *    - You need a backend server to receive webhook callbacks
 *    - Options: Supabase Edge Functions, AWS Lambda, or similar
 *    - The backend should store incoming data and expose an API for the app to pull
 *
 * 4. **Data mapping**
 *    - Map Garmin "dailies" (steps, calories, etc.) to MetricEntry format
 *    - Map Garmin "bloodPressures" summaries to blood_pressure entries
 *    - Map Garmin "bloodGlucoses" to blood_sugar entries
 */

import { IntegrationAdapter } from './index';
import { MetricEntry } from '../types';
import { integrationRegistry } from './index';

export class GarminIntegrationAdapter implements IntegrationAdapter {
  name = 'Garmin';

  async isAvailable(): Promise<boolean> {
    // Only available when credentials are configured
    return false;
  }

  async connect(): Promise<void> {
    throw new Error(
      'Garmin integration not yet implemented. See src/integrations/garmin.ts for setup instructions.'
    );
  }

  async disconnect(): Promise<void> {
    throw new Error(
      'Garmin integration not yet implemented. See src/integrations/garmin.ts for setup instructions.'
    );
  }

  async syncMetrics(_since?: Date): Promise<MetricEntry[]> {
    throw new Error(
      'Garmin integration not yet implemented. See src/integrations/garmin.ts for setup instructions.'
    );
  }
}

// Only register if GARMIN_CLIENT_ID env var is present
// In Expo, access via Constants.expoConfig?.extra?.garminClientId
const garminClientId =
  typeof process !== 'undefined' ? process.env.GARMIN_CLIENT_ID : undefined;

if (garminClientId) {
  integrationRegistry.push(new GarminIntegrationAdapter());
}
