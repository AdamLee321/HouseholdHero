import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import { useTheme } from '../../theme/useTheme';
import { useAuthStore } from '../../store/authStore';

type Section = 'email' | 'password' | null;

export default function AccountScreen() {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState<Section>(null);

  // Change email fields
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  // Change password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);

  function resetFields() {
    setNewEmail('');
    setEmailPassword('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  function toggleSection(section: Section) {
    resetFields();
    setOpen(prev => (prev === section ? null : section));
  }

  async function handleChangeEmail() {
    if (!newEmail.trim()) {
      Alert.alert('Required', 'Please enter a new email address.');
      return;
    }
    if (!emailPassword) {
      Alert.alert('Required', 'Please enter your current password to confirm.');
      return;
    }
    if (!user?.email) return;

    setSaving(true);
    try {
      const credential = auth.EmailAuthProvider.credential(user.email, emailPassword);
      await user.reauthenticateWithCredential(credential);
      await user.verifyBeforeUpdateEmail(newEmail.trim().toLowerCase());
      Alert.alert(
        'Verification sent',
        `A confirmation link has been sent to ${newEmail.trim()}. Your email will update once you click it.`,
      );
      toggleSection(null);
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        Alert.alert('Incorrect password', 'The password you entered is wrong.');
      } else if (e.code === 'auth/email-already-in-use') {
        Alert.alert('Already in use', 'That email address is already linked to another account.');
      } else if (e.code === 'auth/invalid-email') {
        Alert.alert('Invalid email', 'Please enter a valid email address.');
      } else {
        Alert.alert('Error', e.message ?? 'Something went wrong.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword) {
      Alert.alert('Required', 'Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Too short', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }
    if (!user?.email) return;

    setSaving(true);
    try {
      const credential = auth.EmailAuthProvider.credential(user.email, currentPassword);
      await user.reauthenticateWithCredential(credential);
      await user.updatePassword(newPassword);
      Alert.alert('Done', 'Your password has been updated.');
      toggleSection(null);
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        Alert.alert('Incorrect password', 'Your current password is wrong.');
      } else {
        Alert.alert('Error', e.message ?? 'Something went wrong.');
      }
    } finally {
      setSaving(false);
    }
  }

  const isEmailProvider = user?.providerData?.some(p => p.providerId === 'password');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {!isEmailProvider && (
        <View style={[styles.notice, { backgroundColor: colors.surface }]}>
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
            Your account uses a social or phone login. Email and password changes are not available.
          </Text>
        </View>
      )}

      {isEmailProvider && (
        <>
          {/* Current email display */}
          <View style={[styles.infoRow, { backgroundColor: colors.surface }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Current email</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{user?.email}</Text>
          </View>

          {/* Change Email */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('email')}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Change Email</Text>
              <Text style={[styles.chevron, { color: colors.textSecondary }]}>
                {open === 'email' ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {open === 'email' && (
              <View style={styles.form}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>New email address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder="new@example.com"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={[styles.label, { color: colors.textSecondary }]}>Current password</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={emailPassword}
                  onChangeText={setEmailPassword}
                  placeholder="Enter your current password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                />

                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
                  onPress={handleChangeEmail}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Update Email</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Change Password */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('password')}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Change Password</Text>
              <Text style={[styles.chevron, { color: colors.textSecondary }]}>
                {open === 'password' ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {open === 'password' && (
              <View style={styles.form}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Current password</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter your current password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                />

                <Text style={[styles.label, { color: colors.textSecondary }]}>New password</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                />

                <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm new password</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat new password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                />

                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
                  onPress={handleChangePassword}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notice: { borderRadius: 14, padding: 16, marginBottom: 16 },
  noticeText: { fontSize: 14, lineHeight: 20 },
  infoRow: {
    borderRadius: 14, padding: 16, marginBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  section: { borderRadius: 14, marginBottom: 16, overflow: 'hidden' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  chevron: { fontSize: 12 },
  form: { paddingHorizontal: 16, paddingBottom: 16 },
  label: { fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15,
  },
  btn: {
    marginTop: 20, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
