import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import ActionSheet, {
  SheetManager,
  SheetProps,
} from 'react-native-actions-sheet';
import Text from '../components/Text';
import TextInput from '../components/TextInput';
import { useTheme } from '../theme/useTheme';
import { fetchAndParseRecipe } from '../services/recipeImportService';

export default function ImportRecipeSheet(props: SheetProps<'import-recipe'>) {
  const { colors } = useTheme();
  const ACCENT = colors.tiles.recipes.icon;

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleImport() {
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await fetchAndParseRecipe(trimmed);
      setUrl('');
      setError('');
      await SheetManager.hide(props.sheetId);
      props.payload?.onImport(data);
    } catch (err: any) {
      setError(
        err?.message ?? 'Could not import recipe. Check the URL and try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) {
      return;
    }
    setUrl('');
    setError('');
    SheetManager.hide(props.sheetId);
  }

  return (
    <ActionSheet
      id={props.sheetId}
      gestureEnabled={!loading}
      onClose={() => {
        setUrl('');
        setError('');
      }}
      containerStyle={{ backgroundColor: colors.surface }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Text style={[styles.title, { color: colors.text }]}>
            Import from URL
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Paste a link to a recipe page and we'll fill in the details
            automatically.
          </Text>

          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.background, color: colors.text },
            ]}
            value={url}
            onChangeText={v => {
              setUrl(v);
              setError('');
            }}
            placeholder="https://www.example.com/recipe/..."
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={handleImport}
            editable={!loading}
          />

          {!!error && (
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.importBtn,
              { backgroundColor: url.trim() ? ACCENT : colors.border },
            ]}
            onPress={handleImport}
            disabled={!url.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.importBtnText}>Import Recipe</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 12, paddingBottom: 10 },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 8,
  },
  errorText: { fontSize: 13, marginBottom: 12 },
  importBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  importBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { paddingVertical: 10, alignItems: 'center' },
  cancelText: { fontSize: 15 },
});
