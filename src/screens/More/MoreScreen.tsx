import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Text from '../../components/Text';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MoreStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useFamilyStore } from '../../store/familyStore';

type MoreNavProp = NativeStackNavigationProp<MoreStackParamList, 'MoreHome'>;

const items: { label: string; screen: keyof MoreStackParamList }[] = [
  { label: 'Emergency Contacts', screen: 'Contacts' },
  { label: 'Live Location', screen: 'Location' },
  { label: 'Documents', screen: 'Documents' },
];

export default function MoreScreen() {
  const navigation = useNavigation<MoreNavProp>();
  const { signOut } = useAuthStore();
  const { family } = useFamilyStore();

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <View style={styles.container}>
      {/* Family info */}
      {family && (
        <View style={styles.familyCard}>
          <Text style={styles.familyName}>{family.name}</Text>
          <Text style={styles.inviteLabel}>Invite Code</Text>
          <Text style={styles.inviteCode}>{family.inviteCode}</Text>
          <Text style={styles.inviteHint}>
            Share this code with family members to join
          </Text>
        </View>
      )}

      {/* Nav items */}
      {items.map(item => (
        <TouchableOpacity
          key={item.screen}
          style={styles.row}
          onPress={() => navigation.navigate(item.screen)}
        >
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 16 },
  familyCard: {
    backgroundColor: '#4F6EF7',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  familyName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  inviteLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  inviteCode: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 8,
  },
  inviteHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  row: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: 17, color: '#1a1a1a' },
  chevron: { fontSize: 22, color: '#ccc' },
  signOutBtn: {
    margin: 16,
    marginTop: 'auto',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  signOutText: { color: '#ff3b30', fontWeight: '700', fontSize: 16 },
});
