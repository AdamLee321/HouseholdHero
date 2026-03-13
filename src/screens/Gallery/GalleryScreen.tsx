import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  GalleryPhoto,
  subscribeToPhotos,
  uploadPhoto,
  deletePhoto,
} from '../../services/galleryService';

const COLUMNS = 3;
const GAP = 2;
const CELL_SIZE =
  (Dimensions.get('window').width - GAP * (COLUMNS + 1)) / COLUMNS;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function GalleryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { family, profile } = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';
  const isAdmin = uid === family?.createdBy;
  const ACCENT = colors.tiles.gallery.icon;

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    if (!family) {
      return;
    }
    const unsub = subscribeToPhotos(family.id, setPhotos);
    return unsub;
  }, [family]);

  function pickSource() {
    Alert.alert('Add Photo', 'Choose a source', [
      {
        text: 'Camera',
        onPress: () => openCamera(),
      },
      {
        text: 'Photo Library',
        onPress: () => openLibrary(),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function openCamera() {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      saveToPhotos: false,
    });
    if (result.didCancel || !result.assets?.[0]?.uri) {
      return;
    }
    await handleUpload(result.assets[0].uri);
  }

  async function openLibrary() {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    });
    if (result.didCancel || !result.assets?.[0]?.uri) {
      return;
    }
    await handleUpload(result.assets[0].uri);
  }

  async function handleUpload(uri: string) {
    if (!family) {
      return;
    }
    try {
      setUploading(true);
      setUploadProgress(0);
      await uploadPhoto(
        family.id,
        uid,
        profile?.displayName ?? 'Unknown',
        uri,
        pct => setUploadProgress(pct),
      );
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message ?? 'Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function confirmDelete(photo: GalleryPhoto) {
    if (!family) {
      return;
    }
    Alert.alert('Delete Photo', 'Remove this photo from the family gallery?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSelected(null);
          try {
            await deletePhoto(family.id, photo.id, photo.storagePath);
          } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Could not delete photo.');
          }
        },
      },
    ]);
  }

  function renderItem({ item }: { item: GalleryPhoto }) {
    return (
      <TouchableOpacity
        style={styles.cell}
        onPress={() => setSelected(item)}
        activeOpacity={0.85}
      >
        <Image
          source={{ uri: item.downloadURL }}
          style={styles.cellImage}
          resizeMode="cover"
        />
        <View style={styles.cellOverlay}>
          <Text style={styles.cellName} numberOfLines={1}>
            {item.uploadedByName}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={photos}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View
              style={[styles.emptyCard, { backgroundColor: colors.surface }]}
            >
              <Text style={styles.emptyEmoji}>📸</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No photos yet
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Tap + to add the first photo to your family album.
              </Text>
            </View>
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      />

      {/* Upload progress overlay */}
      {uploading && (
        <View style={styles.uploadOverlay}>
          <View
            style={[styles.uploadCard, { backgroundColor: colors.surface }]}
          >
            <ActivityIndicator color={ACCENT} size="large" />
            <Text style={[styles.uploadText, { color: colors.text }]}>
              Uploading…
              {uploadProgress > 0
                ? ` ${Math.round(uploadProgress * 100)}%`
                : ''}
            </Text>
          </View>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: ACCENT, bottom: insets.bottom + 30 },
        ]}
        onPress={pickSource}
        disabled={uploading}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Full-screen viewer */}
      <Modal
        visible={!!selected}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <View style={styles.viewer}>
            {/* Close */}
            <TouchableOpacity
              style={[styles.viewerClose, { top: insets.top + 12 }]}
              onPress={() => setSelected(null)}
            >
              <Text style={styles.viewerCloseText}>✕</Text>
            </TouchableOpacity>

            {/* Photo */}
            <Image
              source={{ uri: selected.downloadURL }}
              style={styles.viewerImage}
              resizeMode="contain"
            />

            {/* Info + delete bar */}
            <View
              style={[styles.viewerBar, { paddingBottom: insets.bottom + 12 }]}
            >
              <View>
                <Text style={styles.viewerName}>{selected.uploadedByName}</Text>
                <Text style={styles.viewerDate}>
                  {formatDate(selected.createdAt)}
                </Text>
              </View>
              {(isAdmin || selected.uploadedBy === uid) && (
                <TouchableOpacity
                  style={[styles.deleteBtn, { backgroundColor: colors.danger }]}
                  onPress={() => confirmDelete(selected)}
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  row: { gap: GAP, paddingHorizontal: GAP, marginBottom: GAP },
  cell: { width: CELL_SIZE, height: CELL_SIZE },
  cellImage: { width: '100%', height: '100%' },
  cellOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  cellName: { color: '#fff', fontSize: 10, fontWeight: '600' },

  emptyWrap: { padding: 16, marginTop: 40 },
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

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

  // Full-screen viewer
  viewer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  viewerClose: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerCloseText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  viewerName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  viewerDate: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  deleteBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
