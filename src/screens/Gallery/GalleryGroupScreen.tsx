import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Alert,
  Dimensions,
  Share,
  Platform,
  StatusBar,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Text from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import RNFS from 'react-native-fs-turbo';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { SheetManager } from 'react-native-actions-sheet';
import { useTheme } from '../../theme/useTheme';
import Orientation from 'react-native-orientation-locker';
import ZoomableImage from '../../components/ZoomableImage';
import { useFamilyStore } from '../../store/familyStore';
import {
  GalleryPhoto,
  subscribeToPhotos,
  deletePhoto,
} from '../../services/galleryService';
import { HomeStackParamList } from '../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLUMNS = 3;
const GAP = 2;
const CELL_SIZE = (SCREEN_WIDTH - GAP * (COLUMNS + 1)) / COLUMNS;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

async function downloadToTemp(url: string, filename: string): Promise<string> {
  const ext = filename.split('.').pop() ?? 'jpg';
  const dest = `${RNFS.CachesDirectoryPath}/${Date.now()}.${ext}`;
  await RNFS.downloadFile({ fromUrl: url, toFile: dest }).promise;
  return dest;
}

export default function GalleryGroupScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { family } = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';
  const isAdmin = uid === family?.createdBy;
  const ACCENT = colors.tiles.gallery.icon;

  const route = useRoute<RouteProp<HomeStackParamList, 'GalleryGroup'>>();
  const { uploaderUid } = route.params;

  const [allPhotos, setAllPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoomUri, setZoomUri] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const pagerRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!family) { return; }
    return subscribeToPhotos(family.id, setAllPhotos);
  }, [family]);

  const photos = useMemo(() => {
    if (uploaderUid === null) { return allPhotos; }
    return allPhotos.filter(p => p.uploadedBy === uploaderUid);
  }, [allPhotos, uploaderUid]);

  const selectedPhoto = selectedIndex !== null ? (photos[selectedIndex] ?? null) : null;

  function openViewer(index: number) {
    setSelectedIndex(index);
  }

  function closeViewer() {
    setSelectedIndex(null);
  }

  function openZoom(uri: string) {
    Orientation.unlockAllOrientations();
    setZoomUri(uri);
  }

  function closeZoom() {
    Orientation.lockToPortrait();
    setZoomUri(null);
  }

  function onPagerScroll(e: any) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (idx !== selectedIndex && idx >= 0 && idx < photos.length) {
      setSelectedIndex(idx);
    }
  }

  async function handleDownload() {
    if (!selectedPhoto || actionBusy) { return; }
    try {
      setActionBusy(true);
      const localPath = await downloadToTemp(selectedPhoto.downloadURL, selectedPhoto.id + '.jpg');
      const fileUri = Platform.OS === 'android' ? 'file://' + localPath : localPath;
      await CameraRoll.saveAsset(fileUri, { type: 'photo' });
      Alert.alert('Saved', 'Photo saved to your camera roll.');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not save photo.');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleShare() {
    if (!selectedPhoto || actionBusy) { return; }
    try {
      setActionBusy(true);
      const localPath = await downloadToTemp(selectedPhoto.downloadURL, selectedPhoto.id + '.jpg');
      const fileUri = Platform.OS === 'android' ? 'file://' + localPath : localPath;
      await Share.share(
        Platform.OS === 'ios'
          ? { url: fileUri }
          : { message: selectedPhoto.downloadURL },
      );
    } catch (err: any) {
      if ((err as any)?.code !== 'ECANCEL') {
        Alert.alert('Error', err?.message ?? 'Could not share photo.');
      }
    } finally {
      setActionBusy(false);
    }
  }

  function confirmDelete(photo: GalleryPhoto) {
    if (!family) { return; }
    Alert.alert('Delete Photo', 'Remove this photo from the family gallery?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          closeViewer();
          try {
            await deletePhoto(family.id, photo.id, photo.storagePath);
          } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Could not delete photo.');
          }
        },
      },
    ]);
  }

  // ── Grid ─────────────────────────────────────────────────────────────────────

  function renderItem({ item, index }: { item: GalleryPhoto; index: number }) {
    return (
      <TouchableOpacity
        style={styles.cell}
        onPress={() => openViewer(index)}
        activeOpacity={0.85}
      >
        <Image
          source={{ uri: item.downloadURL }}
          style={styles.cellImage}
          resizeMode="cover"
        />
        {uploaderUid === null && (
          <View style={styles.cellOverlay}>
            <Text style={styles.cellName} numberOfLines={1}>
              {item.uploadedByName}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // ── Pager page ───────────────────────────────────────────────────────────────

  function renderPage({ item }: { item: GalleryPhoto }) {
    return (
      <TouchableOpacity
        style={styles.page}
        activeOpacity={1}
        onPress={() => openZoom(item.downloadURL)}
      >
        <Image
          source={{ uri: item.downloadURL }}
          style={styles.pageImage}
          resizeMode="contain"
        />
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
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <Text style={styles.emptyEmoji}>📷</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No photos here</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Photos uploaded will appear here.
              </Text>
            </View>
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      />

      {/* ── Full-screen pager viewer ────────────────────────────────────────── */}
      <Modal
        visible={selectedIndex !== null}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        onRequestClose={closeViewer}
      >
        <View style={styles.viewer}>
          {/* Swipeable pager */}
          {selectedIndex !== null && (
            <FlatList
              ref={pagerRef}
              data={photos}
              keyExtractor={item => item.id}
              renderItem={renderPage}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={selectedIndex}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              onMomentumScrollEnd={onPagerScroll}
            />
          )}

          {/* ── Top bar ─────────────────────────────────────────────────── */}
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity style={styles.topBtn} onPress={closeViewer}>
              <Text style={styles.topBtnText}>✕</Text>
            </TouchableOpacity>

            {photos.length > 1 && selectedIndex !== null && (
              <Text style={styles.indexLabel}>
                {selectedIndex + 1} / {photos.length}
              </Text>
            )}

            <TouchableOpacity style={styles.topBtn} onPress={() => selectedPhoto && SheetManager.show('photo-actions', { payload: { photo: selectedPhoto, isAdmin, uid, onDownload: handleDownload, onShare: handleShare, onDelete: confirmDelete } })}>
              <Text style={styles.topBtnMore}>•••</Text>
            </TouchableOpacity>
          </View>

          {/* ── Bottom info bar ─────────────────────────────────────────── */}
          {selectedPhoto && (
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
              <Text style={styles.viewerName}>{selectedPhoto.uploadedByName}</Text>
              <Text style={styles.viewerDate}>{formatDate(selectedPhoto.createdAt)}</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* ── Fullscreen zoom viewer ─────────────────────────────────────────── */}
      <Modal
        visible={zoomUri !== null}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        onRequestClose={closeZoom}
      >
        <StatusBar hidden />
        <GestureHandlerRootView style={styles.zoomViewer}>
          {zoomUri !== null && <ZoomableImage uri={zoomUri} />}
          <TouchableOpacity
            style={[styles.topBtn, styles.zoomCloseBtn]}
            onPress={closeZoom}
          >
            <Text style={styles.topBtnText}>✕</Text>
          </TouchableOpacity>
        </GestureHandlerRootView>
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
  emptyCard: { borderRadius: 16, padding: 32, alignItems: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Viewer
  viewer: { flex: 1, backgroundColor: '#000' },

  // Pager
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  topBtnMore: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  indexLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },

  // Zoom viewer
  zoomViewer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomCloseBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
  },

  // Bottom info bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  viewerName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  viewerDate: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },

});
