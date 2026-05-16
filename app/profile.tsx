import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ResponsiveContainer } from '../src/components/ui/ResponsiveContainer';
import { useAuth } from '../src/auth/AuthContext';
import { getProfile, upsertProfile } from '../src/db/profileQueries';
import { HealthProfile } from '../src/types';
import { notify, confirm } from '../src/utils/alerts';

type Sex = NonNullable<HealthProfile['sex']>;

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

interface FormState {
  dateOfBirth: string;
  sex: Sex | null;
  heightCm: string;
  conditions: string;
  medications: string;
  familyHistory: string;
  allergies: string;
  genetics: string;
  notes: string;
}

const EMPTY: FormState = {
  dateOfBirth: '',
  sex: null,
  heightCm: '',
  conditions: '',
  medications: '',
  familyHistory: '',
  allergies: '',
  genetics: '',
  notes: '',
};

function profileToForm(p: HealthProfile | null): FormState {
  if (!p) return EMPTY;
  return {
    dateOfBirth: p.dateOfBirth ?? '',
    sex: p.sex ?? null,
    heightCm: p.heightCm != null ? String(p.heightCm) : '',
    conditions: p.conditions ?? '',
    medications: p.medications ?? '',
    familyHistory: p.familyHistory ?? '',
    allergies: p.allergies ?? '',
    genetics: p.genetics ?? '',
    notes: p.notes ?? '',
  };
}

function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initial, setInitial] = useState<FormState>(EMPTY);
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const existing = await getProfile(user.id);
        if (cancelled) return;
        const f = profileToForm(existing);
        setInitial(f);
        setForm(f);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isDirty = useMemo(
    () => JSON.stringify(initial) !== JSON.stringify(form),
    [initial, form],
  );

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleBack = async () => {
    if (isDirty) {
      const ok = await confirm(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to leave?',
        { confirmLabel: 'Discard', destructive: true },
      );
      if (!ok) return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/settings');
  };

  const handleSave = async () => {
    if (!user) return;

    if (form.dateOfBirth.trim() && !isValidDate(form.dateOfBirth.trim())) {
      notify('Invalid date', 'Please enter date of birth as YYYY-MM-DD.');
      return;
    }
    let heightNum: number | undefined;
    if (form.heightCm.trim()) {
      const n = parseFloat(form.heightCm);
      if (isNaN(n) || n <= 0) {
        notify('Invalid height', 'Please enter a positive number for height (cm).');
        return;
      }
      heightNum = n;
    }

    try {
      setSaving(true);
      await upsertProfile(user.id, {
        dateOfBirth: form.dateOfBirth.trim() || undefined,
        sex: form.sex ?? undefined,
        heightCm: heightNum,
        conditions: form.conditions.trim() || undefined,
        medications: form.medications.trim() || undefined,
        familyHistory: form.familyHistory.trim() || undefined,
        allergies: form.allergies.trim() || undefined,
        genetics: form.genetics.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      notify('Saved', 'Profile updated.');
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/settings');
    } catch (e: any) {
      notify('Save failed', e?.message ?? 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#F9FAFB" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Personal Health Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ResponsiveContainer maxWidth={640}>
          {/* Date of birth */}
          <Text style={styles.label}>Date of Birth</Text>
          {Platform.OS === 'web' ? (
            // Use native date input on web for the best UX without adding deps.
            React.createElement('input', {
              type: 'date',
              value: form.dateOfBirth,
              onChange: (e: any) => setField('dateOfBirth', e.target.value),
              style: webDateInputStyle,
            })
          ) : (
            <TextInput
              style={styles.input}
              value={form.dateOfBirth}
              onChangeText={(v) => setField('dateOfBirth', v)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#4B5563"
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}

          {/* Sex */}
          <Text style={styles.label}>Sex</Text>
          <View style={styles.chipRow}>
            {SEX_OPTIONS.map((opt) => {
              const active = form.sex === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setField('sex', active ? null : opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Height */}
          <Text style={styles.label}>Height (cm)</Text>
          <View style={styles.heightRow}>
            <TextInput
              style={[styles.input, styles.heightInput]}
              value={form.heightCm}
              onChangeText={(v) => setField('heightCm', v)}
              placeholder="175"
              placeholderTextColor="#4B5563"
              keyboardType="numeric"
            />
            <Text style={styles.unitLabel}>cm</Text>
          </View>

          {/* Multiline fields */}
          <MultilineField
            label="Conditions"
            value={form.conditions}
            onChange={(v) => setField('conditions', v)}
            placeholder="e.g. Type 2 diabetes, hypertension"
          />
          <MultilineField
            label="Medications"
            value={form.medications}
            onChange={(v) => setField('medications', v)}
            placeholder="e.g. Metformin 500mg twice daily"
          />
          <MultilineField
            label="Family History"
            value={form.familyHistory}
            onChange={(v) => setField('familyHistory', v)}
            placeholder="e.g. Father: heart disease at 60. Mother: diabetes."
          />
          <MultilineField
            label="Allergies"
            value={form.allergies}
            onChange={(v) => setField('allergies', v)}
            placeholder="e.g. Penicillin, peanuts"
          />
          <MultilineField
            label="Genetics / Lab Notes"
            value={form.genetics}
            onChange={(v) => setField('genetics', v)}
            placeholder="Genetic test results, lab work, etc."
          />
          <MultilineField
            label="Notes"
            value={form.notes}
            onChange={(v) => setField('notes', v)}
            placeholder="Anything else worth noting"
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}

function MultilineField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#4B5563"
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />
    </View>
  );
}

const webDateInputStyle: any = {
  backgroundColor: '#1F2937',
  color: '#F9FAFB',
  border: '1px solid #374151',
  borderRadius: 10,
  padding: 12,
  fontSize: 16,
  fontFamily: 'inherit',
  outline: 'none',
  colorScheme: 'dark',
  width: '100%',
  boxSizing: 'border-box',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backText: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 2,
  },
  title: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  label: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1F2937',
    borderRadius: 10,
    padding: 14,
    color: '#F9FAFB',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  multilineInput: {
    height: 110,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  chipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  chipText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  heightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heightInput: {
    flex: 1,
  },
  unitLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: {
    backgroundColor: '#1E40AF',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
