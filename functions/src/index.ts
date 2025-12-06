/**
 * Cloud Functions for Firebase - Message Notifications
 */

import {setGlobalOptions} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {onValueCreated} from "firebase-functions/v2/database";

admin.initializeApp();

// For cost control
setGlobalOptions({maxInstances: 10});

// Cloud Function to send notifications when a new message is received
export const sendMessageNotification = onValueCreated(
  "/conversations/{conversationId}/messages/{messageId}",
  async (event) => {
    const message = event.data.val();
    const conversationId = event.params.conversationId;

    // Get receiver ID from conversation ID (format: userId1_userId2)
    const userIds = conversationId.split("_");
    const receiverId = userIds.find((id: string) => id !== message.senderId);

    if (!receiverId) {
      console.log("No receiver found");
      return null;
    }

    // Get receiver's FCM token
    const receiverSnapshot = await admin.database()
      .ref(`users/${receiverId}/fcmToken`).once("value");
    const fcmToken = receiverSnapshot.val();

    if (!fcmToken) {
      console.log("No FCM token found for receiver");
      return null;
    }

    // Send notification
    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title: message.senderName,
          body: message.content.length > 100 ?
            message.content.substring(0, 100) + "..." :
            message.content,
        },
        data: {
          type: "message",
          url: `/messages/${message.senderId}`,
          senderId: message.senderId,
          conversationId: conversationId,
        },
        webpush: {
          fcmOptions: {
            link: `/messages/${message.senderId}`,
          },
        },
      });
      console.log("Notification sent successfully");
      return null;
    } catch (error) {
      console.error("Error sending notification:", error);
      return null;
    }
  }
);
