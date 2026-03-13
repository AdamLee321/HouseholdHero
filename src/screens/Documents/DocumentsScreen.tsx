import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import {
  pick,
  types,
  isErrorWithCode,
  errorCodes,
} from '@react-native-documents/picker';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  FamilyDocument,
  subscribeToDocuments,
  uploadDocument,
  deleteDocument,
} from '../../services/documentService';

function fileEmoji(mimeType: string): string {
  if (mimeType === 'application/pdf') {
    return '📄';
  }
  if (mimeType.startsWith('image/')) {
    return '🖼️';
  }
  if (mimeType.startsWith('video/')) {
    return '🎬';
  }
  if (mimeType.startsWith('audio/')) {
    return '🎵';
  }
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType.includes('csv')
  ) {
    return '📊';
  }
  if (
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    mimeType.includes('text')
  ) {
    return '📝';
  }
  if (mimeType.includes('zip') || mimeType.includes('compressed')) {
    return '🗜️';
  }
  return '📎';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface DocRowProps {
  doc: FamilyDocument;
  canDelete: boolean;
  accentColor: string;
  colors: ReturnType<typeof import('../../theme/useTheme').useTheme>['colors'];
  onDelete: () => void;
}

function DocRow({
  doc,
  canDelete,
  accentColor,
  colors,
  onDelete,
}: DocRowProps) {
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
      <TouchableOpacity
        style={[styles.docRow, { backgroundColor: colors.surface }]}
        onPress={() => Linking.openURL(doc.downloadURL)}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View
          style={[styles.iconBadge, { backgroundColor: accentColor + '22' }]}
        >
          <Text style={styles.iconEmoji}>{fileEmoji(doc.mimeType)}</Text>
        </View>

        {/* Info */}
        <View style={styles.docInfo}>
          <Text
            style={[styles.docName, { color: colors.text }]}
            numberOfLines={1}
          >
            {doc.name}
          </Text>
          <Text style={[styles.docMeta, { color: colors.textSecondary }]}>
            {formatSize(doc.size)} · {doc.uploadedByName}
          </Text>
          <Text style={[styles.docDate, { color: colors.textTertiary }]}>
            {formatDate(doc.createdAt)}
          </Text>
        </View>

        {/* Open arrow */}
        <Text style={[styles.openArrow, { color: colors.textTertiary }]}>
          ›
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function DocumentsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { family, profile } = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';
  const isAdmin = uid === family?.createdBy;
  const ACCENT = colors.tiles.documents.icon;

  const [documents, setDocuments] = useState<FamilyDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!family) {
      return;
    }
    const unsub = subscribeToDocuments(family.id, setDocuments);
    return unsub;
  }, [family]);

  async function handleUpload() {
    try {
      const result = await pick({
        type: types.allFiles,
        allowMultiSelection: false,
      });
      const file = result[0];
      if (!file || !family) {
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      await uploadDocument(
        family.id,
        uid,
        profile?.displayName ?? 'Unknown',
        {
          uri: file.uri,
          name: file.name ?? 'document',
          size: file.size ?? 0,
          type: file.type ?? 'application/octet-stream',
        },
        pct => setUploadProgress(pct),
      );
    } catch (err: any) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      Alert.alert('Upload failed', err?.message ?? 'Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleDelete(doc: FamilyDocument) {
    if (!family) {
      return;
    }
    Alert.alert('Delete Document', `Remove "${doc.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocument(family.id, doc.id, doc.storagePath);
          } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Could not delete document.');
          }
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={documents}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <DocRow
            doc={item}
            canDelete={isAdmin || item.uploadedBy === uid}
            accentColor={ACCENT}
            colors={colors}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.emptyEmoji}>📄</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No documents yet
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.textSecondary }]}
            >
              Upload insurance cards, IDs, warranties — anything important your
              family might need.
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      />

      {/* Upload progress overlay */}
      {uploading && (
        <View style={styles.uploadOverlay}>
          <View
            style={[styles.uploadCard, { backgroundColor: colors.surface }]}
          >
            <ActivityIndicator color={ACCENT} size="large" />
            <Text style={[styles.uploadingText, { color: colors.text }]}>
              Uploading…{' '}
              {uploadProgress > 0 ? `${Math.round(uploadProgress * 100)}%` : ''}
            </Text>
          </View>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: ACCENT,
            bottom: insets.bottom + 30,
          },
        ]}
        onPress={handleUpload}
        disabled={uploading}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 16 },

  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconEmoji: { fontSize: 22 },
  docInfo: { flex: 1 },
  docName: { fontSize: 15, fontWeight: '600' },
  docMeta: { fontSize: 12, marginTop: 2 },
  docDate: { fontSize: 11, marginTop: 1 },
  openArrow: { fontSize: 22, fontWeight: '300', marginLeft: 8 },

  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 8,
    borderRadius: 12,
  },
  deleteText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

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
  uploadingText: { fontSize: 16, fontWeight: '600' },

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
