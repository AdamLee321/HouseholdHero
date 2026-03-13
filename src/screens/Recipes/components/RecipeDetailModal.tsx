import React from 'react';
import {
  Modal,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import Text from '../../../components/Text';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme/useTheme';
import {Recipe} from '../../../services/recipeService';

interface Props {
  recipe: Recipe | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function timeLabel(mins: number): string {
  if (!mins) {return '—';}
  if (mins < 60) {return `${mins}m`;}
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function RecipeDetailModal({recipe, canEdit, onClose, onEdit, onDelete}: Props) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const ACCENT = colors.tiles.recipes.icon;

  if (!recipe) {return null;}

  return (
    <Modal visible={!!recipe} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <ScrollView contentContainerStyle={{paddingBottom: insets.bottom + 100}}>
          {/* Photo or color header */}
          <View style={styles.photoWrap}>
            {recipe.photoURL ? (
              <Image source={{uri: recipe.photoURL}} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={[styles.photoFallback, {backgroundColor: ACCENT + '33'}]}>
                <Text style={styles.photoFallbackEmoji}>🍳</Text>
              </View>
            )}
            {/* Close button */}
            <TouchableOpacity
              style={[styles.closeBtn, {top: insets.top + 12}]}
              onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Tags */}
            {recipe.tags?.length > 0 && (
              <View style={styles.tagRow}>
                {recipe.tags.map(tag => (
                  <View key={tag} style={[styles.tagBadge, {backgroundColor: ACCENT + '22'}]}>
                    <Text style={[styles.tagText, {color: ACCENT}]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Title & meta */}
            <Text style={[styles.title, {color: colors.text}]}>{recipe.title}</Text>
            {!!recipe.description && (
              <Text style={[styles.description, {color: colors.textSecondary}]}>
                {recipe.description}
              </Text>
            )}

            {/* Stats */}
            <View style={[styles.statsCard, {backgroundColor: colors.surface}]}>
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>👤</Text>
                <Text style={[styles.statValue, {color: colors.text}]}>{recipe.servings || '—'}</Text>
                <Text style={[styles.statLabel, {color: colors.textTertiary}]}>Serves</Text>
              </View>
              <View style={[styles.statDivider, {backgroundColor: colors.border}]} />
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>⏱</Text>
                <Text style={[styles.statValue, {color: colors.text}]}>{timeLabel(recipe.prepMins)}</Text>
                <Text style={[styles.statLabel, {color: colors.textTertiary}]}>Prep</Text>
              </View>
              <View style={[styles.statDivider, {backgroundColor: colors.border}]} />
              <View style={styles.statItem}>
                <Text style={styles.statEmoji}>🔥</Text>
                <Text style={[styles.statValue, {color: colors.text}]}>{timeLabel(recipe.cookMins)}</Text>
                <Text style={[styles.statLabel, {color: colors.textTertiary}]}>Cook</Text>
              </View>
            </View>

            {/* Ingredients */}
            {recipe.ingredients?.length > 0 && (
              <>
                <Text style={[styles.sectionHeader, {color: colors.text}]}>Ingredients</Text>
                <View style={[styles.sectionCard, {backgroundColor: colors.surface}]}>
                  {recipe.ingredients.map((ing, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.ingredientRow,
                        idx < recipe.ingredients.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.border,
                        },
                      ]}>
                      <Text style={[styles.ingredientAmount, {color: ACCENT}]}>
                        {ing.amount}
                      </Text>
                      <Text style={[styles.ingredientName, {color: colors.text}]}>
                        {ing.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Steps */}
            {recipe.steps?.length > 0 && (
              <>
                <Text style={[styles.sectionHeader, {color: colors.text}]}>Method</Text>
                {recipe.steps.map((step, idx) => (
                  <View key={idx} style={styles.stepRow}>
                    <View style={[styles.stepNum, {backgroundColor: ACCENT}]}>
                      <Text style={styles.stepNumText}>{idx + 1}</Text>
                    </View>
                    <View style={[styles.stepCard, {backgroundColor: colors.surface}]}>
                      <Text style={[styles.stepText, {color: colors.text}]}>{step}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Added by */}
            <Text style={[styles.addedBy, {color: colors.textTertiary}]}>
              Added by {recipe.addedByName}
            </Text>
          </View>
        </ScrollView>

        {/* Edit / Delete bar */}
        {canEdit && (
          <View
            style={[
              styles.actionBar,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                paddingBottom: insets.bottom + 8,
              },
            ]}>
            <TouchableOpacity
              style={[styles.actionBtn, {borderColor: colors.border}]}
              onPress={onDelete}>
              <Text style={[styles.actionBtnText, {color: colors.danger}]}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, {backgroundColor: ACCENT, borderColor: ACCENT, flex: 2}]}
              onPress={onEdit}>
              <Text style={[styles.actionBtnText, {color: '#fff'}]}>Edit Recipe</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  photoWrap: {position: 'relative'},
  photo: {width: '100%', height: 260},
  photoFallback: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFallbackEmoji: {fontSize: 64},
  closeBtn: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {color: '#fff', fontSize: 16, fontWeight: '700'},

  content: {padding: 20},

  tagRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12},
  tagBadge: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12},
  tagText: {fontSize: 12, fontWeight: '700'},

  title: {fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8},
  description: {fontSize: 15, lineHeight: 22, marginBottom: 20},

  statsCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
  },
  statItem: {flex: 1, alignItems: 'center', gap: 4},
  statEmoji: {fontSize: 20},
  statValue: {fontSize: 16, fontWeight: '700'},
  statLabel: {fontSize: 11},
  statDivider: {width: 1, marginVertical: 4},

  sectionHeader: {fontSize: 18, fontWeight: '700', marginBottom: 10},
  sectionCard: {borderRadius: 14, marginBottom: 24, overflow: 'hidden'},
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  ingredientAmount: {width: 70, fontSize: 14, fontWeight: '700'},
  ingredientName: {flex: 1, fontSize: 15},

  stepRow: {flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start'},
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  stepNumText: {color: '#fff', fontSize: 13, fontWeight: '700'},
  stepCard: {flex: 1, borderRadius: 12, padding: 14},
  stepText: {fontSize: 15, lineHeight: 22},

  addedBy: {fontSize: 12, marginTop: 24, textAlign: 'center'},

  actionBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionBtnText: {fontSize: 15, fontWeight: '700'},
});
