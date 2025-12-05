'use client';

import { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { useSearchParams, useRouter } from 'next/navigation';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import MessageThread from '@/components/Message/MessageThread';
import Button from '@/components/common/Button';
import styles from './page.module.css';

interface OtherUser {
    displayName: string;
    photoURL: string;
}

export default function MessagePage({ params }: { params: { userId: string } }) {
    const { user, signInWithGoogle } = useAuth();
    const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const loadUser = async () => {
            setLoading(true);
            setNotFound(false);

            // First try to get from URL params (passed from UserProfilePopup)
            const nameFromParams = searchParams.get('name');
            const avatarFromParams = searchParams.get('avatar');

            if (nameFromParams) {
                setOtherUser({
                    displayName: nameFromParams,
                    photoURL: avatarFromParams || '',
                });
                setLoading(false);
                return;
            }

            // Fall back to database lookup
            try {
                const userRef = ref(database, `users/${params.userId}`);
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    setOtherUser(snapshot.val());
                } else {
                    // Try to find user info from threads
                    const threadsRef = ref(database, 'threads');
                    const threadsSnapshot = await get(threadsRef);
                    if (threadsSnapshot.exists()) {
                        const threads = threadsSnapshot.val();
                        for (const threadId in threads) {
                            const thread = threads[threadId];
                            if (thread.userId === params.userId) {
                                setOtherUser({
                                    displayName: thread.userName || 'Unknown User',
                                    photoURL: thread.userAvatar || '',
                                });
                                setLoading(false);
                                return;
                            }
                            // Check replies too
                            if (thread.replies) {
                                for (const replyId in thread.replies) {
                                    const reply = thread.replies[replyId];
                                    if (reply.userId === params.userId) {
                                        setOtherUser({
                                            displayName: reply.userName || 'Unknown User',
                                            photoURL: reply.userAvatar || '',
                                        });
                                        setLoading(false);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                    setNotFound(true);
                }
            } catch (error) {
                console.error('Error loading user:', error);
                setNotFound(true);
            }
            setLoading(false);
        };

        if (params.userId) {
            loadUser();
        }
    }, [params.userId, searchParams]);

    if (!user) {
        return (
            <div className={styles.unauthenticated}>
                <h2>メッセージを利用するにはログインが必要です</h2>
                <Button onClick={signInWithGoogle} variant="primary" size="lg">
                    Googleでログイン
                </Button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>読み込み中...</p>
            </div>
        );
    }

    if (notFound || !otherUser) {
        return (
            <div className={styles.notFound}>
                <h2>ユーザーが見つかりません</h2>
                <p>このユーザーは存在しないか、削除されました。</p>
                <Button onClick={() => router.push('/messages')} variant="primary">
                    メッセージ一覧に戻る
                </Button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <MessageThread
                otherUserId={params.userId}
                otherUserName={otherUser.displayName || 'Unknown User'}
                otherUserAvatar={otherUser.photoURL || ''}
            />
        </div>
    );
}
