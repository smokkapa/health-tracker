# Developer Guide

A file-by-file map of where each feature lives. Read this before changing anything substantial — the codebase is intentionally layered so most features touch only one or two files.

## Architectural principles

1. **Storage, auth, and integrations are adapter-based.** Each one has a TypeScript interface and a single concrete implementation today (SQLite, local, Garmin stub). Swapping to Supabase or adding Apple Health means writing a new adapter, not editing screens.
2. **Components never talk to the DB.** They call the Zustand store (`useMetricsStore` / `useAuth`). The store calls the adapter. The adapter calls the queries module. This keeps every screen testable in isolation.
3. **Cross-platform first.** Anything that wouldn't work on both native and web has a `.web.tsx` Metro override (e.g. `Tooltip`) or a `Platform.OS === 'web'` branch behind a single utility (e.g. `alerts.ts`, `export.ts`, `pickXlsx.ts`).

---

## Routing & screens (`app/`)

Expo Router is file-based. Folders in parentheses are route groups (don't appear in the URL).

| File | Responsibility |
| --- | --- |
| `app/_layout.tsx` | Root layout. Wraps the tree in `AuthProvider`; `AuthGate` redirects to `/sign-in` when no user; root `Pressable` calls `touch()` on every interaction to keep the session alive. Registers the `profile` modal route. |
| `app/(auth)/_layout.tsx` | Stack for the auth screens. |
| `app/(auth)/sign-in.tsx` | Sign-in form. Defaults to this screen for everyone. Has "Forgot password?" and "Sign up" links. Surfaces a one-time "Session expired" notice when bounced from a timed-out session. |
| `app/(auth)/sign-up.tsx` | Create-account form (email + password + confirm). |
| `app/(auth)/reset-password.tsx` | Two-step local reset: enter email → if the account exists on this device, reveal new-password + confirm fields. |
| `app/(tabs)/_layout.tsx` | Tab navigator. **Responsive**: mobile/tablet shows the bottom tab bar; desktop (≥ 1024 px) swaps to the `Sidebar` and a `<Slot />`. Mobile also renders `<UserBadge />` above the tabs. |
| `app/(tabs)/index.tsx` | Dashboard. Three `MetricCard`s (BP, sugar, weight) with sparklines. Tap a card to open `MetricDetailView` in a modal. |
| `app/(tabs)/log.tsx` | Add-a-reading screen. Hosts `AddMetricForm`. |
| `app/(tabs)/history.tsx` | Scrollable list (mobile) or table (desktop) of every entry, with metric-type filter chips and a date range picker. Rows are wrapped in `<Tooltip>` for hover-rich details on web. |
| `app/(tabs)/settings.tsx` | Account info, personal health profile entry point, Excel import, CSV export, delete-all-data, sign-out, placeholders for future device integrations and cloud sync. |
| `app/profile.tsx` | Personal health profile editor (date of birth, sex, height, conditions, medications, family history, allergies, genetics, notes). Registered as a root-level modal route. |

---

## Authentication (`src/auth/`)

| File | Responsibility |
| --- | --- |
| `adapter.ts` | `AuthAdapter` and `User` interfaces. The swap point for Supabase or any future auth backend. |
| `local.ts` | `LocalAuthAdapter` — SQLite-backed user store + AsyncStorage-backed session. Implements sign-in / sign-up / reset / sign-out / `emailExists` / `getCurrentUser`. Triggers the legacy-owner data claim on sign-in or sign-up when the email matches `LEGACY_OWNER_EMAIL`. |
| `crypto.ts` | Cross-platform password hashing. Web uses `window.crypto.subtle`; native uses `expo-crypto`. Salted SHA-256, 10k iterations. Also `generateId` and `generateSalt`. |
| `session.ts` | AsyncStorage helpers for the session token: `getSession`, `setSession`, `clearSession`, `touchSession`, `isExpired`. 15-minute timeout. |
| `AuthContext.tsx` | `<AuthProvider>` + `useAuth()`. Hydrates the session on mount, runs a 30-second expiry check, exposes `signIn` / `signUp` / `signOut` / `resetPassword` / `touch`. Pushes user ID changes into `useMetricsStore.setUserId(...)` so the storage adapter is always scoped correctly. |
| `index.ts` | Re-exports the active `authAdapter` (currently `LocalAuthAdapter`). The **single point of change** for swapping to a `SupabaseAuthAdapter`. |
| `constants.ts` | `LEGACY_OWNER_EMAIL` — the email that owns historical pre-auth metric entries. |

---

## Storage layer (`src/storage/` + `src/db/`)

The DB is per-user. The adapter holds a `userId` and every query is scoped to it.

| File | Responsibility |
| --- | --- |
| `src/storage/adapter.ts` | `StorageAdapter` interface — `setUser`, `getEntries`, `addEntry`, `bulkAdd`, `deleteEntry`, `deleteAll`, `getLatestEntry`, `entryExists`. |
| `src/storage/sqlite.ts` | `SQLiteStorageAdapter` — implements the interface against expo-sqlite. Throws if `setUser` hasn't been called. Bulk insert is batched in transactions of 200. |
| `src/db/client.ts` | `getDatabase()` — opens the SQLite DB, runs `CREATE TABLE IF NOT EXISTS` statements, runs additive column migrations (`ALTER TABLE ADD COLUMN`) **before** creating indexes, then creates indexes, then runs the legacy-owner claim. |
| `src/db/schema.ts` | Table DDL + `SCHEMA_VERSION` + the list of `METRIC_ENTRIES_ADDED_COLUMNS` used for idempotent migrations. |
| `src/db/queries.ts` | All metric-entry SQL: `queryEntries`, `insertEntry`, `entryExists`, `queryLatestEntry`, `deleteEntryById`, `deleteAllForUser`, `claimOrphanedEntriesForOwner`. Every read/write takes a `userId`. |
| `src/db/profileQueries.ts` | `getProfile`, `upsertProfile`, `deleteProfile` for the per-user `health_profile` row. |

---

## State management (`src/stores/`)

| File | Responsibility |
| --- | --- |
| `src/stores/metrics.ts` | The Zustand `useMetricsStore`. Holds `entries`, `userId`, `isLoading`, `error`. `setUserId(id)` (called by `AuthContext`) clears entries on logout/user switch and reconfigures the storage adapter. All screen-level data access goes through this store. |

---

## Types (`src/types/`)

| File | Responsibility |
| --- | --- |
| `src/types/index.ts` | All shared types: `MetricType` (`'blood_pressure' \| 'blood_sugar' \| 'weight'`), `MetricEntry`, `DataSource`, `DateRange`, `HealthProfile`. |

---

## UI components (`src/components/`)

### Charts (`src/components/charts/`)

All charts are pure `react-native-svg` — no Skia, no CanvasKit, no WASM.

| File | Responsibility |
| --- | --- |
| `MetricCard.tsx` | Dashboard card shell: title, current value, trend indicator, sparkline area. Also exports `METRIC_COLORS` and `METRIC_ICONS` (shared with History). |
| `BloodPressureChart.tsx` | Sparkline mode. Two polylines (systolic red `#EF4444`, diastolic orange `#F97316`). |
| `BloodSugarChart.tsx` | Single blue polyline (`#3B82F6`). |
| `WeightChart.tsx` | Single green polyline (`#22C55E`). |
| `MetricDetailView.tsx` | The big modal view. Full chart with Y/X scale labels, gridlines, normal-range band, status-colored dots, summary line, color-coded legend (Normal / Elevated / Stage 1 / Stage 2 etc.), and a virtualised FlatList of every reading. Includes a draggable sliding-window brush below the chart for scrubbing through history. For weight entries with body fat data, renders a secondary Body Fat % sub-chart. |

### Forms (`src/components/forms/`)

| File | Responsibility |
| --- | --- |
| `AddMetricForm.tsx` | The add-reading form. Inputs change shape per metric: BP has sys/dia/optional-pulse; sugar has value + unit chips + fasting toggle; weight has value + unit chips + optional body-fat %. Timestamp is auto-set on save. |

### UI primitives (`src/components/ui/`)

| File | Responsibility |
| --- | --- |
| `EmptyState.tsx` | Centred icon + title + message — used by Dashboard and History when no data matches the current filter. |
| `DateRangePicker.tsx` | Cross-platform date range selector, used in History and Export. |
| `ResponsiveContainer.tsx` | Caps content width on wide screens with a configurable `maxWidth` and centers it. Used on every screen for clean desktop layouts. |
| `Sidebar.tsx` | Desktop sidebar nav + "Signed in as" footer with the email (truncated, with a hover tooltip on web). |
| `UserBadge.tsx` | Mobile/tablet "👤 email" strip rendered once above the tab bar. |
| `Tooltip.tsx` | Native passthrough (no hover concept on mobile). |
| `Tooltip.web.tsx` | Web override: renders an HTML `<div title="...">` so the browser shows a native hover tooltip. Metro picks `.web.tsx` automatically for web builds. |

---

## Integrations (`src/integrations/`)

Stubs ready for future implementations. Same adapter pattern as auth and storage.

| File | Responsibility |
| --- | --- |
| `index.ts` | `IntegrationAdapter` interface and the `integrationRegistry` (currently empty unless `GARMIN_CLIENT_ID` env var is set). |
| `garmin.ts` | Garmin stub. Documents the requirements (OAuth, webhook endpoint) and throws `"Not yet implemented"`. Will be filled in when device sync ships. |

---

## Utilities (`src/utils/`)

| File | Responsibility |
| --- | --- |
| `alerts.ts` | Cross-platform `notify` / `confirm` / `choose`. **Always use these** instead of `Alert.alert` — multi-button `Alert.alert` is silently broken on `react-native-web`. |
| `export.ts` | CSV generation and download. Web uses Blob + anchor; native uses `expo-file-system` + `expo-sharing` (lazy-imported so the web bundle doesn't pull in native-only modules). |
| `formatters.ts` | Date / time / metric value formatters (`formatDate`, `formatTime`, `formatMetricValue`, `metricTypeLabel`, etc.). |
| `metricStatus.ts` | Pure classifier helpers: `classifyBP`, `classifySugar`, `classifyBodyFat`, plus shared `statusColor` and `statusLabel`. All chart coloring and status badges go through these. |
| `pickXlsx.ts` | Cross-platform file picker returning `Promise<Uint8Array \| null>`. Web uses `<input type="file">` + `FileReader`; native uses `expo-document-picker`. |
| `xlsxImport.ts` | SheetJS-based parser. Auto-discovers per-person columns across the `Blood Pressure` and `sugar` sheets. Returns `{ entries, personsFound }`. Filtering on a specific person produces typed `MetricEntry`s for bulk insert. |
| `seedImport.ts` | (Legacy) loader for `assets/seed-sridhar.json`. Still present on disk but no longer wired into the UI — kept for reference / future re-enable. |
| `responsive.ts` | `useBreakpoint()`, `useIsDesktop()`. Driven by `useWindowDimensions()` so window resizing on web triggers the right layout live. |

---

## Cross-cutting concerns

### Schema migrations

When you add a column or table:

1. Update the `CREATE TABLE` DDL in `src/db/schema.ts`.
2. If it's a new column on an existing table, **also** add it to `METRIC_ENTRIES_ADDED_COLUMNS` (or the equivalent list for that table) so existing local DBs get the `ALTER TABLE ADD COLUMN` migration.
3. Bump `SCHEMA_VERSION`.
4. If the column is referenced by an index, ensure the index is created **after** `migrateMetricEntries(db)` runs in `client.ts`. (This bit us once — see the comment block in `client.ts`.)

### Adding a new metric type

1. Extend the `MetricType` union in `src/types/index.ts`.
2. Add classifier helpers (or skip if no medical range applies) in `src/utils/metricStatus.ts`.
3. Add formatter cases in `src/utils/formatters.ts`.
4. Update the dashboard card list in `app/(tabs)/index.tsx`.
5. Update the form's inputs and metric type selector in `src/components/forms/AddMetricForm.tsx`.
6. Update the chart switch in `MetricDetailView.tsx` (including `statusFor`, `valueDisplay`, `formatTick`, `normalBand`, `legendItemsFor`).
7. Add the metric to `METRIC_COLORS` and `METRIC_ICONS` in `MetricCard.tsx`.
8. Update the CSV export columns if relevant.

### Adding a new auth backend (Supabase, Auth0, etc.)

1. Create `src/auth/supabase.ts` implementing `AuthAdapter`.
2. Change `src/auth/index.ts` to export your new adapter instead of `LocalAuthAdapter`.
3. Done. No screen changes required.

### Adding a new device integration (Garmin, Apple Health, Google Fit)

1. Fill in or create `src/integrations/<vendor>.ts` implementing `IntegrationAdapter`.
2. Push synced entries through `sqliteAdapter.bulkAdd(...)` tagged with the appropriate `source` value.
3. Update `MetricEntry.source` type and the source-display logic if you're adding a new tag.

---

## Conventions

- **Style**: Tailwind-ish dark palette via inline `StyleSheet`s. Primary `#3B82F6`, surfaces `#111827` / `#1F2937` / `#374151`, text `#F9FAFB` / `#9CA3AF`, success `#10B981`, danger `#EF4444`.
- **Imports**: stay local (no path aliases configured). Components → store → adapter → queries. Never short-circuit.
- **Cross-platform code**: prefer `.web.tsx` Metro overrides over `if (Platform.OS === 'web')` branches inside shared files. Use the branches only for small one-liners (e.g. `Platform.OS === 'web' ? cursor: 'grab' : undefined`).
- **Type safety**: `npx tsc --noEmit` must pass before any commit. Run `npx expo export --platform web` if you've touched anything that could break the web build.
