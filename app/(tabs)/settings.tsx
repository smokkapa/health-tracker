import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMetricsStore } from '../../src/stores/metrics';
import { DateRangePicker } from '../../src/components/ui/DateRangePicker';
import { ResponsiveContainer } from '../../src/components/ui/ResponsiveContainer';
import { exportAndShare } from '../../src/utils/export';
import { pickXlsxFile } from '../../src/utils/pickXlsx';
import { parseXlsx } from '../../src/utils/xlsxImport';
import { sqliteAdapter } from '../../src/storage/sqlite';
import { DateRange, MetricEntry } from '../../src/types';
import { notify, confirm, choose } from '../../src/utils/alerts';
import { useAuth } from '../../src/auth/AuthContext';
import { getProfile } from '../../src/db/profileQueries';
import { HealthProfile } from '../../src/types';
import { useFocusEffect, useRouter } from 'expo-router';

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingsRow({
  icon,
  label,
  subtitle,
  onPress,
  right,
  disabled,
}: {
  icon: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.rowDisabled]}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon as any} size={20} color="#9CA3AF" />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, disabled && styles.rowLabelDisabled]}>{label}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={16} color="#4B5563" />)}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { entries, loadEntries } = useMetricsStore();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profile, setProfile] = useState<HealthProfile | null>(null);

  // Reload profile whenever the settings tab is focused (e.g. after returning
  // from the edit screen) so the "Last updated" subtitle reflects new data.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!user) return;
        try {
          const p = await getProfile(user.id);
          if (!cancelled) setProfile(p);
        } catch {
          // Non-fatal — leave profile as-is.
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user]),
  );

  const profileSubtitle = (() => {
    if (!profile || !profile.updatedAt) return 'Not yet set';
    const d = new Date(profile.updatedAt);
    if (isNaN(d.getTime())) return 'Last updated recently';
    return `Last updated ${d.toLocaleDateString()}`;
  })();

  const handleSignOut = async () => {
    const ok = await confirm('Sign out?', 'You will need to sign in again to view your data.', {
      confirmLabel: 'Sign Out',
    });
    if (!ok) return;
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (e: any) {
      notify('Sign out failed', e?.message ?? 'Could not sign out.');
    } finally {
      setIsSigningOut(false);
    }
  };
  const [exportRange, setExportRange] = useState<DateRange>({
    start: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  const insertWithDedup = async (
    parsed: Omit<MetricEntry, 'id'>[],
  ): Promise<{ imported: number; skipped: number }> => {
    const toInsert: Omit<MetricEntry, 'id'>[] = [];
    let skipped = 0;
    for (const e of parsed) {
      const exists = await sqliteAdapter.entryExists(e.metric_type, e.timestamp);
      if (exists) {
        skipped++;
        continue;
      }
      toInsert.push(e);
    }
    const imported = toInsert.length > 0 ? await sqliteAdapter.bulkAdd(toInsert) : 0;
    return { imported, skipped };
  };

  const handleImport = async () => {
    try {
      setIsImporting(true);
      const bytes = await pickXlsxFile();
      if (!bytes) return;

      const first = parseXlsx(bytes);
      if (first.personsFound.length === 0) {
        notify('Nothing to import', 'No person columns were found in the spreadsheet.');
        return;
      }

      let entriesToImport: Omit<MetricEntry, 'id'>[];
      if (first.personsFound.length === 1) {
        // Only one person → first parse pass already filtered to all (== that one) implicitly.
        entriesToImport = parseXlsx(bytes, first.personsFound[0]).entries;
      } else {
        const chosen = await choose(
          'Select person',
          'Multiple people found. Choose one to import:',
          first.personsFound,
        );
        if (!chosen) return;
        entriesToImport = parseXlsx(bytes, chosen).entries;
      }

      if (entriesToImport.length === 0) {
        notify('Nothing to import', 'No valid entries were found for the selected person.');
        return;
      }

      const { imported, skipped } = await insertWithDedup(entriesToImport);
      await loadEntries();
      notify(
        'Import complete',
        `Imported ${imported} entr${imported === 1 ? 'y' : 'ies'}, skipped ${skipped} duplicate${
          skipped === 1 ? '' : 's'
        }.`,
      );
    } catch (e: any) {
      notify('Import failed', e?.message ?? 'Could not import the file.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteAll = async () => {
    const count = entries.length;
    if (count === 0) {
      notify('Nothing to delete', 'There are no entries to delete.');
      return;
    }
    const ok = await confirm(
      'Delete all data?',
      `This will permanently delete all ${count} entries from this device. This cannot be undone.`,
      { confirmLabel: 'Delete', destructive: true },
    );
    if (!ok) return;
    try {
      setIsDeleting(true);
      const deleted = await sqliteAdapter.deleteAll();
      await loadEntries();
      notify('Deleted', `Removed ${deleted} entr${deleted === 1 ? 'y' : 'ies'}.`);
    } catch (e: any) {
      notify('Delete failed', e?.message ?? 'Could not delete data.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await loadEntries();
      const rangeEntries = entries.filter((e) => {
        const ts = new Date(e.timestamp);
        return ts >= exportRange.start && ts <= exportRange.end;
      });

      if (rangeEntries.length === 0) {
        notify('No data', 'No entries found in the selected date range.');
        return;
      }

      await exportAndShare(rangeEntries);
    } catch (e: any) {
      notify('Export failed', e.message ?? 'Could not export data.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ResponsiveContainer maxWidth={720}>

      {/* Import section */}
      <SectionHeader title="Import from Excel" />
      <View style={styles.card}>
        <SettingsRow
          icon="document-attach-outline"
          label="Import from Excel file"
          subtitle="Pick an .xlsx file with Blood Pressure and Sugar sheets"
          onPress={handleImport}
          disabled={isImporting}
          right={isImporting ? <ActivityIndicator size="small" color="#3B82F6" /> : undefined}
        />
      </View>

      {/* Personal Health Profile */}
      <SectionHeader title="Personal Health Profile" />
      <View style={styles.card}>
        <SettingsRow
          icon="person-outline"
          label="Edit health profile"
          subtitle={profileSubtitle}
          onPress={() => router.push('/profile')}
        />
      </View>

      {/* Export section */}
      <SectionHeader title="Export" />
      <View style={styles.card}>
        <View style={styles.exportDateRow}>
          <Text style={styles.exportDateLabel}>Date range</Text>
          <DateRangePicker value={exportRange} onChange={setExportRange} />
        </View>
        <View style={styles.divider} />
        <SettingsRow
          icon="download-outline"
          label="Export to CSV"
          subtitle={`${entries.length} total entries`}
          onPress={handleExport}
          disabled={isExporting}
          right={isExporting ? <ActivityIndicator size="small" color="#3B82F6" /> : undefined}
        />
      </View>

      {/* Connected Devices (placeholder) */}
      <SectionHeader title="Connected Devices" />
      <View style={styles.card}>
        <SettingsRow
          icon="watch-outline"
          label="Garmin"
          subtitle="Not connected — coming soon"
          disabled
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="heart-outline"
          label="Apple Health"
          subtitle="Not connected — coming soon"
          disabled
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="fitness-outline"
          label="Google Fit"
          subtitle="Not connected — coming soon"
          disabled
        />
      </View>

      {/* Account */}
      <SectionHeader title="Account" />
      <View style={styles.card}>
        <SettingsRow
          icon="person-outline"
          label="Signed in as"
          subtitle={user?.email ?? '—'}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="log-out-outline"
          label="Sign Out"
          subtitle="Return to the sign-in screen"
          onPress={handleSignOut}
          disabled={isSigningOut}
          right={isSigningOut ? <ActivityIndicator size="small" color="#3B82F6" /> : undefined}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="cloud-outline"
          label="Cloud Backup"
          subtitle="Requires online account — coming soon"
          disabled
        />
      </View>

      {/* Danger Zone */}
      <SectionHeader title="Danger Zone" />
      <View style={[styles.card, styles.dangerCard]}>
        <TouchableOpacity
          style={[styles.row, isDeleting && styles.rowDisabled]}
          onPress={handleDeleteAll}
          disabled={isDeleting}
          activeOpacity={0.7}
        >
          <View style={styles.rowIcon}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </View>
          <View style={styles.rowContent}>
            <Text style={[styles.rowLabel, { color: '#EF4444' }]}>Delete all data</Text>
            <Text style={styles.rowSubtitle}>
              {entries.length === 0
                ? 'No entries stored'
                : `Permanently remove all ${entries.length} entries from this device`}
            </Text>
          </View>
          {isDeleting && <ActivityIndicator size="small" color="#EF4444" />}
        </TouchableOpacity>
      </View>

      {/* About */}
      <SectionHeader title="About" />
      <View style={styles.card}>
        <SettingsRow
          icon="information-circle-outline"
          label="Version"
          right={<Text style={styles.versionText}>1.0.0</Text>}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Privacy"
          subtitle="All data stored locally on your device"
        />
      </View>
      </ResponsiveContainer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  sectionHeader: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    overflow: 'hidden',
  },
  dangerCard: {
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '500',
  },
  rowLabelDisabled: {
    color: '#9CA3AF',
  },
  rowSubtitle: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginLeft: 60,
  },
  exportDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  exportDateLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  versionText: {
    color: '#6B7280',
    fontSize: 14,
  },
});
