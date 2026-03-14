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
import { createFamily, joinFamily } from '../../services/familyService';
import { useFamilyStore } from '../../store/familyStore';
import { useTheme } from '../../theme/useTheme';

type Mode = 'create' | 'join';
type JoinRole = 'parent' | 'guardian';

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>('create');
  const [displayName, setDisplayName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinRole, setJoinRole] = useState<JoinRole>('parent');
  const [loading, setLoading] = useState(false);
  const { setFamily, setProfile } = useFamilyStore();

  async function handleCreate() {
    if (!displayName.trim() || !familyName.trim()) {
      return Alert.alert(
        'Missing info',
        'Please enter your name and a family name.',
      );
    }
    setLoading(true);
    try {
      const family = await createFamily(familyName, displayName);
      setFamily(family);
      setProfile({
        uid: family.createdBy,
        displayName,
        email: null,
        familyId: family.id,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!displayName.trim() || !inviteCode.trim()) {
      return Alert.alert(
        'Missing info',
        'Please enter your name and the invite code.',
      );
    }
    setLoading(true);
    try {
      const family = await joinFamily(inviteCode, displayName, joinRole);
      setFamily(family);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
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
          Welcome to Household Hero
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Set up your family group to get started
        </Text>

        <View
          style={[styles.tabs, { backgroundColor: colors.surfaceSecondary }]}
        >
          {(['create', 'join'] as Mode[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[
                styles.tab,
                mode === m && [
                  styles.tabActive,
                  { backgroundColor: colors.surface },
                ],
              ]}
              onPress={() => setMode(m)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: mode === m ? colors.primary : colors.textTertiary },
                ]}
              >
                {m === 'create' ? 'Create Family' : 'Join Family'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Your name
        </Text>
        <TextInput
          style={inputStyle}
          placeholder="e.g. Adam"
          placeholderTextColor={colors.textTertiary}
          value={displayName}
          onChangeText={setDisplayName}
        />

        {mode === 'create' ? (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Family name
            </Text>
            <TextInput
              style={inputStyle}
              placeholder="e.g. The Lee Family"
              placeholderTextColor={colors.textTertiary}
              value={familyName}
              onChangeText={setFamilyName}
            />
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Create Family</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              I am joining as
            </Text>
            <View
              style={[styles.tabs, { backgroundColor: colors.surfaceSecondary }]}
            >
              {(['parent', 'guardian'] as JoinRole[]).map(r => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.tab,
                    joinRole === r && [
                      styles.tabActive,
                      { backgroundColor: colors.surface },
                    ],
                  ]}
                  onPress={() => setJoinRole(r)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color:
                          joinRole === r ? colors.primary : colors.textTertiary,
                      },
                    ]}
                  >
                    {r === 'parent' ? 'Parent' : 'Guardian'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.hint, { color: colors.textTertiary }]}>
              {joinRole === 'guardian'
                ? 'For nannies, grandparents, aunts, babysitters, etc.'
                : 'For parents or primary caregivers'}
            </Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Invite code
            </Text>
            <TextInput
              style={[inputStyle, styles.codeInput, { color: colors.primary }]}
              placeholder="ABC123"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              maxLength={6}
              value={inviteCode}
              onChangeText={setInviteCode}
            />
            <Text style={[styles.hint, { color: colors.textTertiary }]}>
              Ask a family member for their 6-character invite code
            </Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={handleJoin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Join Family</Text>
              )}
            </TouchableOpacity>
          </>
        )}
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
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 32 },
  tabs: {
    flexDirection: 'row',
    marginBottom: 24,
    borderRadius: 10,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  codeInput: {
    letterSpacing: 6,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  hint: { fontSize: 13, textAlign: 'center', marginTop: -8, marginBottom: 16 },
  btn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
