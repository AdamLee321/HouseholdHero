import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import ActionSheet, {SheetManager, SheetProps} from 'react-native-actions-sheet';
import Text from '../../../components/Text';
import TextInput from '../../../components/TextInput';
import { useTheme } from '../../../theme/useTheme';
import { PlaceType, FamilyPlace } from '../../../types';
import { PLACE_CONFIG, addPlace, updatePlace } from '../../../services/placesService';

const TYPE_ORDER: PlaceType[] = ['home', 'work', 'school', 'park', 'music', 'doctor', 'hospital', 'other'];

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function AddPlaceModal(props: SheetProps<'add-place'>) {
  const { colors } = useTheme();

  const { familyId, uid, coord, preselectedType, editingPlace } = props.payload!;

  const [selectedType, setSelectedType] = useState<PlaceType>(preselectedType ?? 'home');
  const [name, setName] = useState(PLACE_CONFIG[preselectedType ?? 'home'].label);
  const [saving, setSaving] = useState(false);

  // Address search
  const [addressQuery, setAddressQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolvedCoord, setResolvedCoord] = useState<{ lat: number; lng: number } | null>(coord);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync payload when sheet opens
  useEffect(() => {
    if (editingPlace) {
      setSelectedType(editingPlace.type);
      setName(editingPlace.name);
      setResolvedCoord({ lat: editingPlace.lat, lng: editingPlace.lng });
      setResolvedAddress(null);
      setAddressQuery('');
    } else {
      setSelectedType(preselectedType ?? 'home');
      setName(PLACE_CONFIG[preselectedType ?? 'home'].label);
      setResolvedCoord(coord);
      setResolvedAddress(null);
      setAddressQuery('');
    }
    setSearchResults([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTypeSelect(type: PlaceType) {
    setSelectedType(type);
    if (!editingPlace) {setName(PLACE_CONFIG[type].label);}
  }

  // Debounced Nominatim search
  function handleAddressChange(text: string) {
    setAddressQuery(text);
    setSearchResults([]);
    if (debounceRef.current) {clearTimeout(debounceRef.current);}
    if (text.trim().length < 3) {return;}
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const encoded = encodeURIComponent(text.trim());
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&addressdetails=1`,
          { headers: { 'User-Agent': 'HouseholdHeroApp/1.0' } },
        );
        const json = await res.json() as GeoResult[];
        setSearchResults(json);
      } catch {
        // silently ignore network errors
      } finally {
        setSearching(false);
      }
    }, 600);
  }

  function handleSelectResult(result: GeoResult) {
    setResolvedCoord({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setResolvedAddress(result.display_name);
    setAddressQuery(result.display_name);
    setSearchResults([]);
  }

  async function handleSave() {
    if (!resolvedCoord) {
      Alert.alert('No location', 'Search for an address or long-press the map to drop a pin first.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this place.');
      return;
    }

    setSaving(true);
    try {
      if (editingPlace) {
        await updatePlace(familyId, editingPlace.id, {
          type: selectedType,
          name: name.trim(),
          lat: resolvedCoord.lat,
          lng: resolvedCoord.lng,
        });
      } else {
        const place: Omit<FamilyPlace, 'id'> = {
          type: selectedType,
          name: name.trim(),
          lat: resolvedCoord.lat,
          lng: resolvedCoord.lng,
          createdBy: uid,
          createdAt: Date.now(),
        };
        await addPlace(familyId, place);
      }
      SheetManager.hide(props.sheetId);
    } finally {
      setSaving(false);
    }
  }

  const cfg = PLACE_CONFIG[selectedType];
  const hasCoord = !!resolvedCoord;
  const isEditing = !!editingPlace;

  return (
    <ActionSheet
      id={props.sheetId}
      gestureEnabled
      useBottomSafeAreaPadding
      containerStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
      }}>
      <Text style={[styles.title, { color: colors.text }]}>
        {isEditing ? 'Edit Place' : 'Add Family Place'}
      </Text>

      {/* Type selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.typeRow}
      >
        {TYPE_ORDER.map(type => {
          const c = PLACE_CONFIG[type];
          const isSelected = selectedType === type;
          return (
            <TouchableOpacity
              key={type}
              onPress={() => handleTypeSelect(type)}
              style={[
                styles.typePill,
                {
                  backgroundColor: isSelected ? c.color : colors.background,
                  borderColor: isSelected ? c.color : colors.border,
                },
              ]}
            >
              <Text style={styles.typeEmoji}>{c.emoji}</Text>
              <Text style={[styles.typeLabel, { color: isSelected ? '#fff' : colors.text }]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Address search */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={addressQuery}
            onChangeText={handleAddressChange}
            placeholder={isEditing ? 'Search new address…' : 'Search address…'}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searching && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 10 }} />}
        </View>

        {searchResults.length > 0 && (
          <View style={[styles.resultsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {searchResults.map((r, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleSelectResult(r)}
                style={[
                  styles.resultRow,
                  i < searchResults.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
              >
                <Text style={[styles.resultText, { color: colors.text }]} numberOfLines={2}>
                  {r.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Resolved location confirmation */}
      {hasCoord && (
        <View style={[styles.locationConfirm, { backgroundColor: cfg.color + '15' }]}>
          <View style={[styles.previewPin, { backgroundColor: cfg.color }]}>
            <Text style={styles.previewEmoji}>{cfg.emoji}</Text>
          </View>
          <Text style={[styles.locationConfirmText, { color: colors.text }]} numberOfLines={2}>
            {resolvedAddress ?? `${resolvedCoord!.lat.toFixed(5)}, ${resolvedCoord!.lng.toFixed(5)}`}
          </Text>
        </View>
      )}

      {!hasCoord && (
        <Text style={[styles.noCoordHint, { color: colors.textSecondary }]}>
          Search above or long-press the map to place a pin
        </Text>
      )}

      {/* Name input */}
      <TextInput
        style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
        value={name}
        onChangeText={setName}
        placeholder="Place name"
        placeholderTextColor={colors.textSecondary}
      />

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.background }]}
          onPress={() => SheetManager.hide(props.sheetId)}
        >
          <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: hasCoord ? cfg.color : colors.border, opacity: saving ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={saving || !hasCoord}
        >
          <Text style={[styles.btnText, { color: '#fff' }]}>
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Place'}
          </Text>
        </TouchableOpacity>
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16 },

  typeRow: { gap: 8, paddingVertical: 4, marginBottom: 16 },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
  },
  typeEmoji: { fontSize: 16 },
  typeLabel: { fontSize: 13, fontWeight: '600' },

  // Address search
  searchWrap: { marginBottom: 12, zIndex: 10 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12,
    paddingLeft: 12,
  },
  searchIcon: { fontSize: 15, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 11 },
  resultsList: {
    borderWidth: 1, borderTopWidth: 0,
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  resultRow: { paddingHorizontal: 14, paddingVertical: 12 },
  resultText: { fontSize: 13 },

  // Resolved location
  locationConfirm: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 12, marginBottom: 12,
  },
  previewPin: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    flexShrink: 0,
  },
  previewEmoji: { fontSize: 20 },
  locationConfirmText: { flex: 1, fontSize: 13, fontWeight: '500' },

  noCoordHint: { fontSize: 12, textAlign: 'center', marginBottom: 12 },

  input: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, marginBottom: 20,
  },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700' },
});
