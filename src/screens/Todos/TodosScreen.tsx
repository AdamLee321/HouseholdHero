import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  TodoList,
  subscribeToTodoLists,
  createTodoList,
  deleteTodoList,
} from '../../services/todoService';
import { HomeStackParamList } from '../../types';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'Todos'>;

export default function TodosScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { family, profile } = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';

  const [lists, setLists] = useState<TodoList[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'shared' | 'personal'>('shared');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!family) {
      return;
    }
    const unsub = subscribeToTodoLists(family.id, uid, data => {
      setLists(data);
      setLoading(false);
    });
    return unsub;
  }, [family]);

  const shared = lists.filter(l => l.type === 'shared');
  const personal = lists.filter(l => l.type === 'personal');

  async function handleCreate() {
    if (!title.trim() || !family) {
      return;
    }
    setCreating(true);
    try {
      await createTodoList(
        family.id,
        title,
        type,
        uid,
        profile?.displayName ?? 'Someone',
      );
      setTitle('');
      setType('shared');
      setModalVisible(false);
    } finally {
      setCreating(false);
    }
  }

  function handleDelete(list: TodoList) {
    Alert.alert('Delete List', `Delete "${list.title}" and all its items?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => family && deleteTodoList(family.id, list.id),
      },
    ]);
  }

  function renderList(list: TodoList) {
    return (
      <Swipeable
        key={list.id}
        renderRightActions={() => (
          <TouchableOpacity
            style={[styles.deleteAction, { backgroundColor: colors.danger }]}
            onPress={() => handleDelete(list)}
          >
            <Text style={styles.deleteActionText}>Delete</Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          style={[styles.row, { backgroundColor: colors.surface }]}
          onPress={() =>
            navigation.navigate('TodoList', {
              listId: list.id,
              title: list.title,
            })
          }
          activeOpacity={0.7}
        >
          <View style={styles.rowLeft}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              {list.title}
            </Text>
            <Text style={[styles.rowMeta, { color: colors.textTertiary }]}>
              {list.itemCount} item{list.itemCount !== 1 ? 's' : ''} ·{' '}
              {list.createdByName}
            </Text>
          </View>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor:
                  list.type === 'shared'
                    ? colors.primaryLight
                    : colors.surfaceSecondary,
              },
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                {
                  color:
                    list.type === 'shared'
                      ? colors.primary
                      : colors.textSecondary,
                },
              ]}
            >
              {list.type === 'shared' ? 'Shared' : 'Personal'}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: colors.textTertiary }]}>
            ›
          </Text>
        </TouchableOpacity>
      </Swipeable>
    );
  }

  const sections = [
    ...(shared.length > 0
      ? [
          { type: 'header', label: 'SHARED' },
          ...shared.map(l => ({ type: 'list', list: l })),
        ]
      : []),
    ...(personal.length > 0
      ? [
          { type: 'header', label: 'PERSONAL' },
          ...personal.map(l => ({ type: 'list', list: l })),
        ]
      : []),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : lists.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>✅</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No lists yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Tap + to create your first list
          </Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item, i) =>
            item.type === 'header' ? `header-${i}` : (item as any).list.id
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <Text
                  style={[styles.sectionHeader, { color: colors.textTertiary }]}
                >
                  {(item as any).label}
                </Text>
              );
            }
            return renderList((item as any).list);
          }}
          ItemSeparatorComponent={({ leadingItem }) =>
            leadingItem?.type === 'list' ? (
              <View
                style={[styles.separator, { backgroundColor: colors.border }]}
              />
            ) : null
          }
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 100 },
          ]}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.primary, bottom: insets.bottom + 30 },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Create list modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setModalVisible(false)}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View
              style={[styles.modalHandle, { backgroundColor: colors.border }]}
            />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              New List
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.text,
                },
              ]}
              placeholder="List name"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />

            {/* Type toggle */}
            <View
              style={[
                styles.typeToggle,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              {(['shared', 'personal'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeOption,
                    type === t && { backgroundColor: colors.surface },
                  ]}
                  onPress={() => setType(t)}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      {
                        color:
                          type === t ? colors.primary : colors.textTertiary,
                      },
                    ]}
                  >
                    {t === 'shared' ? '👨‍👩‍👧‍👦 Shared' : '🔒 Personal'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.addBtn,
                { backgroundColor: colors.primary },
                !title.trim() && { opacity: 0.5 },
              ]}
              onPress={handleCreate}
              disabled={!title.trim() || creating}
            >
              {creating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.addBtnText}>Create List</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, marginTop: 60 },
  list: { paddingTop: 8 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 15 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 8,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  chevron: { fontSize: 22 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  deleteAction: { justifyContent: 'center', alignItems: 'center', width: 80 },
  deleteActionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1 },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeOptionText: { fontWeight: '600', fontSize: 14 },
  addBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
