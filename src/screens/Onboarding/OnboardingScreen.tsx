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
  ScrollView,
} from 'react-native';
import {createFamily, joinFamily} from '../../services/familyService';
import {useFamilyStore} from '../../store/familyStore';

type Mode = 'create' | 'join';

export default function OnboardingScreen() {
  const [mode, setMode] = useState<Mode>('create');
  const [displayName, setDisplayName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const {setFamily, setProfile} = useFamilyStore();

  async function handleCreate() {
    if (!displayName.trim() || !familyName.trim()) {
      return Alert.alert('Missing info', 'Please enter your name and a family name.');
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
      return Alert.alert('Missing info', 'Please enter your name and the invite code.');
    }
    setLoading(true);
    try {
      const family = await joinFamily(inviteCode, displayName);
      setFamily(family);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🏠</Text>
        <Text style={styles.title}>Welcome to HouseholdHero</Text>
        <Text style={styles.subtitle}>Set up your family group to get started</Text>

        {/* Mode toggle */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, mode === 'create' && styles.tabActive]}
            onPress={() => setMode('create')}>
            <Text style={[styles.tabText, mode === 'create' && styles.tabTextActive]}>
              Create Family
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'join' && styles.tabActive]}
            onPress={() => setMode('join')}>
            <Text style={[styles.tabText, mode === 'join' && styles.tabTextActive]}>
              Join Family
            </Text>
          </TouchableOpacity>
        </View>

        {/* Your name — shared by both modes */}
        <Text style={styles.label}>Your name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Adam"
          placeholderTextColor="#999"
          value={displayName}
          onChangeText={setDisplayName}
        />

        {mode === 'create' ? (
          <>
            <Text style={styles.label}>Family name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. The Lee Family"
              placeholderTextColor="#999"
              value={familyName}
              onChangeText={setFamilyName}
            />
            <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Create Family</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Invite code</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="ABC123"
              placeholderTextColor="#999"
              autoCapitalize="characters"
              maxLength={6}
              value={inviteCode}
              onChangeText={setInviteCode}
            />
            <Text style={styles.hint}>Ask a family member for their 6-character invite code</Text>
            <TouchableOpacity style={styles.btn} onPress={handleJoin} disabled={loading}>
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
  container: {flex: 1, backgroundColor: '#fff'},
  inner: {flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40},
  logo: {fontSize: 56, textAlign: 'center', marginBottom: 8},
  title: {fontSize: 24, fontWeight: '700', textAlign: 'center', color: '#1a1a1a', marginBottom: 8},
  subtitle: {fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 32},
  tabs: {flexDirection: 'row', marginBottom: 24, borderRadius: 10, backgroundColor: '#f0f0f0', padding: 4},
  tab: {flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center'},
  tabActive: {backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2},
  tabText: {color: '#999', fontWeight: '600'},
  tabTextActive: {color: '#4F6EF7'},
  label: {fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 4},
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#1a1a1a', marginBottom: 16,
  },
  codeInput: {
    letterSpacing: 6, fontSize: 22, fontWeight: '700',
    textAlign: 'center', color: '#4F6EF7',
  },
  hint: {fontSize: 13, color: '#aaa', textAlign: 'center', marginTop: -8, marginBottom: 16},
  btn: {
    backgroundColor: '#4F6EF7', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  btnText: {color: '#fff', fontWeight: '700', fontSize: 16},
});
