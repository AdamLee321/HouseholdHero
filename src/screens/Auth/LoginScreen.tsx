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
  Image,
} from 'react-native';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import auth from '@react-native-firebase/auth';
import ReactNativeBiometrics from 'react-native-biometrics';
import LucideIcon from '@react-native-vector-icons/lucide';
import { useTheme } from '../../theme/useTheme';

const BRAND = '#00C9A7';
const logo = require('../../assets/bootsplash/clear-logo.png');

type Mode = 'login' | 'register' | 'forgot';

export default function LoginScreen() {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function authErrorMessage(code: string, isRegister: boolean): string {
    switch (code) {
      case 'auth/invalid-email':
        return "That doesn't look like a valid email address.";
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please wait a moment and try again.';
      case 'auth/email-already-in-use':
        return isRegister
          ? 'An account with this email already exists.'
          : 'Incorrect email or password.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/network-request-failed':
        return 'No internet connection. Please check your network.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  async function handleEmailAuth() {
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'register') {
        await auth().createUserWithEmailAndPassword(
          email.trim().toLowerCase(),
          password,
        );
      } else {
        await auth().signInWithEmailAndPassword(
          email.trim().toLowerCase(),
          password,
        );
      }
    } catch (e: any) {
      setErrorMsg(authErrorMessage(e.code, mode === 'register'));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Please enter your email address above.');
      return;
    }
    setLoading(true);
    try {
      await auth().sendPasswordResetEmail(email.trim().toLowerCase());
      Alert.alert(
        'Email sent',
        `A password reset link has been sent to ${email.trim()}. Check your inbox.`,
        [{ text: 'OK', onPress: () => setMode('login') }],
      );
    } catch (e: any) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-email') {
        // Don't reveal whether the address exists — generic message
        Alert.alert(
          'Email sent',
          'If that address is registered you will receive a reset link shortly.',
          [{ text: 'OK', onPress: () => setMode('login') }],
        );
      } else {
        Alert.alert('Error', e.message ?? 'Something went wrong.');
      }
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
      borderColor: 'rgba(255,255,255,0.4)',
      backgroundColor: 'rgba(255,255,255,0.15)',
      color: '#fff',
    },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: BRAND }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.title, { color: '#fff' }]}>Household Hero</Text>

        <View style={[styles.tabs, { backgroundColor: 'rgba(0,0,0,0.12)' }]}>
          {(['login', 'register'] as Mode[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[
                styles.tab,
                mode === m && [styles.tabActive, { backgroundColor: '#fff' }],
              ]}
              onPress={() => {
                setMode(m);
                setErrorMsg(null);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: mode === m ? BRAND : 'rgba(255,255,255,0.75)' },
                ]}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {(mode === 'login' || mode === 'register') && (
          <>
            <TextInput
              style={inputStyle}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.6)"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <View style={styles.passwordWrap}>
              <TextInput
                style={[inputStyle, styles.passwordInput]}
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.6)"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />

              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(p => !p)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <LucideIcon
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="rgba(255,255,255,0.7)"
                />
              </TouchableOpacity>
            </View>
            {errorMsg && (
              <View style={styles.errorBanner}>
                <LucideIcon name="circle-alert" size={15} color="#C0392B" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.btn}
              onPress={handleEmailAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={BRAND} />
              ) : (
                <Text style={styles.btnText}>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>
            {mode === 'login' && (
              <TouchableOpacity
                onPress={() => {
                  setMode('forgot');
                  setErrorMsg(null);
                }}
              >
                <Text style={styles.link}>Forgot password?</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {mode === 'forgot' && (
          <>
            <Text style={styles.hint}>
              Enter your email address and we'll send you a reset link.
            </Text>
            <TextInput
              style={inputStyle}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.6)"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TouchableOpacity
              style={styles.btn}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={BRAND} />
              ) : (
                <Text style={styles.btnText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('login')}>
              <Text style={styles.link}>Back to Sign In</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometric}>
          <Text style={styles.biometricText}>🔒 Use Face ID / Fingerprint</Text>
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
  logo: { width: 120, height: 120, alignSelf: 'center', marginBottom: 8 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
    color: '#fff',
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
  passwordWrap: { marginBottom: 12 },
  passwordInput: { marginBottom: 0, paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    marginTop: -4,
  },
  errorText: {
    color: '#C0392B',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#fff',
  },
  btnText: { color: BRAND, fontWeight: '700', fontSize: 16 },
  hint: {
    textAlign: 'center',
    marginBottom: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  link: {
    textAlign: 'center',
    marginTop: 12,
    color: '#fff',
    fontWeight: '600',
  },
  biometricBtn: { marginTop: 24, alignItems: 'center' },
  biometricText: {
    fontWeight: '600',
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
  },
});
