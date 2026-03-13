import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarScroll } from '../../hooks/useTabBarScroll';
import { useTheme } from '../../theme/useTheme';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useFamilyStore } from '../../store/familyStore';

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const { preference, setPreference } = useThemeStore();
  const { signOut, user } = useAuthStore();
  const { family, profile } = useFamilyStore();
  const insets = useSafeAreaInsets();
  const tabBarScroll = useTabBarScroll();

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      {...tabBarScroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 },
      ]}
    >
      {/* Profile card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {profile?.displayName?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={[styles.displayName, { color: colors.text }]}>
          {profile?.displayName ?? 'Unknown'}
        </Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>
          {user?.email ?? user?.phoneNumber ?? ''}
        </Text>
      </View>

      {/* Family card */}
      {family && (
        <View style={[styles.familyCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.familyCardLabel}>FAMILY</Text>
          <Text style={styles.familyCardName}>{family.name}</Text>
          <View style={styles.divider} />
          <Text style={styles.familyCardLabel}>INVITE CODE</Text>
          <Text style={styles.familyCardCode}>{family.inviteCode}</Text>
          <Text style={styles.familyCardHint}>
            Share this code with family members to join
          </Text>
        </View>
      )}

      {/* Appearance */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          APPEARANCE
        </Text>

        <View style={[styles.row, styles.rowDivider, { borderBottomColor: colors.border }]}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Dark Mode
          </Text>
          <Switch
            value={isDark}
            onValueChange={val => setPreference(val ? 'dark' : 'light')}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        <TouchableOpacity
          style={styles.row}
          onPress={() => setPreference('system')}
        >
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Use System Default
          </Text>
          {preference === 'system' && (
            <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Sign out */}
      <TouchableOpacity
        style={[
          styles.signOutBtn,
          { backgroundColor: colors.surface, borderColor: colors.danger },
        ]}
        onPress={handleSignOut}
      >
        <Text style={[styles.signOutText, { color: colors.danger }]}>
          Sign Out
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 30, fontWeight: '700' },
  displayName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  email: { fontSize: 14 },
  familyCard: { borderRadius: 18, padding: 24, marginBottom: 16 },
  familyCardLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  familyCardName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  familyCardCode: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 10,
    marginBottom: 8,
  },
  familyCardHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  section: { borderRadius: 18, marginBottom: 16, overflow: 'hidden' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 16 },
  checkmark: { fontSize: 18, fontWeight: '700' },
  signOutBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 8,
  },
  signOutText: { fontWeight: '700', fontSize: 16 },
});
