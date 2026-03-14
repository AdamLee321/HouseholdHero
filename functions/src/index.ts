import * as admin from 'firebase-admin';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

admin.initializeApp();

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  parent: 'Parent',
  guardian: 'Guardian',
  child: 'Child',
};

export const onUserRoleChanged = onDocumentUpdated(
  { document: 'users/{uid}', region: 'europe-west2' },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) { return; }

    const previousRole: string | undefined = before.role;
    const newRole: string | undefined = after.role;

    // Only fire when role actually changed
    if (!newRole || previousRole === newRole) { return; }

    const fcmToken: string | undefined = after.fcmToken;
    if (!fcmToken) { return; }

    const roleLabel = ROLE_LABELS[newRole] ?? newRole;
    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title: 'Role Updated',
        body: `Your account role has been changed to ${roleLabel}.`,
      },
      data: {
        title: 'Role Updated',
        body: `Your account role has been changed to ${roleLabel}.`,
      },
      android: {
        notification: {
          channelId: 'default',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    try {
      await admin.messaging().send(message);
    } catch (err) {
      console.error('Failed to send role-change notification:', err);
    }
  }
);
