import React, { useEffect, useState } from 'react';
import { View, ScrollView, Switch, StyleSheet } from 'react-native';
import Text from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useFamilyStore } from '../../store/familyStore';
import {
  NotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
  subscribeToNotificationPrefs,
  saveNotificationPrefs,
} from '../../services/notificationPrefsService';

interface NotifRow {
  key: keyof NotificationPrefs;
  label: string;
  description: string;
  roles?: ('admin' | 'parent' | 'guardian' | 'child')[];
}

const SECTIONS: { title: string; rows: NotifRow[] }[] = [
  {
    title: 'CHORES',
    rows: [
      {
        key: 'choresDue',
        label: 'Chore Reminders',
        description: 'Notify when an assigned chore is due',
      },
      {
        key: 'choresOverdue',
        label: 'Overdue Alerts',
        description: 'Notify when an assigned chore is overdue',
      },
    ],
  },
  {
    title: 'ACHIEVEMENTS',
    rows: [
      {
        key: 'badgeEarned',
        label: 'Badge Earned',
        description: 'Notify when you earn a new badge',
      },
    ],
  },
  {
    title: 'CALENDAR',
    rows: [
      {
        key: 'calendarReminders',
        label: 'Event Reminders',
        description: 'Notify before upcoming calendar events',
      },
    ],
  },
  {
    title: 'MESSAGES',
    rows: [
      {
        key: 'chatMessages',
        label: 'New Messages',
        description: 'Notify when you receive a new message',
      },
    ],
  },
  {
    title: 'GALLERY',
    rows: [
      {
        key: 'galleryUploads',
        label: 'Photo Uploads',
        description: 'Notify when a family member adds a photo',
      },
    ],
  },
  {
    title: 'BUDGET',
    rows: [
      {
        key: 'budgetLimitWarning',
        label: 'Spending Limit Warning',
        description: 'Notify when a category approaches its monthly limit',
        roles: ['admin', 'parent', 'guardian'],
      },
    ],
  },
  {
    title: 'MEAL PLANNER',
    rows: [
      {
        key: 'mealPlannerUpdates',
        label: 'Meal Plan Changes',
        description: 'Notify when a family member updates the meal plan',
      },
    ],
  },
  {
    title: 'OTHER',
    rows: [
      {
        key: 'shoppingListUpdates',
        label: 'Shopping List Updates',
        description: 'Notify when items are added to the shopping list',
        roles: ['admin', 'parent', 'guardian'],
      },
      {
        key: 'activityFeed',
        label: 'Family Activity',
        description: 'Notify when there is new family activity',
      },
      {
        key: 'emergencyContactsUpdates',
        label: 'Emergency Contacts',
        description: 'Notify when emergency contacts are added or updated',
      },
      {
        key: 'locationUpdates',
        label: 'Location Sharing',
        description: 'Notify when a family member starts sharing their location',
      },
    ],
  },
];

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { profile } = useFamilyStore();
  const uid = user?.uid ?? '';
  const role = profile?.role ?? 'child';

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);

  useEffect(() => {
    if (!uid) { return; }
    return subscribeToNotificationPrefs(uid, setPrefs);
  }, [uid]);

  async function toggle(key: keyof NotificationPrefs) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    await saveNotificationPrefs(uid, updated);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
    >
      {SECTIONS.map(section => {
        const visibleRows = section.rows.filter(
          row => !row.roles || row.roles.includes(role as any),
        );
        if (visibleRows.length === 0) { return null; }

        return (
          <View key={section.title} style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {section.title}
            </Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              {visibleRows.map((row, i) => (
                <View
                  key={row.key}
                  style={[
                    styles.row,
                    { borderBottomColor: colors.border },
                    i === visibleRows.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.rowText}>
                    <Text style={[styles.rowLabel, { color: colors.text }]}>{row.label}</Text>
                    <Text style={[styles.rowDesc, { color: colors.textTertiary }]}>
                      {row.description}
                    </Text>
                  </View>
                  <Switch
                    value={prefs[row.key]}
                    onValueChange={() => toggle(row.key)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  sectionWrap: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  card: { borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  rowDesc: { fontSize: 12, lineHeight: 16 },
});
