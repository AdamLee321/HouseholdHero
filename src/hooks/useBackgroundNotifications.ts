import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useFamilyStore } from '../store/familyStore';
import {
  NotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
  subscribeToNotificationPrefs,
} from '../services/notificationPrefsService';
import {
  updateCachedPrefs,
  showMessageNotification,
  showShoppingNotification,
  showGalleryNotification,
  showContactsNotification,
  showActivityNotification,
  showLocationNotification,
  showMealPlannerNotification,
  scheduleChoreReminder,
  scheduleEventReminder,
} from '../services/notificationService';
import { subscribeToChats, getChatDisplayName } from '../services/chatService';
import { subscribeToShoppingLists } from '../services/shoppingService';
import { subscribeToPhotos } from '../services/galleryService';
import { subscribeToContacts } from '../services/contactService';
import { subscribeToActivity, activityLabel } from '../services/activityService';
import { subscribeToLocations } from '../services/locationService';
import { subscribeToChores } from '../services/choreService';
import { subscribeToCalendarEvents } from '../services/calendarService';
import { subscribeMealPlan, getMondayOfWeek, toWeekKey, DAY_LABELS, MEAL_LABELS } from '../services/mealPlanService';
import { getCurrentScreenName } from '../navigation/navigationRef';

export function useBackgroundNotifications(): void {
  const { user } = useAuthStore();
  const { family, profile } = useFamilyStore();
  const uid = user?.uid ?? '';
  const familyId = family?.id ?? '';
  const displayName = profile?.displayName ?? '';

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);

  // Subscribe to prefs and keep the module-level cache in sync
  useEffect(() => {
    if (!uid) { return; }
    return subscribeToNotificationPrefs(uid, p => {
      setPrefs(p);
      updateCachedPrefs(p);
    });
  }, [uid]);

  // ── Chat messages ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!familyId || !uid || !prefs.chatMessages) { return; }
    let initialized = false;
    const knownKeys = new Set<string>();
    return subscribeToChats(familyId, uid, chats => {
      if (!initialized) {
        chats.forEach(c => knownKeys.add(`${c.id}:${c.lastMessageAt ?? 0}`));
        initialized = true;
        return;
      }
      const screen = getCurrentScreenName();
      for (const chat of chats) {
        const key = `${chat.id}:${chat.lastMessageAt ?? 0}`;
        if (
          !knownKeys.has(key) &&
          chat.lastMessageAt &&
          chat.lastMessageSenderName !== displayName &&
          screen !== 'Chat'
        ) {
          showMessageNotification(
            chat.lastMessageSenderName ?? 'Someone',
            getChatDisplayName(chat, uid),
            chat.lastMessage ?? '',
          );
          knownKeys.add(key);
        }
      }
    });
  }, [familyId, uid, prefs.chatMessages, displayName]);

  // ── Shopping list ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!familyId || !uid || !prefs.shoppingListUpdates) { return; }
    let initialized = false;
    const knownCounts = new Map<string, number>();
    return subscribeToShoppingLists(familyId, lists => {
      if (!initialized) {
        lists.forEach(l => knownCounts.set(l.id, l.itemCount));
        initialized = true;
        return;
      }
      for (const list of lists) {
        const prev = knownCounts.get(list.id) ?? 0;
        if (list.itemCount > prev && list.lastAddedBy !== uid) {
          showShoppingNotification(
            list.lastAddedByName ?? 'Someone',
            list.lastAddedItemName ?? 'an item',
          );
        }
        knownCounts.set(list.id, list.itemCount);
      }
    });
  }, [familyId, uid, prefs.shoppingListUpdates]);

  // ── Gallery ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!familyId || !uid || !prefs.galleryUploads) { return; }
    let initialized = false;
    const knownIds = new Set<string>();
    return subscribeToPhotos(familyId, photos => {
      if (!initialized) {
        photos.forEach(p => knownIds.add(p.id));
        initialized = true;
        return;
      }
      for (const photo of photos) {
        if (!knownIds.has(photo.id) && photo.uploadedBy !== uid) {
          showGalleryNotification(photo.uploadedByName);
          knownIds.add(photo.id);
        }
      }
    });
  }, [familyId, uid, prefs.galleryUploads]);

  // ── Emergency contacts ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!familyId || !uid || !prefs.emergencyContactsUpdates) { return; }
    let initialized = false;
    const knownIds = new Set<string>();
    return subscribeToContacts(familyId, uid, contacts => {
      if (!initialized) {
        contacts.forEach(c => knownIds.add(c.id));
        initialized = true;
        return;
      }
      for (const contact of contacts) {
        if (!knownIds.has(contact.id) && contact.addedBy !== uid) {
          showContactsNotification(contact.name);
          knownIds.add(contact.id);
        }
      }
    });
  }, [familyId, uid, prefs.emergencyContactsUpdates]);

  // ── Activity feed ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!familyId || !uid || !prefs.activityFeed) { return; }
    let initialized = false;
    const knownIds = new Set<string>();
    return subscribeToActivity(familyId, items => {
      if (!initialized) {
        items.forEach(i => knownIds.add(i.id));
        initialized = true;
        return;
      }
      for (const item of items) {
        if (!knownIds.has(item.id) && item.actorUid !== uid) {
          showActivityNotification(activityLabel(item));
          knownIds.add(item.id);
        }
      }
    });
  }, [familyId, uid, prefs.activityFeed]);

  // ── Location sharing ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!familyId || !uid || !prefs.locationUpdates) { return; }
    let initialized = false;
    const sharingState = new Map<string, boolean>();
    return subscribeToLocations(familyId, locations => {
      if (!initialized) {
        locations.forEach(l => sharingState.set(l.uid, true));
        initialized = true;
        return;
      }
      // Mark absent members as no longer sharing
      const currentUids = new Set(locations.map(l => l.uid));
      for (const [memberUid] of sharingState) {
        if (!currentUids.has(memberUid)) {
          sharingState.set(memberUid, false);
        }
      }
      // Notify for newly sharing members
      for (const loc of locations) {
        if (loc.uid === uid) { continue; }
        const was = sharingState.get(loc.uid) ?? false;
        if (!was) {
          showLocationNotification(loc.displayName);
        }
        sharingState.set(loc.uid, true);
      }
    });
  }, [familyId, uid, prefs.locationUpdates]);

  // ── Chore reminders (schedule for newly assigned chores) ──────────────────
  useEffect(() => {
    if (!familyId || !uid || !prefs.choresDue) { return; }
    let initialized = false;
    const knownIds = new Set<string>();
    return subscribeToChores(familyId, chores => {
      if (!initialized) {
        chores.forEach(c => knownIds.add(c.id));
        initialized = true;
        return;
      }
      for (const chore of chores) {
        if (!knownIds.has(chore.id) && chore.assignedTo === uid) {
          scheduleChoreReminder(chore.id, chore.name, chore.frequency);
          knownIds.add(chore.id);
        }
      }
    });
  }, [familyId, uid, prefs.choresDue]);

  // ── Calendar event reminders ───────────────────────────────────────────────
  useEffect(() => {
    if (!familyId || !uid || !prefs.calendarReminders) { return; }
    let initialized = false;
    const knownIds = new Set<string>();
    return subscribeToCalendarEvents(familyId, events => {
      if (!initialized) {
        events.forEach(e => knownIds.add(e.id));
        initialized = true;
        return;
      }
      for (const event of events) {
        if (!knownIds.has(event.id) && event.startDate > Date.now()) {
          scheduleEventReminder(event.id, event.title, event.startDate);
          knownIds.add(event.id);
        }
      }
    });
  }, [familyId, uid, prefs.calendarReminders]);

  // ── Meal planner updates ───────────────────────────────────────────────────
  useEffect(() => {
    if (!familyId || !uid || !prefs.mealPlannerUpdates) { return; }
    const weekStart = toWeekKey(getMondayOfWeek(new Date()));
    let lastUpdateAt: number | null = null;
    return subscribeMealPlan(familyId, weekStart, plan => {
      const update = plan.lastUpdate;
      if (!update) { return; }
      if (lastUpdateAt === null) {
        lastUpdateAt = update.updatedAt;
        return;
      }
      if (update.updatedAt <= lastUpdateAt) { return; }
      lastUpdateAt = update.updatedAt;
      if (update.uid === uid) { return; }
      const action = update.slotName === null ? 'removed' : 'changed';
      showMealPlannerNotification(
        update.displayName,
        action,
        update.slotName ?? '',
        DAY_LABELS[update.day],
        MEAL_LABELS[update.mealType],
      );
    });
  }, [familyId, uid, prefs.mealPlannerUpdates]);
}
