'use client';

import { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import MessageThread from '@/components/Message/MessageThread';
import Button from '@/components/common/Button';
import styles from './page.module.css';

export default function MessagePage({ params }: { params: { userId: string } }) {
    const { user, signInWithGoogle } = useAuth();
    const [otherUser, setOtherUser] = useState<any>(null);

    useEffect(() => {
        const loadUser = async () => {
            const userRef = ref(database, `users/${params.userId}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                setOtherUser(snapshot.val());
            }
        };

        if (params.userId) {
            loadUser();
        }
    }, [params.userId]);

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

    if (!otherUser) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>読み込み中...</p>
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
