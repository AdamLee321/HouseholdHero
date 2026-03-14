import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import Text from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  DocumentFolder,
  subscribeToFolders,
  subscribeToDocumentCounts,
  seedSharedFolders,
  ensurePrivateFolder,
  addFolder,
  updateFolder,
  deleteFolder,
} from '../../services/documentService';
import AddFolderModal from './components/AddFolderModal';
import { HomeStackParamList } from '../../types';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (width - 32 - CARD_GAP) / 2;

type Nav = NativeStackNavigationProp<HomeStackParamList>;
type SortBy = 'az' | 'za' | 'newest' | 'oldest';
type ViewMode = 'grid' | 'list';

function visibilityLabel(v: DocumentFolder['visibility']): string {
  if (v === 'private') {
    return '🔒 Private';
  }
  if (v === 'members') {
    return '👥 Limited';
  }
  return '🌐 Everyone';
}

function sortFolders(
  folders: DocumentFolder[],
  sortBy: SortBy,
): DocumentFolder[] {
  return [...folders].sort((a, b) => {
    if (sortBy === 'az') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'za') {
      return b.name.localeCompare(a.name);
    }
    if (sortBy === 'oldest') {
      return a.createdAt - b.createdAt;
    }
    return b.createdAt - a.createdAt; // newest
  });
}

// ─── Grid card ────────────────────────────────────────────────────────────────
interface FolderCardProps {
  folder: DocumentFolder;
  count: number;
  isAdmin: boolean;
  uid: string;
  onPress: () => void;
  onLongPress: () => void;
}

function FolderCard({
  folder,
  count,
  isAdmin,
  uid,
  onPress,
  onLongPress,
}: FolderCardProps) {
  const { colors } = useTheme();
  const canManage = isAdmin || folder.createdBy === uid;
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={onPress}
      onLongPress={canManage ? onLongPress : undefined}
      delayLongPress={400}
      activeOpacity={0.75}
    >
      <View style={[styles.cardBar, { backgroundColor: folder.color }]} />
      <View style={styles.cardBody}>
        <Text style={styles.cardEmoji}>{folder.emoji}</Text>
        <Text
          style={[styles.cardName, { color: colors.text }]}
          numberOfLines={2}
        >
          {folder.name}
        </Text>
        <Text style={[styles.cardCount, { color: colors.textTertiary }]}>
          {count} {count === 1 ? 'file' : 'files'}
        </Text>
        <Text style={[styles.cardVisibility, { color: folder.color }]}>
          {visibilityLabel(folder.visibility)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── List row ─────────────────────────────────────────────────────────────────
function FolderRow({
  folder,
  count,
  isAdmin,
  uid,
  onPress,
  onLongPress,
}: FolderCardProps) {
  const { colors } = useTheme();
  const canManage = isAdmin || folder.createdBy === uid;
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.surface }]}
      onPress={onPress}
      onLongPress={canManage ? onLongPress : undefined}
      delayLongPress={400}
      activeOpacity={0.75}
    >
      <View style={[styles.rowAccent, { backgroundColor: folder.color }]} />
      <View
        style={[styles.rowIconWrap, { backgroundColor: folder.color + '22' }]}
      >
        <Text style={styles.rowEmoji}>{folder.emoji}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text
          style={[styles.rowName, { color: colors.text }]}
          numberOfLines={1}
        >
          {folder.name}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.textTertiary }]}>
          {count} {count === 1 ? 'file' : 'files'} ·{' '}
          {visibilityLabel(folder.visibility)}
        </Text>
      </View>
      <Text style={[styles.rowChevron, { color: colors.textTertiary }]}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DocumentsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { family, profile } = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';
  const role = profile?.role ?? 'parent';
  const isAdmin = uid === family?.createdBy || role === 'admin';
  const isChild = role === 'child';
  const ACCENT = colors.tiles.documents.icon;

  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<
    DocumentFolder | undefined
  >();
  const [showOptions, setShowOptions] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('oldest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Load persisted preferences on mount
  useEffect(() => {
    AsyncStorage.multiGet(['docs_sort_by', 'docs_view_mode']).then(pairs => {
      const sort = pairs[0][1] as SortBy | null;
      const view = pairs[1][1] as ViewMode | null;
      if (sort) {
        setSortBy(sort);
      }
      if (view) {
        setViewMode(view);
      }
    });
  }, []);

  const sortedFolders = useMemo(
    () => sortFolders(folders, sortBy),
    [folders, sortBy],
  );

  // Header more button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowOptions(true)}
          style={styles.headerBtn}
        >
          <Text style={[styles.headerMoreText, { color: ACCENT }]}>•••</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, ACCENT]);

  // Seed defaults then subscribe
  useEffect(() => {
    if (!family) {
      return;
    }
    async function seed() {
      try {
        await seedSharedFolders(family!.id, uid);
        if (!isChild) {
          await ensurePrivateFolder(family!.id, uid);
        }
      } catch (e) {
        console.warn('Document folder seeding failed:', e);
      }
    }
    seed();
  }, [family, uid, isChild]);

  useEffect(() => {
    if (!family) {
      return;
    }
    return subscribeToFolders(family.id, uid, role, setFolders);
  }, [family, uid, role]);

  useEffect(() => {
    if (!family) {
      return;
    }
    return subscribeToDocumentCounts(family.id, setCounts);
  }, [family]);

  function openFolder(folder: DocumentFolder) {
    navigation.navigate('FolderScreen', {
      folderId: folder.id,
      folderName: folder.name,
      folderColor: folder.color,
      folderEmoji: folder.emoji,
      folderVisibility: folder.visibility,
      folderCreatedBy: folder.createdBy,
    });
  }

  function handleLongPress(folder: DocumentFolder) {
    const canDelete =
      !folder.isDefault && (isAdmin || folder.createdBy === uid);
    const options: {
      text: string;
      style?: 'cancel' | 'destructive';
      onPress?: () => void;
    }[] = [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Edit',
        onPress: () => {
          setEditingFolder(folder);
          setShowAddFolder(true);
        },
      },
    ];
    if (canDelete) {
      options.push({
        text: 'Delete Folder',
        style: 'destructive',
        onPress: () => confirmDelete(folder),
      });
    }
    Alert.alert(`${folder.emoji} ${folder.name}`, undefined, options);
  }

  function confirmDelete(folder: DocumentFolder) {
    Alert.alert(
      'Delete Folder',
      `Remove "${folder.name}" and all its files? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFolder(family!.id, folder.id);
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not delete folder.');
            }
          },
        },
      ],
    );
  }

  async function handleSaveFolder(
    data: Pick<
      DocumentFolder,
      'name' | 'color' | 'emoji' | 'visibility' | 'visibleTo'
    >,
  ) {
    if (!family) {
      return;
    }
    if (editingFolder) {
      await updateFolder(family.id, editingFolder.id, data);
    } else {
      await addFolder(family.id, uid, data);
    }
  }

  const SORT_OPTIONS: { key: SortBy; label: string }[] = [
    { key: 'az', label: 'A → Z' },
    { key: 'za', label: 'Z → A' },
    { key: 'newest', label: 'Newest first' },
    { key: 'oldest', label: 'Oldest first' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* FlatList — key forces remount when numColumns changes */}
      <FlatList
        key={viewMode}
        data={sortedFolders}
        keyExtractor={item => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={
          viewMode === 'grid' ? styles.columnWrapper : undefined
        }
        renderItem={({ item }) =>
          viewMode === 'grid' ? (
            <FolderCard
              folder={item}
              count={counts[item.id] ?? 0}
              isAdmin={isAdmin}
              uid={uid}
              onPress={() => openFolder(item)}
              onLongPress={() => handleLongPress(item)}
            />
          ) : (
            <FolderRow
              folder={item}
              count={counts[item.id] ?? 0}
              isAdmin={isAdmin}
              uid={uid}
              onPress={() => openFolder(item)}
              onLongPress={() => handleLongPress(item)}
            />
          )
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.emptyEmoji}>📁</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Loading folders…
            </Text>
          </View>
        }
        contentContainerStyle={[
          viewMode === 'grid' ? styles.listGrid : styles.listList,
          { paddingBottom: insets.bottom + 100 },
        ]}
      />

      {/* FAB — hidden for child roles */}
      {!isChild && (
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: ACCENT, bottom: insets.bottom + 30 },
          ]}
          onPress={() => {
            setEditingFolder(undefined);
            setShowAddFolder(true);
          }}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Add / Edit Folder Modal */}
      <AddFolderModal
        visible={showAddFolder}
        familyId={family?.id ?? ''}
        uid={uid}
        editingFolder={editingFolder}
        onClose={() => {
          setShowAddFolder(false);
          setEditingFolder(undefined);
        }}
        onSave={handleSaveFolder}
      />

      {/* Options sheet */}
      <Modal
        visible={showOptions}
        animationType="slide"
        transparent
        onRequestClose={() => setShowOptions(false)}
      >
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setShowOptions(false)}
        >
          <View
            style={[
              styles.optionsSheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View
              style={[styles.optionsHandle, { backgroundColor: colors.border }]}
            />

            {/* View mode */}
            <Text
              style={[styles.optionsSection, { color: colors.textSecondary }]}
            >
              View
            </Text>
            <View style={styles.viewToggleRow}>
              {(['grid', 'list'] as ViewMode[]).map(v => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.viewToggleBtn,
                    {
                      backgroundColor:
                        viewMode === v ? ACCENT : colors.surfaceSecondary,
                      borderColor: viewMode === v ? ACCENT : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setViewMode(v);
                    AsyncStorage.setItem('docs_view_mode', v);
                    setShowOptions(false);
                  }}
                >
                  <Text style={styles.viewToggleEmoji}>
                    {v === 'grid' ? '⊞' : '≡'}
                  </Text>
                  <Text
                    style={[
                      styles.viewToggleLabel,
                      { color: viewMode === v ? '#fff' : colors.text },
                    ]}
                  >
                    {v === 'grid' ? 'Grid' : 'List'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sort */}
            <Text
              style={[styles.optionsSection, { color: colors.textSecondary }]}
            >
              Sort by
            </Text>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.optionRow, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setSortBy(opt.key);
                  AsyncStorage.setItem('docs_sort_by', opt.key);
                  setShowOptions(false);
                }}
              >
                <Text style={[styles.optionLabel, { color: colors.text }]}>
                  {opt.label}
                </Text>
                {sortBy === opt.key && (
                  <Text style={[styles.optionCheck, { color: ACCENT }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  headerMoreText: { fontSize: 18, fontWeight: '700', letterSpacing: 2 },

  listGrid: { padding: 16, gap: CARD_GAP },
  listList: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  columnWrapper: { gap: CARD_GAP },

  // Grid card
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardBar: { height: 6 },
  cardBody: { padding: 14, gap: 4 },
  cardEmoji: { fontSize: 28, marginBottom: 4 },
  cardName: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  cardCount: { fontSize: 12 },
  cardVisibility: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  // List row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  rowAccent: { width: 5, alignSelf: 'stretch' },
  rowIconWrap: {
    width: 48,
    height: 48,
    margin: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowEmoji: { fontSize: 22 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  rowChevron: { fontSize: 22, fontWeight: '300', marginRight: 14 },

  emptyCard: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginTop: 40,
    marginHorizontal: 16,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },

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

  // Options sheet
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  optionsSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  optionsHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  optionsSection: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
    marginTop: 4,
  },

  viewToggleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  viewToggleEmoji: { fontSize: 18 },
  viewToggleLabel: { fontSize: 15, fontWeight: '600' },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLabel: { flex: 1, fontSize: 16 },
  optionCheck: { fontSize: 18, fontWeight: '700' },
});
