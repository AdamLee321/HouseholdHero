import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Text from '../../../components/Text';
import TextInput from '../../../components/TextInput';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/useTheme';
import {
  Recipe,
  RecipeIngredient,
  uploadRecipePhoto,
} from '../../../services/recipeService';
import { ImportedRecipeData } from '../../../services/recipeImportService';

const PRESET_TAGS = [
  { label: 'Breakfast', emoji: '🍳' },
  { label: 'Lunch', emoji: '🥗' },
  { label: 'Dinner', emoji: '🍲' },
  { label: 'Dessert', emoji: '🍰' },
  { label: 'Drinks', emoji: '🥤' },
  { label: 'Snack', emoji: '🥨' },
  { label: 'Vegetarian', emoji: '🌱' },
  { label: 'Quick', emoji: '⚡' },
  { label: 'Baking', emoji: '🎂' },
  { label: 'Seafood', emoji: '🐟' },
];

interface Props {
  visible: boolean;
  familyId: string;
  editRecipe?: Recipe | null;
  importData?: ImportedRecipeData | null;
  onClose: () => void;
  onSave: (
    data: Omit<Recipe, 'id' | 'createdAt' | 'addedBy' | 'addedByName'>,
  ) => Promise<void>;
}

const EMPTY_INGREDIENT: RecipeIngredient = { amount: '', name: '' };

export default function AddRecipeModal({
  visible,
  familyId,
  editRecipe,
  importData,
  onClose,
  onSave,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const ACCENT = colors.tiles.recipes.icon;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('4');
  const [prepMins, setPrepMins] = useState('');
  const [cookMins, setCookMins] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
    { amount: '', name: '' },
  ]);
  const [steps, setSteps] = useState<string[]>(['']);
  const [photoURI, setPhotoURI] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [photoStoragePath, setPhotoStoragePath] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Populate fields when editing or importing
  useEffect(() => {
    if (editRecipe) {
      setTitle(editRecipe.title);
      setDescription(editRecipe.description);
      setServings(String(editRecipe.servings || 4));
      setPrepMins(editRecipe.prepMins ? String(editRecipe.prepMins) : '');
      setCookMins(editRecipe.cookMins ? String(editRecipe.cookMins) : '');
      setTags(editRecipe.tags ?? []);
      setIngredients(
        editRecipe.ingredients?.length
          ? editRecipe.ingredients
          : [{ amount: '', name: '' }],
      );
      setSteps(editRecipe.steps?.length ? editRecipe.steps : ['']);
      setPhotoURL(editRecipe.photoURL ?? '');
      setPhotoStoragePath(editRecipe.photoStoragePath ?? '');
      setPhotoURI('');
    } else if (importData) {
      setTitle(importData.title);
      setDescription(importData.description);
      setServings(importData.servings ? String(importData.servings) : '4');
      setPrepMins(importData.prepMins ? String(importData.prepMins) : '');
      setCookMins(importData.cookMins ? String(importData.cookMins) : '');
      setTags(importData.tags);
      setIngredients(
        importData.ingredients.length
          ? importData.ingredients
          : [{ amount: '', name: '' }],
      );
      setSteps(importData.steps.length ? importData.steps : ['']);
      setPhotoURL(importData.photoURL);
      setPhotoStoragePath('');
      setPhotoURI('');
    } else {
      resetForm();
    }
  }, [editRecipe, importData, visible]);

  function resetForm() {
    setTitle('');
    setDescription('');
    setServings('4');
    setPrepMins('');
    setCookMins('');
    setTags([]);
    setIngredients([{ amount: '', name: '' }]);
    setSteps(['']);
    setPhotoURI('');
    setPhotoURL('');
    setPhotoStoragePath('');
  }

  function handleClose() {
    if (!editRecipe) {
      resetForm();
    }
    onClose();
  }

  function toggleTag(label: string) {
    setTags(prev =>
      prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label],
    );
  }

  // Ingredients
  function updateIngredient(
    idx: number,
    field: 'amount' | 'name',
    val: string,
  ) {
    setIngredients(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  }
  function addIngredient() {
    setIngredients(prev => [...prev, { ...EMPTY_INGREDIENT }]);
  }
  function removeIngredient(idx: number) {
    setIngredients(prev => prev.filter((_, i) => i !== idx));
  }

  // Steps
  function updateStep(idx: number, val: string) {
    setSteps(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  }
  function addStep() {
    setSteps(prev => [...prev, '']);
  }
  function removeStep(idx: number) {
    setSteps(prev => prev.filter((_, i) => i !== idx));
  }

  // Photo picker
  function pickPhoto() {
    Alert.alert('Recipe Photo', 'Choose a source', [
      { text: 'Camera', onPress: pickFromCamera },
      { text: 'Photo Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function pickFromCamera() {
    try {
      const result = await launchCamera({ mediaType: 'photo', quality: 0.8 });
      if (!result.didCancel && result.assets?.[0]?.uri) {
        setPhotoURI(result.assets[0].uri);
      }
    } catch {
      // image picker unavailable
    }
  }

  async function pickFromLibrary() {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });
      if (!result.didCancel && result.assets?.[0]?.uri) {
        setPhotoURI(result.assets[0].uri);
      }
    } catch {
      // image picker unavailable
    }
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    setSaving(true);
    try {
      let finalPhotoURL = photoURL;
      let finalStoragePath = photoStoragePath;

      // Upload new photo if one was picked
      if (photoURI) {
        setUploadingPhoto(true);
        const tmpId = editRecipe?.id ?? `tmp_${Date.now()}`;
        const result = await uploadRecipePhoto(familyId, tmpId, photoURI);
        finalPhotoURL = result.downloadURL;
        finalStoragePath = result.storagePath;
        setUploadingPhoto(false);
      }

      const cleanIngredients = ingredients.filter(i => i.name.trim());
      const cleanSteps = steps.filter(s => s.trim());

      await onSave({
        title: trimmedTitle,
        description: description.trim(),
        servings: parseInt(servings, 10) || 1,
        prepMins: parseInt(prepMins, 10) || 0,
        cookMins: parseInt(cookMins, 10) || 0,
        tags,
        ingredients: cleanIngredients,
        steps: cleanSteps,
        photoURL: finalPhotoURL,
        photoStoragePath: finalStoragePath,
      });
      if (!editRecipe) {
        resetForm();
      }
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not save recipe.');
    } finally {
      setSaving(false);
      setUploadingPhoto(false);
    }
  }

  const previewPhoto = photoURI || photoURL;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
              paddingTop: Platform.OS === 'ios' ? insets.top + 6 : 20,
            },
          ]}
        >
          <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
            <Text
              style={[styles.headerBtnText, { color: colors.textSecondary }]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {editRecipe
              ? 'Edit Recipe'
              : importData
              ? 'Import Recipe'
              : 'New Recipe'}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.headerBtn}
            disabled={!title.trim() || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={ACCENT} />
            ) : (
              <Text
                style={[
                  styles.headerSave,
                  { color: title.trim() ? ACCENT : colors.textTertiary },
                ]}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo */}
          <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto}>
            {previewPhoto ? (
              <Image
                source={{ uri: previewPhoto }}
                style={styles.photoPreview}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.photoPlaceholder,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text style={styles.photoIcon}>📷</Text>
                <Text
                  style={[styles.photoHint, { color: colors.textSecondary }]}
                >
                  Add cover photo (optional)
                </Text>
              </View>
            )}
            {uploadingPhoto && (
              <View style={styles.photoOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Title */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Title *
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Grandma's Lasagna"
            placeholderTextColor={colors.textTertiary}
          />

          {/* Description */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Description
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.multiline,
              { backgroundColor: colors.surface, color: colors.text },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="A short description…"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
          />

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statField}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Servings
              </Text>
              <TextInput
                style={[
                  styles.statInput,
                  { backgroundColor: colors.surface, color: colors.text },
                ]}
                value={servings}
                onChangeText={setServings}
                keyboardType="number-pad"
                placeholder="4"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={styles.statField}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Prep (min)
              </Text>
              <TextInput
                style={[
                  styles.statInput,
                  { backgroundColor: colors.surface, color: colors.text },
                ]}
                value={prepMins}
                onChangeText={setPrepMins}
                keyboardType="number-pad"
                placeholder="15"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={styles.statField}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Cook (min)
              </Text>
              <TextInput
                style={[
                  styles.statInput,
                  { backgroundColor: colors.surface, color: colors.text },
                ]}
                value={cookMins}
                onChangeText={setCookMins}
                keyboardType="number-pad"
                placeholder="30"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          {/* Tags */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Tags
          </Text>
          <View style={styles.tagGrid}>
            {PRESET_TAGS.map(t => {
              const selected = tags.includes(t.label);
              return (
                <TouchableOpacity
                  key={t.label}
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: selected ? ACCENT : colors.surface,
                      borderColor: selected ? ACCENT : colors.border,
                    },
                  ]}
                  onPress={() => toggleTag(t.label)}
                >
                  <Text style={styles.tagEmoji}>{t.emoji}</Text>
                  <Text
                    style={[
                      styles.tagLabel,
                      { color: selected ? '#fff' : colors.text },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Ingredients */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Ingredients
          </Text>
          {ingredients.map((ing, idx) => (
            <View key={idx} style={styles.ingredientRow}>
              <TextInput
                style={[
                  styles.amountInput,
                  { backgroundColor: colors.surface, color: colors.text },
                ]}
                value={ing.amount}
                onChangeText={v => updateIngredient(idx, 'amount', v)}
                placeholder="2 cups"
                placeholderTextColor={colors.textTertiary}
              />
              <TextInput
                style={[
                  styles.nameInput,
                  { backgroundColor: colors.surface, color: colors.text },
                ]}
                value={ing.name}
                onChangeText={v => updateIngredient(idx, 'name', v)}
                placeholder="flour"
                placeholderTextColor={colors.textTertiary}
              />
              {ingredients.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeIngredient(idx)}
                  style={styles.removeBtn}
                >
                  <Text
                    style={[styles.removeBtnText, { color: colors.danger }]}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity
            style={[styles.addRowBtn, { borderColor: ACCENT }]}
            onPress={addIngredient}
          >
            <Text style={[styles.addRowText, { color: ACCENT }]}>
              + Add ingredient
            </Text>
          </TouchableOpacity>

          {/* Steps */}
          <Text
            style={[
              styles.label,
              { color: colors.textSecondary, marginTop: 20 },
            ]}
          >
            Steps
          </Text>
          {steps.map((step, idx) => (
            <View key={idx} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: ACCENT }]}>
                <Text style={styles.stepNumText}>{idx + 1}</Text>
              </View>
              <TextInput
                style={[
                  styles.stepInput,
                  { backgroundColor: colors.surface, color: colors.text },
                ]}
                value={step}
                onChangeText={v => updateStep(idx, v)}
                placeholder={`Step ${idx + 1}…`}
                placeholderTextColor={colors.textTertiary}
                multiline
              />
              {steps.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeStep(idx)}
                  style={styles.removeBtn}
                >
                  <Text
                    style={[styles.removeBtnText, { color: colors.danger }]}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity
            style={[
              styles.addRowBtn,
              { borderColor: ACCENT, marginBottom: 40 },
            ]}
            onPress={addStep}
          >
            <Text style={[styles.addRowText, { color: ACCENT }]}>
              + Add step
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { padding: 4 },
  headerBtnText: { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSave: { fontSize: 16, fontWeight: '700' },

  form: { padding: 16 },

  photoPicker: { marginBottom: 20, borderRadius: 12, overflow: 'hidden' },
  photoPreview: { width: '100%', height: 200 },
  photoPlaceholder: {
    height: 160,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoIcon: { fontSize: 36 },
  photoHint: { fontSize: 14 },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: { borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 16 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statField: { flex: 1 },
  statInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
  },

  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagEmoji: { fontSize: 13 },
  tagLabel: { fontSize: 13, fontWeight: '600' },

  ingredientRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  amountInput: { width: 90, borderRadius: 10, padding: 10, fontSize: 14 },
  nameInput: { flex: 1, borderRadius: 10, padding: 10, fontSize: 14 },
  removeBtn: { padding: 6 },
  removeBtnText: { fontSize: 16, fontWeight: '700' },

  addRowBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  addRowText: { fontSize: 14, fontWeight: '600' },

  stepRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  stepNumText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepInput: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
});
