import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  ScrollView,
  Alert,
} from 'react-native';
import Text from '../../components/Text';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  MemberLocation,
  subscribeToLocations,
  updateLocation,
  stopSharing,
} from '../../services/locationService';
import {
  subscribePlaces,
  deletePlace,
  PLACE_CONFIG,
} from '../../services/placesService';
import { FamilyPlace, PlaceType } from '../../types';
import { SheetManager } from 'react-native-actions-sheet';

Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: 'whenInUse',
});

// Module-level: survives screen unmount so sharing continues in the background
let _watchId: number | null = null;
let _isSharing = false;

const DEFAULT_REGION: Region = {
  latitude: 53.3498,
  longitude: -6.2603,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const MEMBER_COLORS = [
  '#4F6EF7',
  '#34C759',
  '#FF9500',
  '#AF52DE',
  '#00C7BE',
  '#FF3B30',
  '#5856D6',
  '#FF2D9B',
];
function memberColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
}
function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message:
          'HouseholdHero needs your location to share it with your family.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

// ─── Place Marker ────────────────────────────────────────────────────────────
function PlaceMarkerView({
  place,
  latitudeDelta,
  isSelected,
}: {
  place: FamilyPlace;
  latitudeDelta: number;
  isSelected: boolean;
}) {
  const cfg = PLACE_CONFIG[place.type];

  const scale = Math.max(0.55, Math.min(Math.sqrt(latitudeDelta / 0.01), 1.0));
  const size = Math.round(36 * scale);
  const fontSize = Math.round(16 * scale);

  return (
    <View style={styles.placeMarkerWrap}>
      <View
        style={[
          styles.placeMarkerCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: cfg.color,
            borderWidth: isSelected ? 2 : 2,
            borderColor: '#fff',
          },
        ]}
      >
        <Text style={{ fontSize }}>{cfg.emoji}</Text>
      </View>
      <View style={[styles.placeMarkerLabel, { backgroundColor: cfg.color, opacity: isSelected ? 1 : 0 }]}>
        <Text style={styles.placeMarkerLabelText}>
          {place.name.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function LocationScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { family, profile } = useFamilyStore();
  const mapRef = useRef<MapView>(null);

  const uid = auth().currentUser?.uid ?? '';
  const ACCENT = colors.tiles.location.icon;

  const [locations, setLocations] = useState<MemberLocation[]>([]);
  const [places, setPlaces] = useState<FamilyPlace[]>([]);
  const [sharing, setSharing] = useState(_isSharing);
  const [latitudeDelta, setLatitudeDelta] = useState(DEFAULT_REGION.latitudeDelta);
  const [pendingCoord, setPendingCoord] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [preselectedType, setPreselectedType] = useState<PlaceType | undefined>(
    undefined,
  );
  const [editingPlace, setEditingPlace] = useState<FamilyPlace | undefined>(
    undefined,
  );
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!family) return;
    const unsub = subscribeToLocations(family.id, setLocations);
    return unsub;
  }, [family]);

  useEffect(() => {
    if (!family) return;
    const unsub = subscribePlaces(family.id, setPlaces);
    return unsub;
  }, [family]);

  // Fit map to show all members + places on first data load
  useEffect(() => {
    if (!mapRef.current) return;
    const coords = [
      ...locations.map(l => ({ latitude: l.lat, longitude: l.lng })),
      ...places.map(p => ({ latitude: p.lat, longitude: p.lng })),
    ];
    if (coords.length === 0) return;
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 60, bottom: 280, left: 60 },
      animated: true,
    });
  }, [locations.length, places.length]);

  async function startSharing() {
    const granted = await requestLocationPermission();
    if (!granted) {
      Alert.alert(
        'Permission Denied',
        'Location permission is required to share your location.',
      );
      return;
    }
    _watchId = Geolocation.watchPosition(
      position => {
        const { latitude, longitude, accuracy } = position.coords;
        if (family) {
          updateLocation(
            family.id,
            uid,
            profile?.displayName ?? 'Unknown',
            latitude,
            longitude,
            accuracy,
          );
        }
        mapRef.current?.animateToRegion(
          { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
          500,
        );
      },
      error => console.warn('Location error:', error.message),
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 10000,
        fastestInterval: 5000,
      },
    );
    _isSharing = true;
    setSharing(true);
  }

  function handleStopSharing() {
    Alert.alert(
      'Stop sharing?',
      'Your location will no longer be visible to your family.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Sharing',
          style: 'destructive',
          onPress: async () => {
            if (_watchId !== null) {
              Geolocation.clearWatch(_watchId);
              _watchId = null;
            }
            _isSharing = false;
            setSharing(false);
            if (family) await stopSharing(family.id, uid);
          },
        },
      ],
    );
  }

  function flyTo(lat: number, lng: number) {
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500,
    );
  }

  function openAddPlace(type?: PlaceType) {
    setEditingPlace(undefined);
    setPreselectedType(type);
    SheetManager.show('add-place', { payload: { familyId: family?.id ?? '', uid, coord: pendingCoord, preselectedType: type, editingPlace: undefined } });
  }

  function openEditPlace(place: FamilyPlace) {
    setPendingCoord(null);
    setEditingPlace(place);
    setPreselectedType(undefined);
    SheetManager.show('add-place', { payload: { familyId: family?.id ?? '', uid, coord: null, preselectedType: undefined, editingPlace: place } });
  }

  function handlePlaceLongPress(place: FamilyPlace) {
    const cfg = PLACE_CONFIG[place.type];
    Alert.alert(`${cfg.emoji} ${place.name}`, 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Edit', onPress: () => openEditPlace(place) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            `Remove ${place.name}?`,
            'This will remove the pin for all family members.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: () => family && deletePlace(family.id, place.id),
              },
            ],
          ),
      },
    ]);
  }

  function handleModalClose() {
    setPendingCoord(null);
    setPreselectedType(undefined);
    setEditingPlace(undefined);
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={r => setLatitudeDelta(r.latitudeDelta)}
        userInterfaceStyle={Platform.OS === 'ios' ? (isDark ? 'dark' : 'light') : undefined}
        onLongPress={e => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          const coord = { lat: latitude, lng: longitude };
          setPendingCoord(coord);
          setEditingPlace(undefined);
          setPreselectedType(undefined);
          SheetManager.show('add-place', { payload: { familyId: family?.id ?? '', uid, coord, preselectedType: undefined, editingPlace: undefined } });
        }}
      >
        {/* Member markers */}
        {locations.map(loc => (
          <Marker
            key={loc.uid}
            coordinate={{ latitude: loc.lat, longitude: loc.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[
                styles.memberPin,
                { backgroundColor: memberColor(loc.displayName) },
              ]}
            >
              <Text style={styles.memberInitials}>
                {initials(loc.displayName)}
              </Text>
            </View>
          </Marker>
        ))}

        {/* Place markers */}
        {places.map(place => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.lat, longitude: place.lng }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={selectedPlaceId === place.id}
            onPress={() =>
              setSelectedPlaceId(prev => (prev === place.id ? null : place.id))
            }
          >
            <PlaceMarkerView
              place={place}
              latitudeDelta={latitudeDelta}
              isSelected={selectedPlaceId === place.id}
            />
          </Marker>
        ))}
      </MapView>

      {/* Long-press hint */}
      <View
        style={[styles.hintBadge, { backgroundColor: colors.surface + 'EE' }]}
      >
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>
          Hold map to drop a pin
        </Text>
      </View>

      {/* Bottom card */}
      <View
        style={[
          styles.bottomCard,
          {
            backgroundColor: colors.surface,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        {/* ── Share button ── */}
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            { backgroundColor: sharing ? colors.danger : ACCENT },
          ]}
          onPress={() => (sharing ? handleStopSharing() : startSharing())}
        >
          <Text style={styles.toggleBtnText}>
            {sharing ? '⏹ Stop Sharing' : '📍 Share My Location'}
          </Text>
        </TouchableOpacity>

        {/* ── Member location chips ── */}
        {locations.length > 0 && (
          <>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.memberScroll}
              contentContainerStyle={styles.memberScrollContent}
            >
              {locations.map(loc => (
                <TouchableOpacity
                  key={loc.uid}
                  style={styles.memberChip}
                  onPress={() => flyTo(loc.lat, loc.lng)}
                >
                  <View
                    style={[
                      styles.chipAvatar,
                      { backgroundColor: memberColor(loc.displayName) },
                    ]}
                  >
                    <Text style={styles.chipInitials}>
                      {initials(loc.displayName)}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={[styles.chipName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {loc.uid === uid ? 'You' : loc.displayName}
                    </Text>
                    <Text
                      style={[styles.chipTime, { color: colors.textTertiary }]}
                    >
                      {timeAgo(loc.updatedAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Divider before places */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* ── Places section ── */}
        <View style={styles.placesHeader}>
          <Text style={[styles.placesTitle, { color: colors.textSecondary }]}>
            FAMILY PLACES
          </Text>
          <TouchableOpacity
            onPress={() => openAddPlace()}
            style={[styles.addPlaceBtn, { backgroundColor: ACCENT + '20' }]}
          >
            <Text style={[styles.addPlaceBtnText, { color: ACCENT }]}>
              + Add Place
            </Text>
          </TouchableOpacity>
        </View>

        {places.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContent}
          >
            {places
              .slice()
              .reverse()
              .map(place => {
                const cfg = PLACE_CONFIG[place.type];
                return (
                  <TouchableOpacity
                    key={place.id}
                    onPress={() => {
                      flyTo(place.lat, place.lng);
                      setSelectedPlaceId(place.id);
                    }}
                    onLongPress={() => handlePlaceLongPress(place)}
                    delayLongPress={400}
                    style={[
                      styles.placeChip,
                      {
                        backgroundColor: cfg.color + '20',
                        borderColor: cfg.color + '60',
                      },
                    ]}
                  >
                    <Text style={styles.placeChipEmoji}>{cfg.emoji}</Text>
                    <Text
                      style={[styles.placeChipName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {place.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
        ) : (
          <Text style={[styles.noPlacesHint, { color: colors.textSecondary }]}>
            Tap "+ Add Place" or hold the map to pin a location
          </Text>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Member markers
  memberPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  memberInitials: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Place markers
  placeMarkerWrap: { alignItems: 'center' },
  placeMarkerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  placeMarkerLabel: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  placeMarkerLabelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Hint badge
  hintBadge: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  hintText: { fontSize: 12 },

  // Bottom card
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },

  // Member chips
  memberScroll: { marginBottom: 4, paddingHorizontal: 16 },
  memberScrollContent: { gap: 8, paddingRight: 8 },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  chipAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInitials: { color: '#fff', fontSize: 13, fontWeight: '700' },
  chipName: { fontSize: 13, fontWeight: '600' },
  chipTime: { fontSize: 11 },

  // Places section
  placesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  placesTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  addPlaceBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  addPlaceBtnText: { fontSize: 13, fontWeight: '700' },

  chipsContent: { gap: 8, paddingBottom: 4, marginLeft: 12 },
  placeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  placeChipEmoji: { fontSize: 15 },
  placeChipName: { fontSize: 13, fontWeight: '600' },

  noPlacesHint: { fontSize: 12, textAlign: 'center', paddingBottom: 4 },

  // Share button
  toggleBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  toggleBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
