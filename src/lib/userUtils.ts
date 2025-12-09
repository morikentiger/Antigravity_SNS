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
