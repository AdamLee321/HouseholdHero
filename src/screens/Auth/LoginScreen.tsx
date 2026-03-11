import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import ReactNativeBiometrics from 'react-native-biometrics';

type Mode = 'login' | 'register' | 'phone';

export default function LoginScreen() {
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
    if (!otp) {return;}
    setLoading(true);
    try {
      await confirm.confirm(otp);
    } catch (e: any) {
      Alert.alert('Invalid code', 'Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometric() {
    const rnBiometrics = new ReactNativeBiometrics();
    const {available} = await rnBiometrics.isSensorAvailable();
    if (!available) {
      return Alert.alert('Unavailable', 'Biometric authentication is not available on this device.');
    }
    const {success} = await rnBiometrics.simplePrompt({
      promptMessage: 'Confirm identity',
    });
    if (success) {
      // Biometric success — in a real app you'd retrieve stored credentials
      // and sign in silently. For now we show guidance.
      Alert.alert('Biometric verified', 'Please sign in with your credentials first to enable biometric login.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>🏠</Text>
        <Text style={styles.title}>HouseholdHero</Text>

        {/* Mode tabs */}
        <View style={styles.tabs}>
          {(['login', 'register', 'phone'] as Mode[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.tab, mode === m && styles.tabActive]}
              onPress={() => {setMode(m); setConfirm(null);}}>
              <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                {m === 'login' ? 'Email' : m === 'register' ? 'Register' : 'Phone'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Email / Register form */}
        {(mode === 'login' || mode === 'register') && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={styles.btn} onPress={handleEmailAuth} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Phone form */}
        {mode === 'phone' && (
          <>
            {!confirm ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="+1 234 567 8900"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
                <TouchableOpacity style={styles.btn} onPress={handleSendOtp} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Send Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.hint}>Enter the 6-digit code sent to {phone}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="000000"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                />
                <TouchableOpacity style={styles.btn} onPress={handleVerifyOtp} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Verify Code</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setConfirm(null)}>
                  <Text style={styles.link}>Change number</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {/* Biometric */}
        <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometric}>
          <Text style={styles.biometricText}>🔒 Use Face ID / Fingerprint</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  inner: {flex: 1, justifyContent: 'center', paddingHorizontal: 28},
  logo: {fontSize: 56, textAlign: 'center', marginBottom: 8},
  title: {fontSize: 28, fontWeight: '700', textAlign: 'center', color: '#1a1a1a', marginBottom: 32},
  tabs: {flexDirection: 'row', marginBottom: 20, borderRadius: 10, backgroundColor: '#f0f0f0', padding: 4},
  tab: {flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center'},
  tabActive: {backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2},
  tabText: {color: '#999', fontWeight: '600'},
  tabTextActive: {color: '#4F6EF7'},
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#1a1a1a', marginBottom: 12,
  },
  btn: {
    backgroundColor: '#4F6EF7', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  btnText: {color: '#fff', fontWeight: '700', fontSize: 16},
  hint: {color: '#666', textAlign: 'center', marginBottom: 12},
  link: {color: '#4F6EF7', textAlign: 'center', marginTop: 12},
  biometricBtn: {marginTop: 24, alignItems: 'center'},
  biometricText: {color: '#4F6EF7', fontWeight: '600', fontSize: 15},
});
