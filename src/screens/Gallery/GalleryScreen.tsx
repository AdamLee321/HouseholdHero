import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Text from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  GalleryPhoto,
  subscribeToPhotos,
  uploadPhoto,
} from '../../services/galleryService';
import { HomeStackParamList } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const H_PAD = 16;
const COL_GAP = 10;
const MEMBER_CARD_SIZE = (SCREEN_WIDTH - H_PAD * 2 - COL_GAP) / 2;

interface PhotoGroup {
  groupName: string;
  uploaderUid: string | null;
  photos: GalleryPhoto[];
}

function buildGroups(photos: GalleryPhoto[]): PhotoGroup[] {
  if (photos.length === 0) { return []; }
  const groups: PhotoGroup[] = [{ groupName: 'All Images', uploaderUid: null, photos }];
  const byUploader = new Map<string, { name: string; photos: GalleryPhoto[] }>();
  for (const p of photos) {
    if (!byUploader.has(p.uploadedBy)) {
      byUploader.set(p.uploadedBy, { name: p.uploadedByName, photos: [] });
    }
    byUploader.get(p.uploadedBy)!.photos.push(p);
  }
  byUploader.forEach((val, uid) => {
    groups.push({ groupName: val.name, uploaderUid: uid, photos: val.photos });
  });
  return groups;
}

export default function GalleryScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { family, profile } = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';
  const ACCENT = colors.tiles.gallery.icon;

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!family) { return; }
    return subscribeToPhotos(family.id, setPhotos);
  }, [family]);

  const groups = buildGroups(photos);
  // Split into hero (All Images) and member pairs for 2-col layout
  const heroGroup = groups[0] ?? null;
  const memberGroups = groups.slice(1);
  // Pair members into rows of 2
  const memberRows: PhotoGroup[][] = [];
  for (let i = 0; i < memberGroups.length; i += 2) {
    memberRows.push(memberGroups.slice(i, i + 2));
  }

  function goToGroup(group: PhotoGroup) {
    navigation.navigate('GalleryGroup', {
      groupName: group.groupName,
      uploaderUid: group.uploaderUid,
    });
  }

  function pickSource() {
    Alert.alert('Add Photo', 'Choose a source', [
      { text: 'Camera', onPress: openCamera },
      { text: 'Photo Library', onPress: openLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function openCamera() {
    const result = await launchCamera({ mediaType: 'photo', quality: 0.8, saveToPhotos: false });
    if (result.didCancel || !result.assets?.[0]?.uri) { return; }
    await handleUpload(result.assets[0].uri);
  }

  async function openLibrary() {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 });
    if (result.didCancel || !result.assets?.[0]?.uri) { return; }
    await handleUpload(result.assets[0].uri);
  }

  async function handleUpload(uri: string) {
    if (!family) { return; }
    try {
      setUploading(true);
      setUploadProgress(0);
      await uploadPhoto(family.id, uid, profile?.displayName ?? 'Unknown', uri, pct => setUploadProgress(pct));
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message ?? 'Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function renderMemberCard(group: PhotoGroup) {
    const cover = group.photos[0];
    return (
      <TouchableOpacity
        key={group.uploaderUid}
        style={styles.memberCard}
        activeOpacity={0.85}
        onPress={() => goToGroup(group)}
      >
        {cover ? (
          <Image source={{ uri: cover.downloadURL }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
        )}
        {/* Gradient simulation: faded overlay at bottom */}
        <View style={styles.cardGradient} />
        <View style={styles.cardMeta}>
          <Text style={styles.cardMetaName} numberOfLines={1}>{group.groupName}</Text>
          <Text style={styles.cardMetaCount}>{group.photos.length}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const emptyCard = (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
        <Text style={styles.emptyEmoji}>📸</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No photos yet</Text>
        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
          Tap + to add the first photo to your family album.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={memberRows}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        ListEmptyComponent={!heroGroup ? emptyCard : null}
        ListHeaderComponent={
          heroGroup ? (
            <View style={styles.header}>
              {/* Hero card — All Images */}
              <TouchableOpacity
                style={styles.heroCard}
                activeOpacity={0.85}
                onPress={() => goToGroup(heroGroup)}
              >
                {heroGroup.photos[0] ? (
                  <Image
                    source={{ uri: heroGroup.photos[0].downloadURL }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />
                )}
                <View style={styles.heroGradient} />
                <View style={styles.heroMeta}>
                  <View>
                    <Text style={styles.heroLabel}>All Images</Text>
                    <Text style={styles.heroCount}>
                      {heroGroup.photos.length} {heroGroup.photos.length === 1 ? 'photo' : 'photos'}
                    </Text>
                  </View>
                  <View style={[styles.heroBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Text style={styles.heroBadgeText}>›</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {memberGroups.length > 0 && (
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  By Member
                </Text>
              )}
            </View>
          ) : null
        }
        renderItem={({ item: row }) => (
          <View style={styles.memberRow}>
            {row.map(renderMemberCard)}
            {/* Empty spacer if odd count */}
            {row.length === 1 && <View style={styles.memberCard} />}
          </View>
        )}
      />

      {/* Upload progress */}
      {uploading && (
        <View style={styles.uploadOverlay}>
          <View style={[styles.uploadCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator color={ACCENT} size="large" />
            <Text style={[styles.uploadText, { color: colors.text }]}>
              Uploading…{uploadProgress > 0 ? ` ${Math.round(uploadProgress * 100)}%` : ''}
            </Text>
          </View>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: ACCENT, bottom: insets.bottom + 30 }]}
        onPress={pickSource}
        disabled={uploading}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: H_PAD, paddingTop: H_PAD },

  // Header
  header: { marginBottom: 4 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 10,
  },

  // Hero card
  heroCard: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroMeta: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  heroLabel: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  heroCount: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  heroBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeText: { color: '#fff', fontSize: 20, fontWeight: '300', lineHeight: 24 },

  // Member grid
  memberRow: {
    flexDirection: 'row',
    gap: COL_GAP,
    marginBottom: COL_GAP,
  },
  memberCard: {
    width: MEMBER_CARD_SIZE,
    height: MEMBER_CARD_SIZE,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cardMeta: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardMetaName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
    marginRight: 4,
  },
  cardMetaCount: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty
  emptyWrap: { padding: 16, marginTop: 40 },
  emptyCard: { borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Upload overlay
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    minWidth: 200,
  },
  uploadText: { fontSize: 16, fontWeight: '600' },

  // FAB
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
