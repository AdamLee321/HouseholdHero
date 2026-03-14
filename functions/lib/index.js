"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onChatDeleted = exports.onNewMessage = exports.onUserRoleChanged = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-functions/v2/firestore");
admin.initializeApp();
const ROLE_LABELS = {
    admin: 'Admin',
    parent: 'Parent',
    guardian: 'Guardian',
    child: 'Child',
};
exports.onUserRoleChanged = (0, firestore_1.onDocumentUpdated)({ document: 'users/{uid}', region: 'europe-west2' }, async (event) => {
    var _a, _b, _c;
    const before = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const after = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!before || !after) {
        return;
    }
    const previousRole = before.role;
    const newRole = after.role;
    // Only fire when role actually changed
    if (!newRole || previousRole === newRole) {
        return;
    }
    const fcmToken = after.fcmToken;
    if (!fcmToken) {
        return;
    }
    const roleLabel = (_c = ROLE_LABELS[newRole]) !== null && _c !== void 0 ? _c : newRole;
    const message = {
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
    }
    catch (err) {
        console.error('Failed to send role-change notification:', err);
    }
});
exports.onNewMessage = (0, firestore_1.onDocumentCreated)({ document: 'families/{familyId}/chats/{chatId}/messages/{messageId}', region: 'europe-west2' }, async (event) => {
    var _a, _b, _c, _d, _e;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data) {
        return;
    }
    const senderUid = data.senderId;
    const senderName = (_b = data.senderName) !== null && _b !== void 0 ? _b : 'Someone';
    const text = (_c = data.text) !== null && _c !== void 0 ? _c : '';
    const familyId = event.params.familyId;
    const chatId = event.params.chatId;
    // Get chat members
    const chatDoc = await admin.firestore()
        .collection('families').doc(familyId)
        .collection('chats').doc(chatId)
        .get();
    if (!chatDoc.exists) {
        return;
    }
    const members = (_e = (_d = chatDoc.data()) === null || _d === void 0 ? void 0 : _d.members) !== null && _e !== void 0 ? _e : [];
    const recipients = members.filter(uid => uid !== senderUid);
    if (recipients.length === 0) {
        return;
    }
    // Get FCM tokens for all recipients
    const userDocs = await Promise.all(recipients.map(uid => admin.firestore().collection('users').doc(uid).get()));
    const tokens = userDocs
        .map(doc => { var _a; return (_a = doc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken; })
        .filter((t) => !!t);
    if (tokens.length === 0) {
        return;
    }
    const body = text.length > 100 ? `${text.slice(0, 100)}…` : text;
    await Promise.all(tokens.map(token => admin.messaging().send({
        token,
        notification: { title: senderName, body },
        data: { type: 'new_message', familyId, chatId, title: senderName, body },
        android: { notification: { channelId: 'default', sound: 'default' } },
        apns: { payload: { aps: { sound: 'default' } } },
    }).catch(err => console.error(`Failed to send to ${token}:`, err))));
});
exports.onChatDeleted = (0, firestore_1.onDocumentDeleted)({ document: 'families/{familyId}/chats/{chatId}', region: 'europe-west2' }, async (event) => {
    const { familyId, chatId } = event.params;
    const messagesRef = admin.firestore()
        .collection('families').doc(familyId)
        .collection('chats').doc(chatId)
        .collection('messages');
    const snap = await messagesRef.get();
    if (snap.empty) {
        return;
    }
    const BATCH_SIZE = 500;
    const chunks = [];
    for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
        chunks.push(snap.docs.slice(i, i + BATCH_SIZE));
    }
    await Promise.all(chunks.map(chunk => {
        const batch = admin.firestore().batch();
        chunk.forEach(doc => batch.delete(doc.ref));
        return batch.commit();
    }));
});
//# sourceMappingURL=index.js.map