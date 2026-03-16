import firestore from '@react-native-firebase/firestore';

export type ActivityType =
  | 'chore_done'
  | 'chore_undone'
  | 'shopping_added'
  | 'photo_uploaded'
  | 'recipe_added'
  | 'event_added'
  | 'transaction_added'
  | 'transaction_deleted'
  | 'category_added'
  | 'category_deleted'
  | 'category_limit_updated'
  | 'badge_earned'
  | 'member_joined'
  | 'timetable_event_added'
  | 'special_day_added';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  actorUid: string;
  actorName: string;
  payload: Record<string, string>;
  createdAt: number;
}

function activityRef(familyId: string) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('activity');
}

export function logActivity(
  familyId: string,
  type: ActivityType,
  actorUid: string,
  actorName: string,
  payload: Record<string, string> = {},
): void {
  activityRef(familyId)
    .add({ type, actorUid, actorName, payload, createdAt: Date.now() })
    .catch(() => {});
}

export function subscribeToActivity(
  familyId: string,
  onUpdate: (items: ActivityItem[]) => void,
  limit = 50,
): () => void {
  return activityRef(familyId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .onSnapshot(snap => {
      onUpdate((snap?.docs ?? []).map(d => ({ id: d.id, ...d.data() } as ActivityItem)));
    });
}

export async function pruneOldActivity(familyId: string): Promise<void> {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const snap = await activityRef(familyId).where('createdAt', '<', cutoff).get();
  const batch = firestore().batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

export function activityLabel(item: ActivityItem): string {
  const { actorName, payload } = item;
  switch (item.type) {
    case 'chore_done':        return `${actorName} completed "${payload.choreName}"`;
    case 'chore_undone':      return `${actorName} unmarked "${payload.choreName}"`;
    case 'shopping_added':    return `${actorName} added "${payload.itemName}" to shopping`;
    case 'photo_uploaded':    return `${actorName} uploaded a photo`;
    case 'recipe_added':      return `${actorName} added recipe "${payload.recipeTitle}"`;
    case 'event_added':       return `${actorName} added "${payload.eventTitle}" to calendar`;
    case 'transaction_added':      return `${actorName} logged ${payload.amount} in ${payload.categoryName}`;
    case 'transaction_deleted':    return `${actorName} deleted a ${payload.categoryName} expense`;
    case 'category_added':         return `${actorName} added budget category "${payload.categoryName}"`;
    case 'category_deleted':       return `${actorName} deleted budget category "${payload.categoryName}"`;
    case 'category_limit_updated': return `${actorName} updated the limit for "${payload.categoryName}"`;
    case 'badge_earned':           return `${actorName} earned the "${payload.badgeName}" badge ${payload.badgeEmoji}`;
    case 'member_joined':          return `${actorName} joined the family`;
  }
}

export function activityEmoji(type: ActivityType): string {
  switch (type) {
    case 'chore_done':        return '🧹';
    case 'chore_undone':      return '↩️';
    case 'shopping_added':    return '🛒';
    case 'photo_uploaded':    return '📷';
    case 'recipe_added':      return '🍳';
    case 'event_added':       return '📅';
    case 'transaction_added':      return '💰';
    case 'transaction_deleted':    return '🗑️';
    case 'category_added':         return '📂';
    case 'category_deleted':       return '🗑️';
    case 'category_limit_updated': return '✏️';
    case 'badge_earned':           return '🏅';
    case 'member_joined':          return '👋';
  }
}

export function relativeTime(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

export function groupByDay(
  items: ActivityItem[],
): { label: string; data: ActivityItem[] }[] {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const map = new Map<string, ActivityItem[]>();
  for (const item of items) {
    const ds = new Date(item.createdAt).toDateString();
    let label: string;
    if (ds === today)     { label = 'Today'; }
    else if (ds === yesterday) { label = 'Yesterday'; }
    else {
      label = new Date(item.createdAt).toLocaleDateString(undefined, {
        weekday: 'long', day: 'numeric', month: 'short',
      });
    }
    if (!map.has(label)) { map.set(label, []); }
    map.get(label)!.push(item);
  }
  return Array.from(map.entries()).map(([label, data]) => ({ label, data }));
}
