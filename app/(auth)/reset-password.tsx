import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { ResponsiveContainer } from '../../src/components/ui/ResponsiveContainer';
import { notify } from '../../src/utils/alerts';
import { authAdapter } from '../../src/auth';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

type Step = 'email' | 'set-password';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSubmit = async () => {
    setError(null);
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      const exists = await authAdapter.emailExists(email);
      if (!exists) {
        setError('No account found with that email.');
        return;
      }
      setStep('set-password');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async () => {
    setError(null);
    if (password.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPwd) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(email, password);
      notify('Password reset', 'Your password has been updated. Please sign in.');
      router.replace('/sign-in');
    } catch (e: any) {
      setError(e?.message ?? 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ResponsiveContainer maxWidth={400}>
        <View style={styles.card}>
          <Text style={styles.title}>Reset password</Text>

          {step === 'email' ? (
            <>
              <Text style={styles.subtitle}>
                Enter the email on your account. We'll verify it exists on this
                device before letting you set a new password.
              </Text>

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (error) setError(null);
                }}
                placeholder="you@example.com"
                placeholderTextColor="#6B7280"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!submitting}
                onSubmitEditing={handleEmailSubmit}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <View style={styles.noteCard}>
                <Text style={styles.noteText}>
                  This app stores data locally on your device. No reset email
                  is sent — you'll set the new password here after we verify
                  the email is on this device.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.button, submitting && styles.buttonDisabled]}
                onPress={handleEmailSubmit}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Account found for <Text style={styles.emphasis}>{email}</Text>.
                Set a new password below.
              </Text>

              <Text style={styles.label}>New password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor="#6B7280"
                secureTextEntry
                editable={!submitting}
                autoFocus
              />

              <Text style={styles.label}>Confirm new password</Text>
              <TextInput
                style={styles.input}
                value={confirmPwd}
                onChangeText={setConfirmPwd}
                placeholder="Re-enter new password"
                placeholderTextColor="#6B7280"
                secureTextEntry
                editable={!submitting}
                onSubmitEditing={handlePasswordSubmit}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={[styles.button, submitting && styles.buttonDisabled]}
                onPress={handlePasswordSubmit}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Update Password</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setStep('email');
                  setPassword('');
                  setConfirmPwd('');
                  setError(null);
                }}
                style={styles.linkRow}
                disabled={submitting}
              >
                <Text style={styles.linkText}>
                  <Text style={styles.linkAccent}>← Use a different email</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={() => router.replace('/sign-in')}
            style={styles.linkRow}
            disabled={submitting}
          >
            <Text style={styles.linkText}>
              Remembered it? <Text style={styles.linkAccent}>Back to sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ResponsiveContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#1F2937', borderRadius: 16, padding: 24 },
  title: { color: '#F9FAFB', fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#9CA3AF', fontSize: 14, marginBottom: 16, lineHeight: 20 },
  emphasis: { color: '#F9FAFB', fontWeight: '600' },
  label: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#F9FAFB',
    fontSize: 15,
  },
  noteCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  noteText: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 17,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  error: { color: '#EF4444', fontSize: 13, marginTop: 12 },
  linkRow: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#9CA3AF', fontSize: 14 },
  linkAccent: { color: '#3B82F6', fontWeight: '600' },
});
