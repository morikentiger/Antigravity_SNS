import { ref, get, update } from 'firebase/database';
import { database } from '@/lib/firebase';

/**
 * Updates the user's profile image and display name across all their threads and replies.
 * This is an expensive operation that iterates through all threads, so use it judiciously.
 *
 * @param userId The ID of the user whose profile is being updated
 * @param newPhotoURL The new photo URL
 * @param newDisplayName The new display name (optional)
 */
export async function updateUserProfileImages(
    userId: string,
    newPhotoURL: string,
    newDisplayName?: string
): Promise<void> {
    try {
        const threadsRef = ref(database, 'threads');
        const snapshot = await get(threadsRef);

        if (!snapshot.exists()) {
            return;
        }

        const data = snapshot.val();
        const updates: { [key: string]: any } = {};

        // Iterate through all threads
        Object.keys(data).forEach((threadId) => {
            const thread = data[threadId];

            // Update thread author info if it matches
            if (thread.userId === userId) {
                updates[`threads/${threadId}/userAvatar`] = newPhotoURL;
                if (newDisplayName) {
                    updates[`threads/${threadId}/userName`] = newDisplayName;
                }
            }

            // Update replies within the thread
            if (thread.replies) {
                Object.keys(thread.replies).forEach((replyId) => {
                    const reply = thread.replies[replyId];
                    // Skip YUi replies - they should keep their YUi avatar
                    if (reply.authorType === 'yui') {
                        return;
                    }
                    if (reply.userId === userId) {
                        updates[`threads/${threadId}/replies/${replyId}/userAvatar`] = newPhotoURL;
                        if (newDisplayName) {
                            updates[`threads/${threadId}/replies/${replyId}/userName`] = newDisplayName;
                        }
                    }
                });
            }
        });

        // Perform atomic update if there are changes
        if (Object.keys(updates).length > 0) {
            await update(ref(database), updates);
            console.log(`Updated profile for ${Object.keys(updates).length} paths.`);
        }
    } catch (error) {
        console.error('Error updating user profile images:', error);
        throw error; // Re-throw so the caller knows it failed
    }
}

/**
 * Updates YUi profile (name and avatar) across all YUi replies by the user.
 * Only updates replies where authorType is 'yui' and masterUserId matches.
 *
 * @param masterUserId The ID of the user who owns the YUi
 * @param newYuiAvatar The new YUi avatar URL
 * @param newYuiName The new YUi name
 * @param userName The user's display name (for constructing YUi display name)
 */
export async function updateYuiProfileImages(
    masterUserId: string,
    newYuiAvatar: string,
    newYuiName: string,
    userName: string
): Promise<void> {
    try {
        const threadsRef = ref(database, 'threads');
        const snapshot = await get(threadsRef);

        if (!snapshot.exists()) {
            return;
        }

        const data = snapshot.val();
        const updates: { [key: string]: any } = {};
        const displayName = `${newYuiName}（${userName}のYUi）`;

        // Iterate through all threads
        Object.keys(data).forEach((threadId) => {
            const thread = data[threadId];

            // Update YUi replies within the thread
            if (thread.replies) {
                Object.keys(thread.replies).forEach((replyId) => {
                    const reply = thread.replies[replyId];
                    // Only update YUi replies that belong to this user
                    if (reply.authorType === 'yui' && reply.masterUserId === masterUserId) {
                        updates[`threads/${threadId}/replies/${replyId}/userAvatar`] = newYuiAvatar || '/yui-avatar.png';
                        updates[`threads/${threadId}/replies/${replyId}/userName`] = displayName;
                    }
                });
            }
        });

        // Perform atomic update if there are changes
        if (Object.keys(updates).length > 0) {
            await update(ref(database), updates);
            console.log(`Updated YUi profile for ${Object.keys(updates).length} paths.`);
        }
    } catch (error) {
        console.error('Error updating YUi profile images:', error);
        throw error;
    }
}
