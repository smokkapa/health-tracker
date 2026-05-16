import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { MetricType, DataSource } from '../../types';
import { useMetricsStore } from '../../stores/metrics';
import { metricTypeLabel } from '../../utils/formatters';
import { notify } from '../../utils/alerts';

const METRIC_TYPES: MetricType[] = ['blood_pressure', 'blood_sugar', 'weight'];

const BLOOD_SUGAR_UNITS = ['mg/dL', 'mmol/L'];
const WEIGHT_UNITS = ['kg', 'lbs'];

interface AddMetricFormProps {
  onSuccess?: () => void;
}

export function AddMetricForm({ onSuccess }: AddMetricFormProps) {
  const addEntry = useMetricsStore((s) => s.addEntry);
  const isLoading = useMetricsStore((s) => s.isLoading);

  const [selectedType, setSelectedType] = useState<MetricType>('blood_pressure');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [value, setValue] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [fasting, setFasting] = useState(false);
  const [bloodSugarUnit, setBloodSugarUnit] = useState<string>('mg/dL');
  const [weightUnit, setWeightUnit] = useState<string>('kg');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setSystolic('');
    setDiastolic('');
    setPulse('');
    setValue('');
    setBodyFat('');
    setFasting(false);
    setNotes('');
  };

  const handleSave = async () => {
    try {
      const ts = new Date().toISOString();

      if (selectedType === 'blood_pressure') {
        const sys = parseFloat(systolic);
        const dia = parseFloat(diastolic);
        if (isNaN(sys) || isNaN(dia)) {
          notify('Invalid input', 'Please enter valid systolic and diastolic values.');
          return;
        }
        const pulseNum = pulse.trim() ? parseFloat(pulse) : undefined;
        if (pulse.trim() && (pulseNum == null || isNaN(pulseNum))) {
          notify('Invalid input', 'Please enter a valid pulse value or leave it blank.');
          return;
        }
        await addEntry({
          metric_type: 'blood_pressure',
          timestamp: ts,
          source: 'manual' as DataSource,
          systolic: sys,
          diastolic: dia,
          pulse: pulseNum,
          unit: 'mmHg',
          notes: notes.trim() || undefined,
        });
      } else {
        const num = parseFloat(value);
        if (isNaN(num)) {
          notify('Invalid input', 'Please enter a valid number.');
          return;
        }
        let unit: string | undefined;
        if (selectedType === 'blood_sugar') unit = bloodSugarUnit;
        else if (selectedType === 'weight') unit = weightUnit;

        let bodyFatNum: number | undefined;
        if (selectedType === 'weight' && bodyFat.trim()) {
          const bf = parseFloat(bodyFat);
          if (isNaN(bf)) {
            notify('Invalid input', 'Please enter a valid body fat percentage or leave it blank.');
            return;
          }
          bodyFatNum = bf;
        }

        await addEntry({
          metric_type: selectedType,
          timestamp: ts,
          source: 'manual' as DataSource,
          value: num,
          unit,
          fasting: selectedType === 'blood_sugar' ? fasting : undefined,
          body_fat: bodyFatNum,
          notes: notes.trim() || undefined,
        });
      }

      resetForm();
      onSuccess?.();
      notify('Saved', 'Reading recorded successfully.');
    } catch (e) {
      notify('Error', 'Failed to save reading. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Metric type selector */}
      <Text style={styles.label}>Metric Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
        {METRIC_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.typeChip, selectedType === type && styles.typeChipActive]}
            onPress={() => setSelectedType(type)}
          >
            <Text style={[styles.typeChipText, selectedType === type && styles.typeChipTextActive]}>
              {metricTypeLabel(type)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Blood pressure inputs */}
      {selectedType === 'blood_pressure' && (
        <View>
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Systolic</Text>
              <TextInput
                style={styles.input}
                value={systolic}
                onChangeText={setSystolic}
                placeholder="120"
                placeholderTextColor="#4B5563"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Diastolic</Text>
              <TextInput
                style={styles.input}
                value={diastolic}
                onChangeText={setDiastolic}
                placeholder="80"
                placeholderTextColor="#4B5563"
                keyboardType="numeric"
              />
            </View>
          </View>
          <Text style={styles.label}>Pulse (bpm) — optional</Text>
          <TextInput
            style={styles.input}
            value={pulse}
            onChangeText={setPulse}
            placeholder="72"
            placeholderTextColor="#4B5563"
            keyboardType="numeric"
          />
          <Text style={styles.unitLabel}>Unit: mmHg</Text>
        </View>
      )}

      {/* Blood sugar input */}
      {selectedType === 'blood_sugar' && (
        <View>
          <Text style={styles.label}>Blood Sugar</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder="90"
            placeholderTextColor="#4B5563"
            keyboardType="numeric"
          />
          <Text style={styles.label}>Unit</Text>
          <View style={styles.unitSelector}>
            {BLOOD_SUGAR_UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitChip, bloodSugarUnit === u && styles.unitChipActive]}
                onPress={() => setBloodSugarUnit(u)}
              >
                <Text style={[styles.unitChipText, bloodSugarUnit === u && styles.unitChipTextActive]}>
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.fastingRow}>
            <Text style={styles.fastingLabel}>Fasting</Text>
            <Switch
              value={fasting}
              onValueChange={setFasting}
              trackColor={{ false: '#374151', true: '#1E40AF' }}
              thumbColor={fasting ? '#3B82F6' : '#9CA3AF'}
            />
          </View>
        </View>
      )}

      {/* Weight input */}
      {selectedType === 'weight' && (
        <View>
          <Text style={styles.label}>Weight</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder="70"
            placeholderTextColor="#4B5563"
            keyboardType="numeric"
          />
          <Text style={styles.label}>Unit</Text>
          <View style={styles.unitSelector}>
            {WEIGHT_UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[styles.unitChip, weightUnit === u && styles.unitChipActive]}
                onPress={() => setWeightUnit(u)}
              >
                <Text style={[styles.unitChipText, weightUnit === u && styles.unitChipTextActive]}>
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Body Fat % (optional)</Text>
          <TextInput
            style={styles.input}
            value={bodyFat}
            onChangeText={setBodyFat}
            placeholder="18.5"
            placeholderTextColor="#4B5563"
            keyboardType="numeric"
          />
        </View>
      )}

      {/* Notes */}
      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Any additional notes..."
        placeholderTextColor="#4B5563"
        multiline
        numberOfLines={3}
      />

      {/* Source (read-only) */}
      <Text style={styles.label}>Source</Text>
      <View style={styles.sourceField}>
        <Text style={styles.sourceText}>Manual</Text>
      </View>

      {/* Save button */}
      <TouchableOpacity
        style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isLoading}
      >
        <Text style={styles.saveButtonText}>{isLoading ? 'Saving...' : 'Save Reading'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  typeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1F2937',
    marginRight: 8,
  },
  typeChipActive: {
    backgroundColor: '#3B82F6',
  },
  typeChipText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
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
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  unitLabel: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 6,
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  unitChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  unitChipActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E40AF20',
  },
  unitChipText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  unitChipTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  sourceField: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  sourceText: {
    color: '#6B7280',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    backgroundColor: '#1E40AF',
    opacity: 0.7,
  },
  fastingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 8,
  },
  fastingLabel: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '500',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
