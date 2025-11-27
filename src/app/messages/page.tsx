'use client';

import { useAuth } from '@/components/AuthContext';
import ConversationList from '@/components/Message/ConversationList';
import Button from '@/components/common/Button';
import styles from './page.module.css';

export default function MessagesPage() {
    const { user, signInWithGoogle } = useAuth();

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

    return (
        <div className={styles.container}>
            <ConversationList />
        </div>
    );
}
