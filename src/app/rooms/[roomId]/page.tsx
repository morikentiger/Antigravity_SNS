'use client';

import { useAuth } from '@/components/AuthContext';
import RoomView from '@/components/VoiceRoom/RoomView';
import Button from '@/components/common/Button';
import styles from './page.module.css';

export default function RoomPage({ params }: { params: { roomId: string } }) {
    const { user, signInWithGoogle } = useAuth();

    if (!user) {
        return (
            <div className={styles.unauthenticated}>
                <h2>音声ルームを利用するにはログインが必要です</h2>
                <Button onClick={signInWithGoogle} variant="primary" size="lg">
                    Googleでログイン
                </Button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <RoomView roomId={params.roomId} />
        </div>
    );
}
