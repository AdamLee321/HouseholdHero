import React, {useState} from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useTheme} from '../../../theme/useTheme';
import {BudgetCategory} from '../../../services/budgetService';

interface Props {
  visible: boolean;
  categories: BudgetCategory[];
  onClose: () => void;
  onAdd: (txn: {
    categoryId: string;
    categoryName: string;
    categoryEmoji: string;
    amount: number;
    note: string;
    date: number;
    month: string;
  }) => void;
}

export default function AddTransactionModal({visible, categories, onClose, onAdd}: Props) {
  const {colors} = useTheme();
  const ACCENT = colors.tiles.budget.icon;

  const [selectedCatId, setSelectedCatId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  function reset() {
    setSelectedCatId('');
    setAmountStr('');
    setNote('');
    setDate(new Date());
    setShowDatePicker(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleAdd() {
    const cat = categories.find(c => c.id === selectedCatId);
    if (!cat) {return;}
    const dollars = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    if (!dollars || dollars <= 0) {return;}
    const month = date.toISOString().slice(0, 7);
    onAdd({
      categoryId: cat.id,
      categoryName: cat.name,
      categoryEmoji: cat.emoji,
      amount: Math.round(dollars * 100),
      note: note.trim(),
      date: date.getTime(),
      month,
    });
    reset();
    onClose();
  }

  const canAdd = !!selectedCatId && parseFloat(amountStr || '0') > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, {backgroundColor: colors.surface}]}>
          <Text style={[styles.title, {color: colors.text}]}>Add Transaction</Text>

          {/* Category picker */}
          <Text style={[styles.label, {color: colors.textSecondary}]}>Category</Text>
          {categories.length === 0 ? (
            <View style={[styles.noCatBox, {backgroundColor: colors.surfaceSecondary}]}>
              <Text style={[styles.noCatText, {color: colors.textTertiary}]}>
                Add a category first
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.catRow}
              contentContainerStyle={styles.catContent}>
              {categories.map(cat => {
                const selected = cat.id === selectedCatId;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: selected
                          ? ACCENT
                          : colors.surfaceSecondary,
                      },
                    ]}
                    onPress={() => setSelectedCatId(cat.id)}>
                    <Text style={styles.catEmoji}>{cat.emoji}</Text>
                    <Text
                      style={[
                        styles.catLabel,
                        {color: selected ? '#fff' : colors.text},
                      ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Amount */}
          <Text style={[styles.label, {color: colors.textSecondary}]}>Amount ($)</Text>
          <TextInput
            style={[styles.amountInput, {backgroundColor: colors.surfaceSecondary, color: colors.text}]}
            value={amountStr}
            onChangeText={setAmountStr}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
          />

          {/* Note */}
          <Text style={[styles.label, {color: colors.textSecondary}]}>Note (optional)</Text>
          <TextInput
            style={[styles.input, {backgroundColor: colors.surfaceSecondary, color: colors.text}]}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Weekly shop"
            placeholderTextColor={colors.textTertiary}
          />

          {/* Date */}
          <Text style={[styles.label, {color: colors.textSecondary}]}>Date</Text>
          <TouchableOpacity
            style={[styles.datePicker, {backgroundColor: colors.surfaceSecondary}]}
            onPress={() => setShowDatePicker(v => !v)}>
            <Text style={[styles.dateText, {color: colors.text}]}>
              📅{'  '}
              {date.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, selected) => {
                if (selected) {setDate(selected);}
                if (Platform.OS === 'android') {setShowDatePicker(false);}
              }}
              maximumDate={new Date()}
            />
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.cancelBtn, {borderColor: colors.border}]}
              onPress={handleClose}>
              <Text style={[styles.cancelText, {color: colors.textSecondary}]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, {backgroundColor: ACCENT, opacity: canAdd ? 1 : 0.4}]}
              onPress={handleAdd}
              disabled={!canAdd}>
              <Text style={styles.addText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)'},
  sheet: {borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40},
  title: {fontSize: 18, fontWeight: '700', marginBottom: 16},
  label: {fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6},
  catRow: {marginBottom: 16},
  catContent: {gap: 8, paddingRight: 8},
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  catEmoji: {fontSize: 16},
  catLabel: {fontSize: 14, fontWeight: '600'},
  noCatBox: {borderRadius: 10, padding: 16, marginBottom: 16, alignItems: 'center'},
  noCatText: {fontSize: 13},
  amountInput: {
    borderRadius: 10,
    padding: 14,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  datePicker: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  dateText: {fontSize: 15},
  buttons: {flexDirection: 'row', gap: 12},
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {fontSize: 15, fontWeight: '600'},
  addBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addText: {color: '#fff', fontSize: 15, fontWeight: '700'},
});
