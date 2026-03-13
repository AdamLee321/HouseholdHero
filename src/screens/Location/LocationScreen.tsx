import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  ScrollView,
  Alert,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
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

Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: 'whenInUse',
});

const DEFAULT_REGION: Region = {
  latitude: 53.3498,
  longitude: -6.2603,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Stable colour per member name
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
  if (sec < 60) {
    return 'Just now';
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return `${min}m ago`;
  }
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
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
  return true; // iOS permission is handled natively via Info.plist
}

export default function LocationScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { family, profile } = useFamilyStore();
  const mapRef = useRef<MapView>(null);

  const uid = auth().currentUser?.uid ?? '';
  const ACCENT = colors.tiles.location.icon;

  const [locations, setLocations] = useState<MemberLocation[]>([]);
  const [sharing, setSharing] = useState(false);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const watchIdRef = useRef<number | null>(null);

  // Subscribe to all family member locations
  useEffect(() => {
    if (!family) {
      return;
    }
    const unsub = subscribeToLocations(family.id, setLocations);
    return unsub;
  }, [family]);

  // Clean up watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // When other members share their location, fit map to all markers
  useEffect(() => {
    if (locations.length === 0 || !mapRef.current) {
      return;
    }
    mapRef.current.fitToCoordinates(
      locations.map(l => ({ latitude: l.lat, longitude: l.lng })),
      {
        edgePadding: { top: 80, right: 60, bottom: 220, left: 60 },
        animated: true,
      },
    );
  }, [locations.length]);

  async function startSharing() {
    const granted = await requestLocationPermission();
    if (!granted) {
      Alert.alert(
        'Permission Denied',
        'Location permission is required to share your location.',
      );
      return;
    }

    setSharing(true);

    const watchId = Geolocation.watchPosition(
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
        // Move map to own position on first fix
        setRegion(prev => ({
          ...prev,
          latitude,
          longitude,
        }));
      },
      error => {
        console.warn('Location error:', error.message);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 10000,
        fastestInterval: 5000,
      },
    );

    watchIdRef.current = watchId;
  }

  async function handleStopSharing() {
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
    if (family) {
      await stopSharing(family.id, uid);
    }
  }

  function handleToggleSharing() {
    if (sharing) {
      handleStopSharing();
    } else {
      startSharing();
    }
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        region={region}
        onRegionChangeComplete={setRegion}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
      >
        {locations.map(loc => (
          <Marker
            key={loc.uid}
            coordinate={{ latitude: loc.lat, longitude: loc.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[
                styles.markerPin,
                { backgroundColor: memberColor(loc.displayName) },
              ]}
            >
              <Text style={styles.markerInitials}>
                {initials(loc.displayName)}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Empty state overlay */}
      {locations.length === 0 && (
        <View
          style={[
            styles.emptyOverlay,
            { backgroundColor: colors.surface + 'EE' },
          ]}
        >
          <Text style={styles.emptyEmoji}>📍</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No one is sharing yet
          </Text>
          <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
            Tap the button below to share your location
          </Text>
        </View>
      )}

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
        {/* Member list */}
        {locations.length > 0 && (
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
                onPress={() => {
                  mapRef.current?.animateToRegion(
                    {
                      latitude: loc.lat,
                      longitude: loc.lng,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    },
                    500,
                  );
                }}
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
                <View style={styles.chipInfo}>
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
        )}

        {/* Toggle button */}
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            { backgroundColor: sharing ? colors.danger : ACCENT },
          ]}
          onPress={handleToggleSharing}
        >
          <Text style={styles.toggleBtnText}>
            {sharing ? '⏹ Stop Sharing' : '📍 Share My Location'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  markerPin: {
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
  markerInitials: { color: '#fff', fontSize: 13, fontWeight: '700' },

  emptyOverlay: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 40,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyHint: { fontSize: 13, textAlign: 'center', marginTop: 4 },

  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },

  memberScroll: { marginBottom: 12 },
  memberScrollContent: { gap: 8, paddingRight: 8 },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInitials: { color: '#fff', fontSize: 13, fontWeight: '700' },
  chipInfo: {},
  chipName: { fontSize: 13, fontWeight: '600' },
  chipTime: { fontSize: 11 },

  toggleBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  toggleBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
