export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export const BADGES: BadgeDef[] = [
  { id: 'first_chore',  name: 'First Sweep',    emoji: '🧹', description: 'Complete your first chore' },
  { id: 'streak_3',     name: 'On a Roll',       emoji: '🔥', description: 'Reach a 3-day streak' },
  { id: 'streak_7',     name: 'Week Warrior',    emoji: '⚔️', description: 'Reach a 7-day streak' },
  { id: 'streak_30',    name: 'Month Legend',    emoji: '👑', description: 'Reach a 30-day streak' },
  { id: 'century',      name: 'Century',         emoji: '💯', description: 'Complete 100 chores' },
  { id: 'team_player',  name: 'Team Player',     emoji: '🤝', description: "Complete someone else's assigned chore" },
];

export const BADGE_MAP: Record<string, BadgeDef> = Object.fromEntries(
  BADGES.map(b => [b.id, b]),
);

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayString(): string {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

export function computeNewStreak(lastStreakDate: string, currentStreak: number): number {
  const today = todayString();
  if (lastStreakDate === today)           { return currentStreak; }       // already logged today
  if (lastStreakDate === yesterdayString()) { return currentStreak + 1; } // continuing
  return 1;                                                                // broken or first
}

export function checkNewBadges(
  existingBadges: string[],
  completedCount: number,
  currentStreak: number,
  assignedTo: string | null,
  uid: string,
): string[] {
  const has = new Set(existingBadges);
  const earned: string[] = [];

  function maybeEarn(id: string, condition: boolean) {
    if (condition && !has.has(id)) { earned.push(id); }
  }

  maybeEarn('first_chore', completedCount >= 1);
  maybeEarn('streak_3',    currentStreak >= 3);
  maybeEarn('streak_7',    currentStreak >= 7);
  maybeEarn('streak_30',   currentStreak >= 30);
  maybeEarn('century',     completedCount >= 100);
  maybeEarn('team_player', assignedTo !== null && assignedTo !== uid);

  return earned;
}
