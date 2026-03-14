import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import ActionSheet, {SheetManager, SheetProps} from 'react-native-actions-sheet';
import Text from '../components/Text';
import LucideIcon from '@react-native-vector-icons/lucide';
import { useTheme } from '../theme/useTheme';

export default function PhotoActionsSheet(props: SheetProps<'photo-actions'>) {
  const { colors } = useTheme();
  const ACCENT = colors.tiles.gallery.icon;

  const { photo, isAdmin, uid, onDownload, onShare, onDelete } = props.payload!;

  const canDelete = isAdmin || photo.uploadedBy === uid;

  return (
    <ActionSheet
      id={props.sheetId}
      gestureEnabled
      useBottomSafeAreaPadding
      containerStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 8,
      }}>
      {/* Download */}
      <TouchableOpacity
        style={styles.sheetRow}
        onPress={() => {
          SheetManager.hide(props.sheetId);
          onDownload();
        }}
      >
        <LucideIcon name="download" size={22} color={colors.text} />
        <Text style={[styles.sheetLabel, { color: colors.text }]}>Save to Camera Roll</Text>
      </TouchableOpacity>

      <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />

      {/* Share */}
      <TouchableOpacity
        style={styles.sheetRow}
        onPress={() => {
          SheetManager.hide(props.sheetId);
          onShare();
        }}
      >
        <LucideIcon name="share-2" size={22} color={colors.text} />
        <Text style={[styles.sheetLabel, { color: colors.text }]}>Share Photo</Text>
      </TouchableOpacity>

      {/* Delete — admin or own photo only */}
      {canDelete && (
        <>
          <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.sheetRow}
            onPress={() => {
              SheetManager.hide(props.sheetId);
              onDelete(photo);
            }}
          >
            <LucideIcon name="trash-2" size={22} color={colors.danger} />
            <Text style={[styles.sheetLabel, { color: colors.danger }]}>Delete Photo</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={[styles.sheetDivider, { backgroundColor: colors.border, marginTop: 8 }]} />

      {/* Cancel */}
      <TouchableOpacity
        style={[styles.sheetRow, { justifyContent: 'center' }]}
        onPress={() => SheetManager.hide(props.sheetId)}
      >
        <Text style={[styles.sheetLabel, { color: colors.textSecondary, fontWeight: '600' }]}>Cancel</Text>
      </TouchableOpacity>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  sheetLabel: { fontSize: 16, flex: 1 },
  sheetDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
});
