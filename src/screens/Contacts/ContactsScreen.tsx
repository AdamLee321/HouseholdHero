import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import Text from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  EmergencyContact,
  subscribeToContacts,
  addContact,
  updateContact,
  deleteContact,
} from '../../services/contactService';
import AddContactModal from './components/AddContactModal';
import Lucide from '@react-native-vector-icons/lucide';
import Feather from '@react-native-vector-icons/feather';

function callPhone(phone: string) {
  const url = `tel:${phone.replace(/\s/g, '')}`;
  Linking.canOpenURL(url).then(supported => {
    if (supported) {
      Linking.openURL(url);
    }
  });
}

interface ContactRowProps {
  contact: EmergencyContact;
  isAdmin: boolean;
  isOwn: boolean;
  colors: ReturnType<typeof import('../../theme/useTheme').useTheme>['colors'];
  onEdit: () => void;
  onDelete: () => void;
}

function ContactRow({
  contact,
  isAdmin,
  isOwn,
  colors,
  onEdit,
  onDelete,
}: ContactRowProps) {
  const ACCENT = colors.success;
  const canDelete =
    (contact.type === 'shared' && isAdmin && !contact.locked) ||
    (contact.type === 'personal' && isOwn);

  const renderRightActions = () => {
    if (!canDelete) {
      return null;
    }
    return (
      <TouchableOpacity
        style={[styles.deleteAction, { backgroundColor: colors.danger }]}
        onPress={onDelete}
      >
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View style={[styles.contactRow, { backgroundColor: colors.surface }]}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: ACCENT + '22' }]}>
          <Text style={[styles.avatarEmoji]}>
            {contact.type === 'shared' ? '🚨' : '👤'}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.contactInfo}>
          <View style={styles.contactNameRow}>
            <Text style={[styles.contactName, { color: colors.text }]}>
              {contact.name}
            </Text>
            {contact.locked && <Text style={styles.lockIcon}>🔒</Text>}
          </View>
          {!!contact.relation && (
            <Text
              style={[styles.contactRelation, { color: colors.textSecondary }]}
            >
              {contact.relation}
            </Text>
          )}
          <Text style={[styles.contactPhone, { color: colors.textTertiary }]}>
            {contact.phone}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.contactActions}>
          {/* Edit button — admin or own contact */}
          {(isAdmin || isOwn) && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.border }]}
              onPress={onEdit}
            >
              <Feather name="edit-2" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {/* Call button */}
          <TouchableOpacity
            style={[styles.callBtn, { backgroundColor: ACCENT }]}
            onPress={() => callPhone(contact.phone)}
          >
            <Lucide name="phone" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Swipeable>
  );
}

export default function ContactsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { family } = useFamilyStore();

  const uid = auth().currentUser?.uid ?? '';
  const isAdmin = uid === family?.createdBy;

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(
    null,
  );

  useEffect(() => {
    if (!family) {
      return;
    }
    const unsub = subscribeToContacts(family.id, uid, setContacts);
    return unsub;
  }, [family, uid]);

  const sharedContacts = contacts.filter(c => c.type === 'shared');
  const personalContacts = contacts.filter(c => c.type === 'personal');

  async function handleAdd(params: {
    name: string;
    phone: string;
    relation: string;
    type: 'shared' | 'personal';
    locked: boolean;
  }) {
    if (!family) {
      return;
    }
    await addContact(family.id, {
      ...params,
      ownerId: params.type === 'personal' ? uid : null,
      ownerName: null,
      addedBy: uid,
    });
  }

  async function handleEdit(fields: {
    name: string;
    phone: string;
    relation: string;
    locked: boolean;
  }) {
    if (!family || !editingContact) {
      return;
    }
    await updateContact(family.id, editingContact.id, fields);
    setEditingContact(null);
  }

  async function handleDelete(contact: EmergencyContact) {
    if (!family) {
      return;
    }
    Alert.alert(
      'Delete Contact',
      `Remove "${contact.name}" from emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteContact(family.id, contact.id),
        },
      ],
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={[]}
        keyExtractor={() => ''}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* Admin badge */}
            {isAdmin && (
              <View
                style={[
                  styles.adminBadge,
                  { backgroundColor: colors.tiles.contacts.bg },
                ]}
              >
                <Text
                  style={[
                    styles.adminBadgeText,
                    { color: colors.tiles.contacts.icon },
                  ]}
                >
                  ⚙️ You manage shared contacts
                </Text>
              </View>
            )}

            {/* Shared contacts */}
            <Text
              style={[styles.sectionHeader, { color: colors.textSecondary }]}
            >
              Family Contacts
            </Text>
            {sharedContacts.length === 0 ? (
              <View
                style={[
                  styles.emptySection,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={[
                    styles.emptySectionText,
                    { color: colors.textTertiary },
                  ]}
                >
                  {isAdmin
                    ? 'Add family emergency contacts with the + button'
                    : 'No family contacts added yet'}
                </Text>
              </View>
            ) : (
              sharedContacts.map(c => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  isAdmin={isAdmin}
                  isOwn={false}
                  colors={colors}
                  onEdit={() => {
                    setEditingContact(c);
                    setModalVisible(true);
                  }}
                  onDelete={() => handleDelete(c)}
                />
              ))
            )}

            {/* Personal contacts */}
            <Text
              style={[
                styles.sectionHeader,
                { color: colors.textSecondary, marginTop: 24 },
              ]}
            >
              My Contacts
            </Text>
            {personalContacts.length === 0 ? (
              <View
                style={[
                  styles.emptySection,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={[
                    styles.emptySectionText,
                    { color: colors.textTertiary },
                  ]}
                >
                  Add your own personal emergency contacts
                </Text>
              </View>
            ) : (
              personalContacts.map(c => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  isAdmin={isAdmin}
                  isOwn={c.ownerId === uid}
                  colors={colors}
                  onEdit={() => {
                    setEditingContact(c);
                    setModalVisible(true);
                  }}
                  onDelete={() => handleDelete(c)}
                />
              ))
            )}
          </>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.success,
            bottom: insets.bottom + 30,
          },
        ]}
        onPress={() => {
          setEditingContact(null);
          setModalVisible(true);
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddContactModal
        visible={modalVisible}
        isAdmin={isAdmin}
        editContact={editingContact}
        onClose={() => {
          setModalVisible(false);
          setEditingContact(null);
        }}
        onAdd={handleAdd}
        onEdit={handleEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 16 },

  adminBadge: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  adminBadgeText: { fontSize: 13, fontWeight: '600' },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },

  emptySection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  emptySectionText: { fontSize: 13, textAlign: 'center' },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarEmoji: { fontSize: 20 },
  contactInfo: { flex: 1 },
  contactNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contactName: { fontSize: 15, fontWeight: '600' },
  lockIcon: { fontSize: 12 },
  contactRelation: { fontSize: 12, marginTop: 1 },
  contactPhone: { fontSize: 12, marginTop: 2 },

  contactActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 8,
    borderRadius: 12,
  },
  deleteText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 36, fontWeight: '300' },
});
