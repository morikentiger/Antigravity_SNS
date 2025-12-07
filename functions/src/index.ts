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

    // Check if user has notifications enabled
    const notifSettingsSnapshot = await admin.database()
      .ref(`users/${receiverId}/notificationSettings/messages`).once("value");
    const messagesEnabled = notifSettingsSnapshot.val() !== false;

    if (!messagesEnabled) {
      console.log("User has disabled message notifications");
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

// Cloud Function to send notifications when someone replies to a thread
export const sendThreadReplyNotification = onValueCreated(
  "/threads/{threadId}/replies/{replyId}",
  async (event) => {
    const reply = event.data.val();
    const threadId = event.params.threadId;

    // Get the thread data
    const threadSnapshot = await admin.database()
      .ref(`threads/${threadId}`).once("value");
    const thread = threadSnapshot.val();

    if (!thread) {
      console.log("Thread not found");
      return null;
    }

    // Collect users to notify: thread creator + all participants
    const usersToNotify = new Set<string>();

    // Add thread creator
    if (thread.userId && thread.userId !== reply.userId) {
      usersToNotify.add(thread.userId);
    }

    // Add all users who have replied to this thread
    if (thread.replies) {
      Object.values(thread.replies).forEach((r: any) => {
        if (r.userId && r.userId !== reply.userId) {
          usersToNotify.add(r.userId);
        }
      });
    }

    // Send notifications to all users
    const notifications: Promise<any>[] = [];

    for (const userId of usersToNotify) {
      // Check if user has thread notifications enabled
      const notifSettingsSnapshot = await admin.database()
        .ref(`users/${userId}/notificationSettings/threads`).once("value");
      const threadsEnabled = notifSettingsSnapshot.val() !== false;

      if (!threadsEnabled) {
        console.log(`User ${userId} has disabled thread notifications`);
        continue;
      }

      // Get user's FCM token
      const tokenSnapshot = await admin.database()
        .ref(`users/${userId}/fcmToken`).once("value");
      const fcmToken = tokenSnapshot.val();

      if (!fcmToken) {
        console.log(`No FCM token found for user ${userId}`);
        continue;
      }

      // Send notification
      notifications.push(
        admin.messaging().send({
          token: fcmToken,
          notification: {
            title: `${reply.userName}さんが返信しました`,
            body: thread.title ?
              `「${thread.title}」: ${reply.content.substring(0, 100)
              }${reply.content.length > 100 ? "..." : ""}` :
              reply.content.substring(0, 100) +
              (reply.content.length > 100 ? "..." : ""),
          },
          data: {
            type: "thread_reply",
            url: `/threads/${threadId}`,
            threadId: threadId,
            replyId: event.params.replyId,
            senderId: reply.userId,
          },
          webpush: {
            fcmOptions: {
              link: `/threads/${threadId}`,
            },
          },
        }).catch((error) => {
          console.error(`Error sending notification to ${userId}:`, error);
        })
      );
    }

    try {
      await Promise.all(notifications);
      console.log(`Sent ${notifications.length} thread reply notifications`);
      return null;
    } catch (error) {
      console.error("Error sending thread reply notifications:", error);
      return null;
    }
  }
);
