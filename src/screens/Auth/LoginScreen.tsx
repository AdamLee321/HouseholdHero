import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import auth from '@react-native-firebase/auth';
import ReactNativeBiometrics from 'react-native-biometrics';
import { useTheme } from '../../theme/useTheme';

type Mode = 'login' | 'register' | 'phone';

export default function LoginScreen() {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirm, setConfirm] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmailAuth() {
    if (!email || !password) {
      return Alert.alert('Error', 'Please enter your email and password.');
    }
    setLoading(true);
    try {
      if (mode === 'register') {
        await auth().createUserWithEmailAndPassword(email, password);
      } else {
        await auth().signInWithEmailAndPassword(email, password);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    if (!phone) {
      return Alert.alert('Error', 'Please enter a phone number.');
    }
    setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(phone);
      setConfirm(confirmation);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp) {
      return;
    }
    setLoading(true);
    try {
      await confirm.confirm(otp);
    } catch {
      Alert.alert('Invalid code', 'Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometric() {
    const rnBiometrics = new ReactNativeBiometrics();
    const { available } = await rnBiometrics.isSensorAvailable();
    if (!available) {
      return Alert.alert(
        'Unavailable',
        'Biometric authentication is not available on this device.',
      );
    }
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: 'Confirm identity',
    });
    if (success) {
      Alert.alert(
        'Biometric verified',
        'Please sign in with your credentials first to enable biometric login.',
      );
    }
  }

  const inputStyle = [
    styles.input,
    {
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>🏠</Text>
        <Text style={[styles.title, { color: colors.text }]}>
          HouseholdHero
        </Text>

        <View
          style={[styles.tabs, { backgroundColor: colors.surfaceSecondary }]}
        >
          {(['login', 'register', 'phone'] as Mode[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[
                styles.tab,
                mode === m && [
                  styles.tabActive,
                  { backgroundColor: colors.surface },
                ],
              ]}
              onPress={() => {
                setMode(m);
                setConfirm(null);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: mode === m ? colors.primary : colors.textTertiary },
                ]}
              >
                {m === 'login'
                  ? 'Sign In'
                  : m === 'register'
                  ? 'Register'
                  : 'Phone'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {(mode === 'login' || mode === 'register') && (
          <>
            <TextInput
              style={inputStyle}
              placeholder="Email"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={inputStyle}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={handleEmailAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {mode === 'phone' && (
          <>
            {!confirm ? (
              <>
                <TextInput
                  style={inputStyle}
                  placeholder="+1 234 567 8900"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                  onPress={handleSendOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Send Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  Enter the 6-digit code sent to {phone}
                </Text>
                <TextInput
                  style={inputStyle}
                  placeholder="000000"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                />
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Verify Code</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setConfirm(null)}>
                  <Text style={[styles.link, { color: colors.primary }]}>
                    Change number
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometric}>
          <Text style={[styles.biometricText, { color: colors.primary }]}>
            🔒 Use Face ID / Fingerprint
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  logo: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 10,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint: { textAlign: 'center', marginBottom: 12 },
  link: { textAlign: 'center', marginTop: 12 },
  biometricBtn: { marginTop: 24, alignItems: 'center' },
  biometricText: { fontWeight: '600', fontSize: 15 },
});
