import * as admin from 'firebase-admin';
import { onDocumentUpdated, onDocumentCreated } from 'firebase-functions/v2/firestore';

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

export const onNewMessage = onDocumentCreated(
  { document: 'families/{familyId}/messages/{messageId}', region: 'europe-west2' },
  async (event) => {
    const data = event.data?.data();
    if (!data) { return; }

    const senderUid: string = data.senderId;
    const senderName: string = data.senderName ?? 'Someone';
    const text: string = data.text ?? '';
    const familyId: string = event.params.familyId;

    // Get all family members
    const familyDoc = await admin.firestore().collection('families').doc(familyId).get();
    if (!familyDoc.exists) { return; }

    const members: string[] = familyDoc.data()?.members ?? [];
    const recipients = members.filter(uid => uid !== senderUid);
    if (recipients.length === 0) { return; }

    // Get FCM tokens for all recipients
    const userDocs = await Promise.all(
      recipients.map(uid => admin.firestore().collection('users').doc(uid).get())
    );

    const tokens = userDocs
      .map(doc => doc.data()?.fcmToken as string | undefined)
      .filter((t): t is string => !!t);

    if (tokens.length === 0) { return; }

    const body = text.length > 100 ? `${text.slice(0, 100)}…` : text;

    await Promise.all(tokens.map(token =>
      admin.messaging().send({
        token,
        notification: { title: senderName, body },
        data: {
          type: 'new_message',
          familyId,
          title: senderName,
          body,
        },
        android: {
          notification: { channelId: 'default', sound: 'default' },
        },
        apns: {
          payload: { aps: { sound: 'default' } },
        },
      }).catch(err => console.error(`Failed to send to ${token}:`, err))
    ));
  }
);
