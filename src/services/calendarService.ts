import firestore from '@react-native-firebase/firestore';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: number; // ms timestamp
  allDay: boolean;
  addedBy: string;
  addedByName: string;
  createdAt: number;
}

export function subscribeToCalendarEvents(
  familyId: string,
  onUpdate: (events: CalendarEvent[]) => void,
) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('calendarEvents')
    .orderBy('startDate', 'asc')
    .onSnapshot(snap => {
      const events: CalendarEvent[] = snap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<CalendarEvent, 'id'>),
      }));
      onUpdate(events);
    });
}

export async function addCalendarEvent(
  familyId: string,
  event: Omit<CalendarEvent, 'id' | 'createdAt'>,
) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('calendarEvents')
    .add({
      ...event,
      createdAt: Date.now(),
    });
}

export async function deleteCalendarEvent(familyId: string, eventId: string) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('calendarEvents')
    .doc(eventId)
    .delete();
}
