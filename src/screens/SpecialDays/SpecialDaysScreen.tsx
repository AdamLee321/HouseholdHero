import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Text from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { SheetManager } from 'react-native-actions-sheet';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import { FamilyMember } from '../../services/familyService';
import {
  SpecialDay,
  subscribeToSpecialDays,
  TYPE_META,
  formatSpecialDate,
  daysUntil,
  msUntil,
  formatTime12,
  countdownLabel,
} from '../../services/specialDaysService';

type Tab = 'upcoming' | 'all';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'upcoming', label: 'Upcoming', emoji: '🔜' },
  { key: 'all',      label: 'All',      emoji: '📋' },
];

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const BANNER_GRADIENTS: [string, string, string][] = [
  ['#4F46E5', '#7C3AED', '#A855F7'],  // indigo → violet
  ['#0EA5E9', '#6366F1', '#8B5CF6'],  // sky → indigo
  ['#059669', '#0D9488', '#0891B2'],  // emerald → teal → cyan
  ['#D97706', '#EA580C', '#DC2626'],  // amber → orange → red
  ['#DB2777', '#9333EA', '#6366F1'],  // pink → purple → indigo
  ['#0284C7', '#0369A1', '#1D4ED8'],  // sky → blue
  ['#16A34A', '#0D9488', '#0891B2'],  // green → teal
  ['#7C3AED', '#DB2777', '#F97316'],  // purple → pink → orange
  ['#1D4ED8', '#4F46E5', '#7C3AED'],  // blue → indigo → violet
  ['#B45309', '#B91C1C', '#9D174D'],  // amber → red → pink
];

function randomGradient(): [string, string, string] {
  return BANNER_GRADIENTS[Math.floor(Math.random() * BANNER_GRADIENTS.length)];
}

export default function SpecialDaysScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { family, profile } = useFamilyStore();

  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [days, setDays] = useState<SpecialDay[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [bannerMs, setBannerMs] = useState(-1);
  const [gradient, setGradient] = useState<[string, string, string]>(randomGradient);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const uid         = auth().currentUser?.uid ?? '';
  const displayName = profile?.displayName ?? 'Unknown';
  const familyId    = family?.id ?? '';
  const ACCENT      = colors.tiles.specialDays.icon;

  useEffect(() => {
    if (!family) { return; }
    const unsubDays = subscribeToSpecialDays(family.id, setDays);
    const unsubMembers = firestore()
      .collection('users')
      .where('familyId', '==', family.id)
      .onSnapshot(snap => {
        if (!snap) { return; }
        setMembers(snap.docs.map(d => ({
          uid: d.id,
          displayName: d.data().displayName ?? 'Unknown',
          email: d.data().email ?? null,
          role: d.data().role ?? 'child',
        })));
      });
    return () => { unsubDays(); unsubMembers(); };
  }, [family]);

  function openAdd() {
    SheetManager.show('add-special-day', {
      payload: { familyId, uid, displayName, members },
    });
  }

  function openEdit(day: SpecialDay) {
    SheetManager.show('add-special-day', {
      payload: { familyId, uid, displayName, members, editDay: day },
    });
  }

  // Upcoming: sorted by days until next occurrence, only future/today
  const upcoming = useMemo(() => {
    return [...days]
      .map(d => ({ day: d, days: daysUntil(d.day, d.month, d.year) }))
      .filter(({ days: n, day }) => {
        if (day.year !== null) {
          // one-time: only show if in the future or today
          return n >= 0;
        }
        return true; // recurring always shown
      })
      .sort((a, b) => a.days - b.days)
      .slice(0, 20)
      .map(({ day }) => day);
  }, [days]);

  // Live countdown tick for the banner
  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); }
    if (upcoming.length === 0) { setBannerMs(-1); return; }
    setGradient(randomGradient());
    const next = upcoming[0];
    if (!next.time) { setBannerMs(-1); return; }
    const tick = () => setBannerMs(msUntil(next.day, next.month, next.year, next.time));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); } };
  }, [upcoming]);

  // All: sorted by month then day
  const allSorted = useMemo(
    () => [...days].sort((a, b) => a.month !== b.month ? a.month - b.month : a.day - b.day),
    [days],
  );

  // Group all by month
  const grouped = useMemo(() => {
    const map = new Map<number, SpecialDay[]>();
    for (const d of allSorted) {
      if (!map.has(d.month)) { map.set(d.month, []); }
      map.get(d.month)!.push(d);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [allSorted]);

  function DayCard({ item }: { item: SpecialDay }) {
    const n = daysUntil(item.day, item.month, item.year);
    const isToday = n === 0;
    const meta = TYPE_META[item.type];
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={() => openEdit(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.cardAccent, { backgroundColor: isToday ? ACCENT : colors.primaryLight }]}>
          <Text style={styles.cardEmoji}>{meta.emoji}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
            {formatSpecialDate(item.day, item.month, item.year)}
            {item.time ? `  ·  ${formatTime12(item.time)}` : ''}
          </Text>
          {item.memberNames.length > 0 && (
            <Text style={[styles.cardMembers, { color: colors.textTertiary }]} numberOfLines={1}>
              👤 {item.memberNames.join(', ')}
            </Text>
          )}
          {item.note ? (
            <Text style={[styles.cardNote, { color: colors.textTertiary }]} numberOfLines={1}>
              {item.note}
            </Text>
          ) : null}
        </View>
        <View style={styles.cardRight}>
          <Text style={[
            styles.countdownText,
            { color: isToday ? ACCENT : colors.primary },
          ]}>
            {countdownLabel(n)}
          </Text>
          <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface }]}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabBtn,
              activeTab === tab.key && { borderBottomColor: ACCENT, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabEmoji}>{tab.emoji}</Text>
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? ACCENT : colors.textTertiary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Next event banner */}
      {upcoming.length > 0 && (() => {
        const next = upcoming[0];
        const n = daysUntil(next.day, next.month, next.year);
        const isToday = n === 0;
        const meta = TYPE_META[next.type];
        const hasTime = !!next.time;

        if (hasTime) {
          // Segmented countdown banner
          const ms = bannerMs > 0 ? bannerMs : 0;
          const totalSec = Math.floor(ms / 1000);
          const d = Math.floor(totalSec / 86400);
          const h = Math.floor((totalSec % 86400) / 3600);
          const min = Math.floor((totalSec % 3600) / 60);
          const s = totalSec % 60;
          const done = ms <= 0;
          const segments = done
            ? []
            : d > 0
              ? [{ val: d, label: 'DAYS' }, { val: h, label: 'HRS' }, { val: min, label: 'MIN' }, { val: s, label: 'SEC' }]
              : [{ val: h, label: 'HRS' }, { val: min, label: 'MIN' }, { val: s, label: 'SEC' }];

          return (
            <TouchableOpacity onPress={() => openEdit(next)} activeOpacity={0.85}>
              <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bannerTall}
              >
                {/* Header row */}
                <View style={styles.bannerTallHeader}>
                  <Text style={styles.bannerEmoji}>{meta.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bannerLabel}>
                      {isToday ? 'Today!' : 'Coming up next'}
                    </Text>
                    <Text style={styles.bannerTitle} numberOfLines={1}>{next.title}</Text>
                    {next.memberNames.length > 0 && (
                      <Text style={styles.bannerMembers} numberOfLines={1}>
                        {next.memberNames.join(', ')}
                      </Text>
                    )}
                  </View>
                </View>
                {/* Divider */}
                <View style={styles.bannerDivider} />
                {/* Countdown segments */}
                {done ? (
                  <Text style={styles.bannerDoneText}>Now! 🎉</Text>
                ) : (
                  <View style={styles.bannerSegments}>
                    {segments.map(seg => (
                      <View key={seg.label} style={styles.bannerSegment}>
                        <Text style={styles.bannerSegVal}>
                          {String(seg.val).padStart(2, '0')}
                        </Text>
                        <Text style={styles.bannerSegLabel}>{seg.label}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          );
        }

        // Plain day-count banner
        return (
          <TouchableOpacity onPress={() => openEdit(next)} activeOpacity={0.85}>
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.banner}
            >
              <Text style={styles.bannerEmoji}>{meta.emoji}</Text>
              <View style={styles.bannerBody}>
                <Text style={styles.bannerLabel}>
                  {isToday ? 'Today!' : 'Coming up next'}
                </Text>
                <Text style={styles.bannerTitle} numberOfLines={1}>
                  {next.title}
                </Text>
                {next.memberNames.length > 0 && (
                  <Text style={styles.bannerMembers} numberOfLines={1}>
                    {next.memberNames.join(', ')}
                  </Text>
                )}
              </View>
              <View style={styles.bannerRight}>
                <Text style={styles.bannerDays}>
                  {isToday ? '🎉' : String(n)}
                </Text>
                {!isToday && (
                  <Text style={styles.bannerDaysLabel}>
                    {n === 1 ? 'day' : 'days'}
                  </Text>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        );
      })()}

      {/* Content */}
      {activeTab === 'upcoming' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            upcoming.length === 0 && styles.emptyContent,
          ]}
        >
          {upcoming.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No special days yet</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Tap + to add birthdays, anniversaries and more
              </Text>
            </View>
          ) : (
            upcoming.map(item => <DayCard key={item.id} item={item} />)
          )}
        </ScrollView>
      )}

      {activeTab === 'all' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            grouped.length === 0 && styles.emptyContent,
          ]}
        >
          {grouped.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No special days yet</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Tap + to add birthdays, anniversaries and more
              </Text>
            </View>
          ) : (
            grouped.map(([monthNum, items]) => (
              <View key={monthNum} style={styles.monthSection}>
                <Text style={[styles.monthHeader, { color: colors.textSecondary }]}>
                  {MONTH_NAMES_FULL[monthNum - 1].toUpperCase()}
                </Text>
                {items.map(item => <DayCard key={item.id} item={item} />)}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: ACCENT, bottom: insets.bottom + 30 }]}
        onPress={openAdd}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabEmoji: { fontSize: 18 },
  tabLabel: { fontSize: 12, fontWeight: '600' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  bannerTall: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  bannerTallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  bannerEmoji: { fontSize: 32 },
  bannerBody: { flex: 1 },
  bannerLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  bannerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  bannerMembers: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  bannerRight: { alignItems: 'center' },
  bannerDays: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 32 },
  bannerDaysLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  bannerSegments: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  bannerSegment: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 12,
    paddingVertical: 10,
  },
  bannerSegVal: { fontSize: 32, fontWeight: '800', color: '#fff', lineHeight: 36 },
  bannerSegLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8, marginTop: 2 },
  bannerDoneText: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', paddingVertical: 8 },
  listContent: { padding: 16, paddingBottom: 100 },
  emptyContent: { flex: 1 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  monthSection: { marginBottom: 24 },
  monthHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 10,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardAccent: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: { fontSize: 24 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardDate: { fontSize: 13, marginBottom: 2 },
  cardMembers: { fontSize: 12 },
  cardNote: { fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  countdownText: { fontSize: 12, fontWeight: '700' },
  chevron: { fontSize: 20, fontWeight: '300' },
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
